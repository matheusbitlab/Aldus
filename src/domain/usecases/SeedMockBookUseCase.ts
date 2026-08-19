import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { mockBook } from "@/src/data/mock/books";
import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
import { ReadingProgressRepository } from "@/src/domain/repositories/ReadingProgressRepository";

export class SeedMockBookUseCase {
  constructor(private readonly books: BookRepository, private readonly chapters: ChapterRepository, private readonly progress: ReadingProgressRepository) {}
  async execute(): Promise<void> {
    if (await this.books.findById(mockBook.id)) return;
    const now = Date.now();
    const book: LibraryBook = { id: mockBook.id, title: mockBook.title, author: mockBook.author, fileName: "the-quiet-hour.mock", filePath: "mock://the-quiet-hour", fileHash: null, mimeType: "text/html", fileSize: 0, coverImagePath: null, totalChapters: mockBook.chapters.length, totalWords: 0, addedDate: now, lastOpenedDate: now, isDeleted: false, progress: 0.38 };
    const storedChapters: StoredChapter[] = mockBook.chapters.map((chapter, index) => ({ ...chapter, bookId: mockBook.id, chapterIndex: index, startCfi: null, endCfi: null }));
    await this.books.save(book);
    await this.chapters.replaceForBook(book.id, storedChapters);
    await this.progress.save({ id: `progress-${book.id}`, bookId: book.id, currentChapterId: storedChapters[0]?.id ?? null, cfiPosition: null, percentage: 0.38, pageNumber: 1, updatedAt: now });
  }
}
