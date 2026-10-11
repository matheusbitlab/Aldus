import { LibraryBook, StoredChapter } from '@/src/domain/entities/LibraryBook';
import { ChapterRepository } from '@/src/domain/repositories/ChapterRepository';
import { AccountBookRepository } from './AccountBookRepository';
import { LibraryAccountScope, libraryAccountScope } from './LibraryAccountScope';
import { privateBookPath } from './BookFileIntegrity';
import { throwIfAborted } from '@/src/core/utils/cancellation';
import { findBundledAsset } from './BundledBookIdentity';

export interface BookFileReference { uri: string; size: number; blob?: Blob; }
export interface BookFileDriver {
  local(book: LibraryBook): Promise<BookFileReference | null>;
  hash(file: BookFileReference, signal: AbortSignal): Promise<string>;
  upload(owner: string, path: string, file: BookFileReference, mime: string, signal: AbortSignal): Promise<'created' | 'exists'>;
  download(owner: string, path: string, signal: AbortSignal): Promise<BookFileReference>;
  validate(file: BookFileReference, book: LibraryBook, signal: AbortSignal): Promise<{ book: LibraryBook; chapters: StoredChapter[] }>;
  promote(file: BookFileReference, book: LibraryBook): Promise<string>;
  dispose(file: BookFileReference): Promise<void>;
  removeLocal(book: LibraryBook): Promise<void>;
  removeRemote(owner: string, path: string, signal: AbortSignal): Promise<void>;
  listBookObjects?(owner:string,bookId:string,signal:AbortSignal):Promise<string[]>;
}
export type BookTransferState = 'UPLOADING' | 'DOWNLOADING' | 'ERROR';
export class PrivateBookFileService {
  readonly states = new Map<string, { state: BookTransferState; error?: string }>();
  private jobs = new Map<string, { controller: AbortController; promise: Promise<LibraryBook>; generation: number }>();
  private evictions=new Map<string,number>();
  private listeners = new Set<() => void>();
  constructor(private books: AccountBookRepository, private chapters: ChapterRepository, private readonly driver: BookFileDriver,
    private scope: LibraryAccountScope = libraryAccountScope) {
    scope.subscribe(() => { this.cancel(); this.states.clear(); this.emit(); });
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { for (const listener of this.listeners) listener(); }
  cancel() { for (const job of this.jobs.values()) job.controller.abort(); }
  private job(id: string, state: BookTransferState, work: (signal: AbortSignal, check: () => void, owner: string) => Promise<LibraryBook>, external?: AbortSignal) {
    const run = this.scope.capture();
    if (!run.userId) return Promise.reject(new Error('Entre na sua conta.'));
    const previous = this.jobs.get(id);
    if (previous && previous.generation === this.scope.generation && !previous.controller.signal.aborted) return previous.promise;
    const controller = new AbortController(), abort = () => controller.abort();
    external?.addEventListener('abort', abort, { once: true }); if (external?.aborted) abort();
    const timeout = setTimeout(abort, 10 * 60 * 1000);
    const check = () => { run.check(); throwIfAborted(controller.signal); };
    this.states.set(id, { state }); this.emit();
    const promise = work(controller.signal, check, run.userId).then(book => {
      check(); this.states.delete(id); this.emit(); return book;
    }).catch(error => {
      if (run.userId === this.scope.userId && !controller.signal.aborted && this.jobs.get(id)?.promise === promise) {
        this.states.set(id, { state: 'ERROR', error: error instanceof Error ? error.message : 'Falha na transferência privada.' }); this.emit();
      }
      throw error;
    }).finally(() => {
      clearTimeout(timeout); external?.removeEventListener('abort', abort);
      if (this.jobs.get(id)?.promise === promise) { this.jobs.delete(id); if (controller.signal.aborted) this.states.delete(id); this.emit(); }
    });
    this.jobs.set(id, { controller, promise, generation: this.scope.generation }); return promise;
  }
  upload(id: string) {
    if(this.evictions.get(id)===this.scope.generation)return Promise.reject(new Error('Aguarde a remoção da cópia local.'));
    return this.job(id, 'UPLOADING', async (signal, check, owner) => {
      const book = await this.books.findById(id); check();
      if (!book || book.importComplete === false) throw new Error('A importação local precisa terminar primeiro.');
      if ((book.bundledAssetId && findBundledAsset(book.bundledAssetId)?.hash === book.fileHash) || book.remotePath) return book;
      const file = await this.driver.local(book); check(); if (!file) throw new Error('A cópia local deste livro não foi encontrada.');
      const hash = await this.driver.hash(file, signal); check();
      const asset = book.bundledAssetId ? findBundledAsset(book.bundledAssetId) : undefined;
      if (asset?.hash === hash && asset.size === file.size) {
        const verifiedAsset = { ...book, bundledAssetId: asset.id, fileHash: hash, fileSize: file.size };
        await this.books.save(verifiedAsset); check(); return verifiedAsset;
      }
      const path = privateBookPath(owner, id, hash, book.mimeType === 'application/pdf' ? 'pdf' : 'epub');
      const result = await this.driver.upload(owner, path, file, book.mimeType, signal); check();
      // A lost successful response leads to an immutable-object conflict on retry.
      if (result === 'exists') {
        const existing = await this.driver.download(owner, path, signal);
        try { await this.verify(existing, file.size, hash, signal); check(); }
        finally { await this.driver.dispose(existing); }
      }
      const current = await this.books.findById(id); check(); if (!current) {
        await this.driver.removeRemote(owner,path,signal).catch(()=>undefined);
        throw new Error('Livro removido durante o upload.');
      }
      const published = { ...current, bundledAssetId: undefined, remotePath: path, fileHash: hash, fileSize: file.size };
      await this.books.save(published); check(); return published;
    });
  }
  async ensureLocal(id: string, signal?: AbortSignal): Promise<LibraryBook> {
    if(this.evictions.get(id)===this.scope.generation)throw new Error('Aguarde a remoção da cópia local.');
    const run = this.scope.capture();
    const book = await this.books.findById(id); run.check(); throwIfAborted(signal);
    if (!book || book.importComplete===false) throw new Error('Livro não disponível ou importação incompleta nesta conta.');
    if (book.filePath.startsWith('bundled-') || (book.filePath && await this.driver.local(book))) { run.check(); return book; }
    return this.job(id, 'DOWNLOADING', async (abort, check, owner) => {
      if (!book.remotePath || !book.fileHash) throw new Error('O arquivo ainda não terminou de sincronizar no outro dispositivo.');
      const expected = privateBookPath(owner, id, book.fileHash, book.mimeType === 'application/pdf' ? 'pdf' : 'epub');
      if (book.remotePath !== expected) throw new Error('Referência do arquivo privado inválida.');
      const file = await this.driver.download(owner, expected, abort); let promoted: string | null = null, attemptedSave = false;
      try {
        await this.verify(file, book.fileSize, book.fileHash, abort); check();
        const validated = await this.driver.validate(file, book, abort); check();
        const current = await this.books.findById(id); check(); if (!current || current.remotePath !== expected) throw new Error('Livro alterado durante o download.');
        promoted = await this.driver.promote(file, book); check();
        await this.chapters.replaceForBook(id, validated.chapters); check();
        const local = { ...current, filePath: promoted, coverImagePath: validated.book.coverImagePath,
          totalChapters: validated.book.totalChapters, totalWords: validated.book.totalWords, importComplete: true };
        // All bytes and chapters are validated before publishing the local pointer.
        attemptedSave = true; await this.books.save(local); check(); return local;
      } catch (error) {
        if (promoted && !attemptedSave) await this.driver.removeLocal({ ...book, filePath: promoted }).catch(() => undefined);
        throw error;
      } finally { await this.driver.dispose(file); }
    }, signal);
  }
  private async verify(file: BookFileReference, size: number, hash: string, signal: AbortSignal) {
    if (file.size !== size) throw new Error('Arquivo incompleto: tamanho diferente do original.');
    if (await this.driver.hash(file, signal) !== hash) throw new Error('A integridade do arquivo não pôde ser confirmada.');
  }
  /** Preserve the local pointer until a remote copy was independently verified. */
  async removeDeviceCopy(id: string) {
    if(this.jobs.get(id)?.generation===this.scope.generation || this.evictions.get(id)===this.scope.generation)throw new Error('Aguarde a transferência deste livro terminar.');
    const run = this.scope.capture(); if (!run.userId) throw new Error('Entre na sua conta.');
    const generation=this.scope.generation;this.evictions.set(id,generation);
    try{await this.evictDeviceCopy(id,run);}finally{if(this.evictions.get(id)===generation)this.evictions.delete(id);}
  }
  private async evictDeviceCopy(id:string,run:ReturnType<LibraryAccountScope['capture']>){
    const book = await this.books.findById(id); run.check();
    if (!book?.remotePath || !book.fileHash || book.bundledAssetId) throw new Error('Sincronize e confirme o arquivo privado antes de remover a cópia local.');
    const controller = new AbortController(), unsubscribe = this.scope.subscribe(() => controller.abort());
    let copy: BookFileReference | undefined;
    try {
      const expected = privateBookPath(run.userId!, id, book.fileHash, book.mimeType === 'application/pdf' ? 'pdf' : 'epub');
      if (expected !== book.remotePath) throw new Error('Referência privada inválida.');
      copy = await this.driver.download(run.userId!, expected, controller.signal);
      await this.verify(copy, book.fileSize, book.fileHash, controller.signal); run.check();
      const current = await this.books.findById(id); run.check(); if (!current || current.remotePath !== expected) throw new Error('Livro alterado.');
      await this.books.save({ ...current, filePath: '', localEvictionPath: current.filePath }); run.check();
      await this.finishEviction({ ...current, localEvictionPath: current.filePath }); run.check();
    } finally { unsubscribe(); if (copy) await this.driver.dispose(copy); }
  }
  async finishEviction(book: LibraryBook) {
    const run = this.scope.capture(); if (!book.localEvictionPath) return;
    if (book.ownerUserId !== run.userId) throw new Error('Conta incompatível.');
    await this.driver.removeLocal({ ...book, filePath: book.localEvictionPath }); run.check();
    const current = await this.books.findById(book.id); run.check();
    if (current?.localEvictionPath === book.localEvictionPath) { const next = { ...current }; delete next.localEvictionPath; await this.books.save(next); }
  }
  async cleanupRemovedBook(book:LibraryBook,path?:string|null){
    const run=this.scope.capture();if(!run.userId||book.ownerUserId!==run.userId||!book.isDeleted)throw new Error('Exclusão privada inválida.');
    const controller=new AbortController(),unsubscribe=this.scope.subscribe(()=>controller.abort());
    try {
      const paths=new Set(path?[path]:[]);
      if(this.driver.listBookObjects)for(const orphan of await this.driver.listBookObjects(run.userId,book.id,controller.signal)){run.check();paths.add(orphan);}
      for(const candidate of paths){const hash=candidate.split('/').pop()?.split('.')[0];if(!hash||privateBookPath(run.userId,book.id,hash,book.mimeType==='application/pdf'?'pdf':'epub')!==candidate)throw new Error('Referência privada inválida.');await this.driver.removeRemote(run.userId,candidate,controller.signal);run.check();}
      const current=(await this.books.listOwned()).find(b=>b.id===book.id);run.check();
      if(current?.isDeleted)await this.books.save({...current,remoteCleanupDone:true});
    }finally{unsubscribe();}
  }
}
