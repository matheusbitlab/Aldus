import { LibraryBook } from '@/src/domain/entities/LibraryBook';
import { ReadingProgressRepository } from '@/src/domain/repositories/ReadingProgressRepository';
import { BookmarkRepository } from '@/src/domain/repositories/BookmarkRepository';
import { HighlightRepository } from '@/src/domain/repositories/HighlightRepository';
import { LibraryOrganizationRepository, parseOrganizationRecord } from '@/src/domain/types/libraryOrganization';
import { PdfReaderSettingsStore } from '@/src/data/local/PdfReaderSettingsStore';
import { defaultPdfReaderSettings } from '@/src/domain/types/pdfReader';
import { LibrarySyncEntry } from '@/src/domain/types/librarySync';
import { LocalBookStorage } from './AccountBookRepository';
import { LibraryAccountScope, libraryAccountScope } from './LibraryAccountScope';
import { findBundledAsset } from './BundledBookIdentity';
import { bookSyncPayload, organizationSyncPayload, pdfPositionPayload, progressSyncPayload } from './LibrarySyncPayload';
import { LibrarySyncService } from './LibrarySyncService';
import { privateBookPath } from './BookFileIntegrity';

/** Remote payloads cannot choose device paths, owners, child IDs, or local appearance. */
export class LibraryLocalReplica {
  constructor(private books: LocalBookStorage, private progress: ReadingProgressRepository,
    private bookmarks: BookmarkRepository, private highlights: HighlightRepository,
    private organization: LibraryOrganizationRepository, private pdf: PdfReaderSettingsStore,
    private scope: LibraryAccountScope = libraryAccountScope) {}
  async apply(owner: string, entry: LibrarySyncEntry) {
    const run = this.scope.capture(); run.check(); if (owner !== run.userId) throw new Error('Conta incompatível.');
    const previous = (await this.books.listAll()).find(book => book.id === entry.bookId); run.check();
    if (previous && previous.ownerUserId !== owner) throw new Error('Identidade remota colide com dados de outra conta. Os dados locais foram preservados.');
    const p = entry.payload;
    if (entry.kind === 'book') {
      if (entry.id !== entry.bookId || !['epub','pdf'].includes(p.format)) throw new Error('Metadados de livro inválidos.');
      const text = (name: string, fallback = '') => { if (p[name] === undefined) return fallback;
        if (typeof p[name] !== 'string' || p[name].length > 2000) throw new Error('Metadados de livro inválidos.'); return p[name]; };
      const title = text('title'); if (!title.trim()) throw new Error('Título remoto inválido.');
      const size = p.fileSize ?? 0;
      if (!Number.isSafeInteger(size) || size < 0 || size > 512 * 1024 * 1024) throw new Error('Tamanho remoto inválido.');
      if (p.fileHash != null && !/^[a-f0-9]{64}$/.test(p.fileHash)) throw new Error('Hash remoto inválido.');
      if (p.remotePath != null && p.remotePath !== privateBookPath(owner, entry.id, p.fileHash, p.format)) throw new Error('Caminho remoto inválido.');
      const asset = p.bundledAssetId ? findBundledAsset(p.bundledAssetId) : undefined;
      const bundled = asset && asset.hash === p.fileHash && asset.size === size && asset.format === p.format ? asset : undefined;
      let filePath = previous?.filePath ?? '';
      // A local copy is valid only for the same immutable content. Preserve chapters/cache
      // for identical copies; mismatched bundled content stays unavailable for download.
      if (previous?.fileHash && p.fileHash && previous.fileHash !== p.fileHash) filePath = '';
      if (!filePath && bundled) filePath = `bundled-${p.format}://${entry.id}`;
      const now = Date.now();
      const book: LibraryBook = { ...previous, id: entry.id, ownerUserId: owner, importComplete: true,
        title, author: text('author', 'Autor desconhecido'), fileName: text('fileName', `${entry.id}.${p.format}`),
        mimeType: p.format === 'pdf' ? 'application/pdf' : 'application/epub+zip', filePath, fileHash: p.fileHash ?? null,
        fileSize: size, remotePath: p.remotePath ?? null, bundledAssetId: bundled?.id,
        coverImagePath: filePath ? previous?.coverImagePath ?? null : null,
        totalChapters: Number.isSafeInteger(p.totalChapters) && p.totalChapters >= 0 ? p.totalChapters : previous?.totalChapters ?? 0,
        totalWords: Number.isSafeInteger(p.totalWords) && p.totalWords >= 0 ? p.totalWords : previous?.totalWords ?? 0,
        addedDate: Number.isSafeInteger(p.addedDate) && p.addedDate >= 0 ? p.addedDate : previous?.addedDate ?? now,
        lastOpenedDate: previous?.lastOpenedDate ?? null, isDeleted: entry.deleted, progress: previous?.progress ?? 0 };
      await this.books.save(book); run.check(); return;
    }
    // Never restore a child after learning its parent tombstone.
    if (!previous || previous.isDeleted || previous.importComplete === false) return;
    const text = (key: string, nullable = false) => { const value=p[key]; if(nullable && value==null)return null;
      if(typeof value !== 'string' || value.length>200000)throw new Error('Dados de leitura inválidos.');return value; };
    const fraction = (value: unknown, nullable = false) => { if(nullable && value===null)return null;
      if(typeof value !== 'number'||!Number.isFinite(value)||value<0||value>1)throw new Error('Posição de leitura inválida.');return value; };
    if (entry.kind === 'progress') {
      if(entry.deleted)return;
      if(!Number.isSafeInteger(p.pageNumber)||p.pageNumber<0)throw new Error('Página inválida.');
      await this.progress.save({ id: `progress-${entry.bookId}`, bookId: entry.bookId, currentChapterId: text('currentChapterId',true),
        cfiPosition: text('cfiPosition',true), percentage: fraction(p.percentage)!, pageNumber: p.pageNumber,
        updatedAt: Date.parse(entry.shadow?.updated_at ?? '') || Date.now() });
    } else if (entry.kind === 'bookmark' || entry.kind === 'highlight') {
      const store = entry.kind === 'bookmark' ? this.bookmarks : this.highlights;
      const existing = await store.findById(entry.id); run.check();
      if (existing && existing.bookId !== entry.bookId) throw new Error('Identidade de anotação colide com outro livro.');
      if (entry.deleted) await store.remove(entry.id);
      else {
        if(!Number.isSafeInteger(p.createdAt)||p.createdAt<0)throw new Error('Anotação inválida.');
        const common = { id: entry.id, bookId: entry.bookId, chapterId: text('chapterId')!, createdAt: p.createdAt };
        if(entry.kind==='bookmark') await this.bookmarks.save({...common,cfiPosition:text('cfiPosition',true),textPreview:text('textPreview')!,note:text('note',true)});
        else { if(!['yellow','green','blue','pink','purple'].includes(p.colorLabel))throw new Error('Cor de grifo inválida.');
          await this.highlights.save({...common,startCfi:text('startCfi')!,endCfi:text('endCfi')!,highlightedText:text('highlightedText')!,colorLabel:p.colorLabel}); }
      }
    } else if (entry.kind === 'organization') {
      if(entry.deleted)return;
      const current=(await this.organization.list())[entry.bookId];run.check();
      const record=parseOrganizationRecord({...p,bookId:entry.bookId,revision:1,updatedAt:Date.now(),coverImagePath:current?.coverImagePath});
      await this.organization.merge({[entry.bookId]:record},'use-imported');
    } else if (entry.kind === 'pdf_position') {
      if(entry.deleted)return;
      if(!['original','reflow'].includes(p.mode))throw new Error('Modo PDF inválido.');
      const current=await this.pdf.get(entry.bookId);run.check();
      await this.pdf.save(entry.bookId,{...defaultPdfReaderSettings,...current,mode:p.mode,
        originalProgress:fraction(p.originalProgress,true),reflowProgress:fraction(p.reflowProgress,true)});
    }
    run.check();
  }
  /** Recover local imports/legacy/batch restores without overwriting a journaled edit. */
  async seed(sync: LibrarySyncService) {
    const run=this.scope.capture();if(!run.userId)return;
    const books=await this.books.listAll();run.check();
    const organization=await this.organization.list();run.check();
    for(const book of books.filter(book=>book.ownerUserId===run.userId&&book.importComplete!==false)) {
      run.check();
      await sync.seed('book',book.id,book.id,()=>this.books.findById(book.id).then(current=>bookSyncPayload(current??book)),book.isDeleted,!!book.syncUnjournaled);
      if(book.syncUnjournaled) { const current=(await this.books.listAll()).find(value=>value.id===book.id);run.check();if(current)await this.books.save({...current,syncUnjournaled:false});run.check(); }
      if(book.isDeleted)continue;
      const progress=await this.progress.findByBookId(book.id);run.check();
      if(progress)await sync.seed('progress',book.id,book.id,async()=>progressSyncPayload(await this.progress.findByBookId(book.id)??progress));
      for(const item of await this.bookmarks.listByBookId(book.id)) {run.check();await sync.seed('bookmark',item.id,book.id,()=>this.bookmarks.findById(item.id).then(current=>current??item));}
      for(const item of await this.highlights.listByBookId(book.id)) {run.check();await sync.seed('highlight',item.id,book.id,()=>this.highlights.findById(item.id).then(current=>current??item));}
      if(organization[book.id])await sync.seed('organization',book.id,book.id,async()=>organizationSyncPayload((await this.organization.list())[book.id]));
      const pdf=await this.pdf.get(book.id);run.check();
      if(pdf)await sync.seed('pdf_position',book.id,book.id,async()=>pdfPositionPayload(await this.pdf.get(book.id)??pdf));
    }
  }
}
