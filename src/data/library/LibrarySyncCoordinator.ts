import { LibraryBook } from '@/src/domain/entities/LibraryBook';
import { LibrarySyncState, syncKey } from '@/src/domain/types/librarySync';
import { AccountBookRepository } from './AccountBookRepository';
import { LibraryLocalReplica } from './LibraryLocalReplica';
import { LibrarySyncService } from './LibrarySyncService';
import { PrivateBookFileService } from './PrivateBookFileService';
import { LibraryAccountScope, libraryAccountScope } from './LibraryAccountScope';
import { libraryMutationEvents } from './LibrarySyncPayload';
import { findBundledAsset } from './BundledBookIdentity';

export type LibraryAvailability = 'LOCAL' | 'SYNC_PENDING' | 'UPLOADING' | 'SYNCED' | 'CLOUD_ONLY' | 'DOWNLOADING' | 'ERROR';
export const availabilityLabels: Record<LibraryAvailability,string> = { LOCAL:'Neste dispositivo', SYNC_PENDING:'Sincronização pendente', UPLOADING:'Enviando arquivo…', SYNCED:'Sincronizado', CLOUD_ONLY:'Na nuvem · baixar ao abrir', DOWNLOADING:'Baixando arquivo…', ERROR:'Falha na sincronização' };

/** Account-scoped orchestration. UI never accesses Storage or database REST directly. */
export class LibrarySyncCoordinator {
  private enabled = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active: { generation:number; promise:Promise<void> } | null = null;
  private listeners = new Set<() => void>();
  private completedListeners = new Set<() => void>();
  private state: LibrarySyncState | null = null;
  version = 0;
  status = { running:false, pendingFiles:0, error:null as string|null };
  constructor(private books:AccountBookRepository, private replica:LibraryLocalReplica,
    readonly engine:LibrarySyncService, readonly files:PrivateBookFileService, private scope:LibraryAccountScope=libraryAccountScope) {
    engine.subscribe(()=>this.emit()); files.subscribe(()=>this.emit());
    libraryMutationEvents.subscribe(()=>{this.schedule();void this.refresh().catch(()=>undefined);});
    scope.subscribe(()=>{this.stop();this.state=null;this.status={running:false,pendingFiles:0,error:null};libraryMutationEvents.error=null;this.emit();});
  }
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  onCompleted(listener:()=>void){this.completedListeners.add(listener);return()=>{this.completedListeners.delete(listener);};}
  private emit(){this.version++;for(const listener of this.listeners)listener();}
  start(){this.enabled=true;this.schedule(0);void this.refresh().catch(()=>undefined);}
  stop(){this.enabled=false;if(this.timer)clearTimeout(this.timer);this.timer=null;this.engine.cancel();this.files.cancel();}
  schedule(delay=2500){if(!this.enabled||!this.scope.userId)return;if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=null;void this.syncNow().catch(()=>undefined);},delay);}
  private needsFile(book:LibraryBook){return !book.isDeleted && book.importComplete!==false && !book.remotePath && !!book.filePath && !(book.bundledAssetId && findBundledAsset(book.bundledAssetId)?.hash===book.fileHash);}
  async refresh(){const run=this.scope.capture();const [state,books]=await Promise.all([this.engine.snapshot(),this.books.listOwned()]);run.check();this.state=state;this.status={...this.status,pendingFiles:books.filter(book=>this.needsFile(book)||(book.isDeleted&&!book.remoteCleanupDone)).length};await this.engine.refreshStatus();run.check();this.emit();}
  availability(book:LibraryBook):LibraryAvailability {
    const transfer=this.files.states.get(book.id);if(transfer)return transfer.state;
    const entries=Object.values(this.state?.entries??{}).filter(e=>e.bookId===book.id);
    if(!book.filePath)return 'CLOUD_ONLY';
    if(book.syncUnjournaled || entries.some(e=>e.dirty||e.conflict) || this.needsFile(book))return 'SYNC_PENDING';
    return this.state?.entries[syncKey('book',book.id)]?.shadow ? 'SYNCED':'LOCAL';
  }
  syncNow():Promise<void>{
    const generation=this.scope.generation;if(this.active?.generation===generation)return this.active.promise;
    const promise=this.run();this.active={generation,promise};void promise.finally(()=>{if(this.active?.promise===promise)this.active=null;}).catch(()=>undefined);return promise;
  }
  private async run(){
    const run=this.scope.capture();if(!run.userId||!this.enabled)return;
    this.status={...this.status,running:true,error:null};this.emit();
    try {
      await this.replica.seed(this.engine);run.check();await this.engine.sync();run.check();
      const books=await this.books.listOwned();run.check();
      let fileError:string|null=null;
      for(const book of books){
        run.check();
        if(book.localEvictionPath)await this.files.finishEviction(book);
        if(this.needsFile(book))try{await this.files.upload(book.id);}catch(error){run.check();fileError=error instanceof Error?error.message:'Falha no envio do arquivo.';}
      }
      // Publish remotePath only after successful upload. Metadata never auto-downloads bytes.
      await this.engine.sync();run.check();
      const state=await this.engine.snapshot();run.check();
      for(const book of await this.books.listOwned()){
        run.check();const confirmed=state?.entries[syncKey('book',book.id)]?.shadow;
        if(book.isDeleted && !book.remoteCleanupDone && confirmed?.deleted_at) {
          try {await this.files.cleanupRemovedBook(book,confirmed.payload.remotePath??book.remotePath);}
          catch(error){run.check();fileError=error instanceof Error?error.message:'Exclusão do arquivo pendente.';}
        }
      }
      run.check();this.status={...this.status,error:fileError};libraryMutationEvents.error=null;
      for(const listener of this.completedListeners)listener();
    }catch(error){run.check();this.status={...this.status,error:error instanceof Error?error.message:'Não foi possível sincronizar.'};throw error;}
    finally {if(this.scope.generation===this.active?.generation || this.scope.userId===run.userId){try{run.check();this.status={...this.status,running:false};await this.refresh();}catch{/* revoked account */}}}
  }
  async removeDeviceCopy(id:string){
    const run=this.scope.capture();const book=await this.books.findById(id),state=await this.engine.snapshot();run.check();
    const entry=state?.entries[syncKey('book',id)],remote=entry?.shadow;
    if(!book || entry?.dirty || entry?.conflict || !remote || remote.deleted_at || remote.payload.remotePath!==book.remotePath || !book.remotePath)throw new Error('Sincronize o livro antes de remover a cópia deste dispositivo.');
    await this.files.removeDeviceCopy(id);run.check();await this.refresh();for(const listener of this.completedListeners)listener();
  }
  async conflicts(){const state=await this.engine.snapshot();return Object.values(state?.entries??{}).filter(e=>e.conflict).map(e=>({...e,parentDeleted:!!state?.entries[syncKey('book',e.bookId)]?.shadow?.deleted_at}));}
  async resolve(key:string,choice:'local'|'remote'){await this.engine.resolveConflict(key,choice);await this.refresh();for(const listener of this.completedListeners)listener();this.schedule(0);}
}
