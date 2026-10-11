import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { ReadingProgress, ReadingProgressRepository } from "@/src/domain/repositories/ReadingProgressRepository";
import { Bookmark, BookmarkRepository } from "@/src/domain/repositories/BookmarkRepository";
import { Highlight, HighlightRepository } from "@/src/domain/repositories/HighlightRepository";
import { SearchHistoryRepository } from "@/src/domain/repositories/SearchHistoryRepository";
import { SearchHistory } from "@/src/domain/types/search";
import { webGet, webGetAll, webPut, webGetPersistent, webSaveBookPersistent, webReplaceChaptersPersistent, webGetAllPersistent, webPutPersistent, webDeletePersistent, webImportStudyPersistent } from "@/src/data/database/connection/webLibraryStore";

export class IndexedDbBookRepository implements BookRepository {
  async listAll(): Promise<LibraryBook[]> { return webGetAllPersistent<LibraryBook>("book_metadata"); }
  async listActive(): Promise<LibraryBook[]> {
    const [books, progress] = await Promise.all([webGetAllPersistent<LibraryBook>("book_metadata"), webGetAllPersistent<ReadingProgress>("reading_progress")]);
    const progressByBook = new Map(progress.map((item) => [item.bookId, item.percentage]));
    return books.filter((book) => !book.isDeleted).map((book) => ({ ...book, progress: progressByBook.get(book.id) ?? book.progress ?? 0 })).sort((first, second) => (second.lastOpenedDate ?? second.addedDate) - (first.lastOpenedDate ?? first.addedDate));
  }
  async findById(bookId: string): Promise<LibraryBook | null> { const book = await webGetPersistent<LibraryBook>("books", bookId); return book && !book.isDeleted ? book : null; }
  async save(book: LibraryBook): Promise<void> {
    await webSaveBookPersistent(book);
  }
  async softDelete(bookId: string): Promise<void> {
    const book = await webGetPersistent<LibraryBook>("books", bookId);
    if (!book) return;
    await webSaveBookPersistent({ ...book, isDeleted: true });
  }
}

export class IndexedDbChapterRepository implements ChapterRepository {
  async listByBookId(bookId: string): Promise<StoredChapter[]> { return (await webGetAllPersistent<StoredChapter>("chapters")).filter((chapter) => chapter.bookId === bookId).sort((first, second) => first.chapterIndex - second.chapterIndex); }
  async replaceForBook(bookId: string, chapters: StoredChapter[]): Promise<void> {
    await webReplaceChaptersPersistent(bookId, chapters);
  }
}

export class IndexedDbReadingProgressRepository implements ReadingProgressRepository {
  async findByBookId(bookId: string): Promise<ReadingProgress | null> { return (await webGetAll<ReadingProgress>("reading_progress")).find((item) => item.bookId === bookId) ?? null; }
  async save(progress: ReadingProgress): Promise<void> { await webPut("reading_progress", progress); }
}

export class IndexedDbBookmarkRepository implements BookmarkRepository {
  async importPreservingExisting(bookId: string, bookmarks: Bookmark[]): Promise<{ imported: number; skipped: number }> { return webImportStudyPersistent("bookmarks", bookId, bookmarks); }
  async listByBookId(bookId: string): Promise<Bookmark[]> { return (await webGetAllPersistent<Bookmark>("bookmarks")).filter((item) => item.bookId === bookId); }
  async findById(id: string): Promise<Bookmark | null> { return (await webGetAllPersistent<Bookmark>("bookmarks")).find(item => item.id === id) ?? null; }
  async save(bookmark: Bookmark): Promise<void> { await webPutPersistent("bookmarks", bookmark); }
  async remove(bookmarkId: string): Promise<void> { await webDeletePersistent("bookmarks", bookmarkId); }
}

export class IndexedDbHighlightRepository implements HighlightRepository {
  async importPreservingExisting(bookId: string, highlights: Highlight[]): Promise<{ imported: number; skipped: number }> { return webImportStudyPersistent("highlights", bookId, highlights); }
  async listByBookId(bookId: string): Promise<Highlight[]> { return (await webGetAllPersistent<Highlight>("highlights")).filter((item) => item.bookId === bookId); }
  async findById(id: string): Promise<Highlight | null> { return (await webGetAllPersistent<Highlight>("highlights")).find(item => item.id === id) ?? null; }
  async save(highlight: Highlight): Promise<void> { await webPutPersistent("highlights", highlight); }
  async remove(highlightId: string): Promise<void> { await webDeletePersistent("highlights", highlightId); }
}

export class IndexedDbSearchHistoryRepository implements SearchHistoryRepository {
  async list(limit = 50): Promise<SearchHistory[]> { return (await webGetAll<SearchHistory>("web_search_history")).sort((first, second) => second.searchedAt - first.searchedAt).slice(0, limit); }
  async save(history: SearchHistory): Promise<void> { await webPut("web_search_history", history); }
}
