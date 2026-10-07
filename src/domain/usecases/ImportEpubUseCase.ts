import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { EpubParser } from "@/src/data/epub/EpubTypes";
import {
  markEpubOpenSpanEnd,
  markEpubOpenSpanStart,
} from "@/src/utils/epubOpenMetrics";

export class ImportEpubUseCase {
  constructor(private readonly parser: EpubParser, private readonly books: BookRepository, private readonly chapters: ChapterRepository) {}
  async validateBytes(bytes: Uint8Array): Promise<void> { await this.parser.parse(bytes); }
  async execute(input: { bytes: Uint8Array; fileName: string; filePath: string; fileSize: number; fileHash?: string | null; bookId?: string }): Promise<LibraryBook> {
    const parseStartedAt = markEpubOpenSpanStart("parse_and_validation", {
      fileName: input.fileName,
      fileSizeBytes: input.fileSize || input.bytes.byteLength,
    });
    const parsed = await this.parser.parse(input.bytes);
    markEpubOpenSpanEnd("parse_and_validation", parseStartedAt, {
      chapterCount: parsed.chapters.length,
      plainTextCharacters: parsed.chapters.reduce((total, chapter) => total + chapter.characterCount, 0),
    });
    const bookId = input.bookId ?? (input.fileHash ? `book-${input.fileHash}` : `book-${Date.now()}`);
    const now = Date.now();
    const book: LibraryBook = { id: bookId, title: parsed.title, author: parsed.author, fileName: input.fileName, filePath: input.filePath, fileHash: input.fileHash ?? null, mimeType: "application/epub+zip", fileSize: input.fileSize, coverImagePath: parsed.coverImagePath, totalChapters: parsed.chapters.length, totalWords: parsed.chapters.reduce((total, chapter) => total + chapter.characterCount, 0), addedDate: now, lastOpenedDate: null, isDeleted: false, progress: 0 };
    const storedChapters: StoredChapter[] = parsed.chapters.map((chapter) => ({ ...chapter, id: `${bookId}:${chapter.id}`, bookId }));
    const persistStartedAt = markEpubOpenSpanStart("chapter_persistence", {
      chapterCount: storedChapters.length,
    });
    await this.books.save(book);
    await this.chapters.replaceForBook(bookId, storedChapters);
    markEpubOpenSpanEnd("chapter_persistence", persistStartedAt, {
      chapterCount: storedChapters.length,
      htmlCharacters: storedChapters.reduce((total, chapter) => total + chapter.html.length, 0),
    });
    return book;
  }
}
