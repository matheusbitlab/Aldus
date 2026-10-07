import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { ReadingProgress, ReadingProgressRepository } from "@/src/domain/repositories/ReadingProgressRepository";
import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
export interface OpenBookResult { book: LibraryBook; chapters: StoredChapter[]; progress: ReadingProgress | null; }
import { applyBookOrganization, LibraryOrganizationRepository } from "@/src/domain/types/libraryOrganization";
export class OpenBookUseCase {
  constructor(private readonly books: BookRepository, private readonly chapters: ChapterRepository, private readonly progress: ReadingProgressRepository, private readonly organization?: LibraryOrganizationRepository) {}
  async execute(bookId: string): Promise<OpenBookResult | null> {
    const book = await this.books.findById(bookId);
    if (!book) return null;
    const records = this.organization ? await this.organization.list() : {};
    return { book: applyBookOrganization(book, records[bookId]), chapters: await this.chapters.listByBookId(bookId), progress: await this.progress.findByBookId(bookId) };
  }
}
