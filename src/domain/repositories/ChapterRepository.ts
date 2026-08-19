import { StoredChapter } from "@/src/domain/entities/LibraryBook";

export interface ChapterRepository {
  listByBookId(bookId: string): Promise<StoredChapter[]>;
  replaceForBook(bookId: string, chapters: StoredChapter[]): Promise<void>;
}
