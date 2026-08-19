import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { ReadingProgress, ReadingProgressRepository } from "@/src/domain/repositories/ReadingProgressRepository";
import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
export interface OpenBookResult { book: LibraryBook; chapters: StoredChapter[]; progress: ReadingProgress | null; }
export class OpenBookUseCase { constructor(private readonly books: BookRepository, private readonly chapters: ChapterRepository, private readonly progress: ReadingProgressRepository) {} async execute(bookId: string): Promise<OpenBookResult | null> { const book = await this.books.findById(bookId); if (!book) return null; return { book, chapters: await this.chapters.listByBookId(bookId), progress: await this.progress.findByBookId(bookId) }; } }
