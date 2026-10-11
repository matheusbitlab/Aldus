import { LibraryBook } from '@/src/domain/entities/LibraryBook';
import { BookOrganization } from '@/src/domain/types/libraryOrganization';
import { PdfReaderSettings } from '@/src/domain/types/pdfReader';
import { findBundledAsset } from './BundledBookIdentity';

export function bookSyncPayload(book: LibraryBook) {
  const asset = book.bundledAssetId ? findBundledAsset(book.bundledAssetId) : undefined;
  return { title: book.title, author: book.author, fileName: book.fileName,
    format: book.mimeType === 'application/pdf' ? 'pdf' : 'epub', fileSize: book.fileSize,
    fileHash: book.fileHash, remotePath: book.remotePath ?? null,
    bundledAssetId: asset?.hash === book.fileHash ? asset.id : null,
    totalChapters: book.totalChapters, totalWords: book.totalWords, addedDate: book.addedDate };
}
export function organizationSyncPayload(record: BookOrganization) {
  const { revision: _revision, updatedAt: _date, coverImagePath: _localCover, ...data } = record;
  return data;
}
export function pdfPositionPayload(settings: PdfReaderSettings) {
  return { mode: settings.mode, originalProgress: settings.originalProgress, reflowProgress: settings.reflowProgress };
}
export function progressSyncPayload(progress: Record<string, any>) { const { updatedAt: _clock, ...position } = progress; return position; }

export const libraryMutationEvents = new class {
  private listeners = new Set<() => void>();
  error: string | null = null;
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  notify() { for (const listener of this.listeners) listener(); }
  failedJournal() { this.error = 'Livro salvo localmente. A fila de sincronização precisa ser recuperada.'; this.notify(); }
};
