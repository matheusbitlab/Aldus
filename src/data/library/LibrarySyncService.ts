import { QuotaSnapshot, isQuotaError, quotaSignature } from '@/src/domain/saas/quota';
import { newLibraryId } from '@/src/domain/entities/libraryId';
import { LibraryAccountScope, libraryAccountScope } from './LibraryAccountScope';
import { equalSyncPayload, LibraryEntityKind, LibraryRemoteAdapter, LibrarySyncEntry, LibrarySyncPersistence, LibrarySyncState, RemoteLibraryRow, syncKey, validateRemoteRow } from '@/src/domain/types/librarySync';

export interface LibrarySyncStatus { running: boolean; pending: number; conflicts: number; lastSync: number | null; error: string | null; }
export class LibrarySyncService {
  quota: QuotaSnapshot | null = null;
  private quotaKey = 'unavailable';
  private active: { owner: string; controller: AbortController; promise: Promise<void> } | null = null;
  private listeners = new Set<() => void>();
  private localQueue: Promise<unknown> = Promise.resolve();
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const job=this.localQueue.catch(()=>undefined).then(operation);this.localQueue=job;return job;
  }
  status: LibrarySyncStatus = { running: false, pending: 0, conflicts: 0, lastSync: null, error: null };
  constructor(private readonly persistence: LibrarySyncPersistence, private remote: LibraryRemoteAdapter,
    private applyLocal: (owner: string, entry: LibrarySyncEntry) => Promise<void>, private scope: LibraryAccountScope = libraryAccountScope) {
    scope.subscribe(() => { this.active?.controller.abort(); this.quota=null; this.quotaKey='unavailable'; this.status = { running: false, pending: 0, conflicts: 0, lastSync: null, error: null }; this.emit(); });
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  async snapshot() { const run=this.scope.capture();if(!run.userId)return null;const state=await this.persistence.read(run.userId);run.check();return state; }
  private emit() { for (const listener of this.listeners) listener(); }
  async refreshStatus() {
    const run = this.scope.capture();
    if (!run.userId) return;
    const state = await this.persistence.read(run.userId); run.check();
    this.status = { ...this.status, pending: Object.values(state.entries).filter(e => e.dirty).length,
      conflicts: Object.values(state.entries).filter(e => e.conflict).length, lastSync: state.lastSync };
    this.emit();
  }
  /** Write ahead of local mutation. Unfinished writes replay locally before any remote push. */
  async change(kind: LibraryEntityKind, id: string, bookId: string, payload: Record<string, any>, deleted: boolean, write: () => Promise<void>) {
    const run=this.scope.capture();
    return this.exclusive(()=>{run.check();return this.changeNow(kind,id,bookId,payload,deleted,write);});
  }
  private async changeNow(kind: LibraryEntityKind, id: string, bookId: string, payload: Record<string, any>, deleted: boolean, write: () => Promise<void>) {
    const run = this.scope.capture(); if (!run.userId) throw new Error('Entre na sua conta.');
    const owner = run.userId, key = syncKey(kind,id), operationId = newLibraryId();
    let unchanged = false;
    let prior: LibrarySyncEntry | undefined;
    await this.persistence.mutate(owner, state => {
      const old = state.entries[key];
      prior=old ? JSON.parse(JSON.stringify(old)) : undefined;
      if (old?.ready && !old.conflict && old.deleted === deleted && equalSyncPayload(old.payload,payload)) { unchanged = true; return; }
      if (old?.shadow?.deleted_at) throw new Error('Item removido da biblioteca da conta. Importe novamente para criar outra identidade.');
      state.entries[key] = { key,kind,id,bookId,payload,deleted,dirty:true,ready:false,operationId,baseRevision:old?.shadow?.revision??0,shadow:old?.shadow };
    }); run.check();
    try { await write(); }
    catch(error) {
      if((error as {code?:string})?.code==='LOCAL_REVISION_CONFLICT')await this.persistence.mutate(owner,state=>{
        if(state.entries[key]?.operationId===operationId) { if(prior)state.entries[key]=prior;else delete state.entries[key]; }
      });
      throw error;
    }
    run.check();
    if (!unchanged) await this.persistence.mutate(owner, state => { if (state.entries[key]?.operationId === operationId) state.entries[key].ready = true; });
    await this.refreshStatus();
  }
  async remember(kind: LibraryEntityKind, id: string, bookId: string, payload: Record<string, any>, deleted: boolean) {
    const run=this.scope.capture(); if(!run.userId) return;
    const previous=(await this.persistence.read(run.userId)).entries[syncKey(kind,id)]; run.check();
    if(previous && previous.deleted===deleted && equalSyncPayload(previous.payload,payload)) return;
    if(previous?.shadow?.deleted_at || previous?.conflict) return;
    await this.change(kind,id,bookId,payload,deleted,async()=>undefined);
  }
  async seed(kind: LibraryEntityKind, id: string, bookId: string, read: () => Promise<Record<string, any>>, deleted = false, force = false) {
    const run=this.scope.capture();if(!run.userId)return;
    return this.exclusive(async()=>{
      run.check();const old=(await this.persistence.read(run.userId!)).entries[syncKey(kind,id)];run.check();
      if(old && ((!force && old.dirty) || old.conflict || old.deleted || old.shadow?.deleted_at))return;
      const payload=await read();run.check();await this.changeNow(kind,id,bookId,payload,deleted,async()=>undefined);
    });
  }
  async batch<T>(kind: LibraryEntityKind, prepare: () => Promise<Array<{id:string;bookId:string;payload:Record<string,any>}>>, write: () => Promise<T>): Promise<T> {
    const run=this.scope.capture();if(!run.userId)throw new Error('Entre na sua conta.');
    return this.exclusive(async()=>{
      run.check();const entries=await prepare();run.check();const operations=new Map<string,string>();
      await this.persistence.mutate(run.userId!,state=>{
        for(const item of entries) {
          const key=syncKey(kind,item.id),old=state.entries[key];
          if(old?.shadow?.deleted_at)throw new Error('Item removido da biblioteca.');
          if(old?.ready&&!old.conflict&&!old.deleted&&equalSyncPayload(old.payload,item.payload))continue;
          const operationId=newLibraryId();operations.set(key,operationId);
          state.entries[key]={key,kind,id:item.id,bookId:item.bookId,payload:item.payload,deleted:false,dirty:true,ready:false,operationId,baseRevision:old?.shadow?.revision??0,shadow:old?.shadow};
        }
      });run.check();const result=await write();run.check();
      await this.persistence.mutate(run.userId!,state=>{for(const [key,operationId] of operations)if(state.entries[key]?.operationId===operationId)state.entries[key].ready=true;});
      await this.refreshStatus();return result;
    });
  }
  async quotaBlock(key: string, snapshot?: LibrarySyncState | null): Promise<string | null> {
    return this.quotaBlockMessage(key,snapshot===undefined?await this.snapshot():snapshot);
  }
  quotaBlockMessage(key: string, state: LibrarySyncState | null): string | null {
    const block=state?.quotaBlocks?.[key];
    return block && (this.quotaKey==='unavailable' || block.signature===this.quotaKey) ? block.message : null;
  }
  async blockQuota(key: string, message: string) {
    const run=this.scope.capture();if(!run.userId)return;
    await this.persistence.mutate(run.userId,s=>{(s.quotaBlocks??={})[key]={signature:this.quotaKey,message};});run.check();
  }
  async retryQuota() {
    const run=this.scope.capture();if(!run.userId)return;
    await this.persistence.mutate(run.userId,s=>{s.quotaBlocks={};});run.check();
  }
  sync(): Promise<void> {
    const owner = this.scope.userId;
    if (!owner) return Promise.resolve();
    if (this.active?.owner === owner && !this.active.controller.signal.aborted) return this.active.promise;
    this.active?.controller.abort();
    const controller = new AbortController();
    const promise = this.run(owner,controller.signal);
    this.active = { owner,controller,promise };
    void promise.finally(() => { if (this.active?.promise===promise) this.active=null; }).catch(()=>undefined);
    return promise;
  }
  cancel() {
    this.active?.controller.abort();
    this.status = { ...this.status, running: false };
    this.emit();
  }
  private async run(owner: string, signal: AbortSignal) {
    const run = this.scope.capture();
    const check=()=>{run.check();if(signal.aborted)throw new Error('Sincronização cancelada.');};
    this.status={...this.status,running:true,error:null};this.emit();
    try {
      const unfinished=Object.values((await this.persistence.read(owner)).entries).filter(e=>e.dirty&&!e.ready);
      for(const entry of unfinished) { await this.exclusive(async()=>{check();const current=(await this.persistence.read(owner)).entries[entry.key];if(current?.operationId!==entry.operationId||current.ready)return;await this.applyLocal(owner,entry); check(); await this.persistence.mutate(owner,s=>{if(s.entries[entry.key]?.operationId===entry.operationId)s.entries[entry.key].ready=true;});}); }
      check();
      if(this.remote.quota){
        try {const quota=await this.remote.quota(owner,signal);check();this.quota=quota;this.quotaKey=quotaSignature(quota);}
        catch(error){
          check();this.quota=null;this.quotaKey='unavailable';
          // Progressive backend rollout: existing metadata still uses the established RPC.
          // File uploads independently require reservations and fail closed.
          if((error as {code?:string})?.code!=='contract')throw error;
          this.status={...this.status,error:'Medição de cotas ainda indisponível no servidor. Novos arquivos aguardam a implantação; dados existentes continuam sincronizando.'};
        }
      }
      // Pull first to learn parent tombstones; dirty edits are preserved until CAS resolves them.
      const initialRows=await this.remote.pull(owner,signal);check();
      for(const row of initialRows.sort((a,b)=>Number(b.kind==='book')-Number(a.kind==='book'))){validateRemoteRow(row,owner);await this.receive(owner,row);check();}
      const pending=Object.values((await this.persistence.read(owner)).entries).filter(e=>e.dirty&&e.ready).sort((a,b)=>Number(b.kind==='book')-Number(a.kind==='book'));
      for(const snapshot of pending) {
        check(); const currentState=await this.persistence.read(owner),current=currentState.entries[snapshot.key];check();
        if(!current?.dirty||!current.ready)continue;
        if(!current.deleted && await this.quotaBlock(current.key,currentState))continue;
        if(current.kind!=='book'){
          const parent=currentState.entries[syncKey('book',current.bookId)];
          if(parent?.dirty && !parent.shadow && await this.quotaBlock(parent.key,currentState))continue;
        }
        try {
          const answer=await this.remote.apply(owner,current,signal);check();validateRemoteRow(answer.row,owner);
          await this.receive(owner,answer.row,current.operationId,answer.accepted);check();
        } catch(error) {
          check();if(!isQuotaError(error))throw error;
          await this.blockQuota(current.key,error.message);
          this.status={...this.status,error:error.message};
        }
      }
      const rows=await this.remote.pull(owner,signal);check();
      for(const row of rows.sort((a,b)=>Number(b.kind==='book')-Number(a.kind==='book'))) { validateRemoteRow(row,owner); await this.receive(owner,row);check(); }
      await this.persistence.mutate(owner,s=>{s.lastSync=Date.now();});check();
      const blocks=(await this.persistence.read(owner)).quotaBlocks??{};check();
      const blocked=Object.values(blocks).find(b=>this.quotaKey==='unavailable'||b.signature===this.quotaKey);
      if(blocked)this.status={...this.status,error:blocked.message};
    } catch(error) {
      if(this.scope.userId===owner && !signal.aborted) this.status={...this.status,error:error instanceof Error?error.message:'Não foi possível sincronizar.'};
      throw error;
    } finally {
      if(this.scope.userId===owner && !signal.aborted){this.status={...this.status,running:false};await this.refreshStatus();}
    }
  }
  private async receive(owner: string, row: RemoteLibraryRow, operationId?: string, accepted?: boolean) {
    const run=this.scope.capture();
    return this.exclusive(()=>{run.check();return this.receiveNow(owner,row,operationId,accepted);});
  }
  private async receiveNow(owner: string, row: RemoteLibraryRow, operationId?: string, accepted?: boolean) {
    const run=this.scope.capture();run.check();if(run.userId!==owner)throw new Error('Conta mudou.');
    const key=syncKey(row.kind,row.id);let apply:LibrarySyncEntry|undefined;
    await this.persistence.mutate(owner,state=>{
      const old=state.entries[key];
      if(old?.shadow && old.shadow.revision>row.revision)return;
      if(old?.dirty && operationId && old.operationId!==operationId) { old.shadow=row;old.baseRevision=row.revision;return; }
      if(old?.dirty && !operationId && !row.deleted_at)return;
      const conflict=accepted===false && old?.dirty ? {payload:old.payload,deleted:old.deleted}:old?.conflict;
      const next:LibrarySyncEntry={key,kind:row.kind,id:row.id,bookId:row.book_id,payload:row.payload,deleted:!!row.deleted_at,dirty:false,ready:true,operationId:newLibraryId(),baseRevision:row.revision,shadow:row,...(conflict?{conflict}:{})};
      state.entries[key]=next;apply=next;
      if(state.quotaBlocks){
        delete state.quotaBlocks[key];
        if(row.kind==='book' && (row.deleted_at || row.payload.remotePath))delete state.quotaBlocks['file:'+row.id];
      }
      if(row.kind==='book'&&row.deleted_at)for(const e of Object.values(state.entries))if(e.bookId===row.id&&e.kind!=='book'){if(e.dirty)e.conflict={payload:e.payload,deleted:e.deleted};e.dirty=false;}
    });run.check();if(apply)await this.applyLocal(owner,apply);run.check();
  }
  async resolveConflict(key: string, choice: 'local'|'remote') {
    const run=this.scope.capture();if(!run.userId)return;
    const state=await this.persistence.read(run.userId),entry=state.entries[key];run.check();if(!entry?.conflict)return;
    if(choice==='local' && (entry.shadow?.deleted_at || state.entries[syncKey('book',entry.bookId)]?.shadow?.deleted_at))throw new Error('Livro removido da conta. Importe novamente para criar uma nova identidade.');
    if(choice==='local') { const local=entry.conflict;await this.change(entry.kind,entry.id,entry.bookId,local.payload,local.deleted,()=>this.applyLocal(run.userId!,{...entry,payload:local.payload,deleted:local.deleted})); }
    else await this.persistence.mutate(run.userId,s=>{delete s.entries[key].conflict;});
    await this.refreshStatus();
  }
}
