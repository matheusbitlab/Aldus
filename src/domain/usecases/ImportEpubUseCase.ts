import { newLibraryId } from "@/src/domain/entities/libraryId";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { EpubParser } from "@/src/data/epub/EpubTypes";
import {
  markEpubOpenSpanEnd,
  markEpubOpenSpanStart,
} from "@/src/utils/epubOpenMetrics";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { BookImportPhaseUpdate } from "@/src/domain/types/bookImport";

export class ImportEpubUseCase {
  constructor(private readonly parser: EpubParser, private readonly books: BookRepository, private readonly chapters: ChapterRepository) {}
  async validateBytes(bytes: Uint8Array, signal?: AbortSignal): Promise<void> { await withAbort(this.parser.parse(bytes, signal), signal); }
  async execute(
    input: { bytes: Uint8Array; fileName: string; filePath: string; fileSize: number; fileHash?: string | null; bookId?: string },
    options: { signal?: AbortSignal; onPhase?: (update: BookImportPhaseUpdate) => void } = {}
  ): Promise<LibraryBook> {
    const accountRun = libraryAccountScope.capture();
    throwIfAborted(options.signal);
    options.onPhase?.({ phase: "validating", cancellable: true, fileSize: input.fileSize || input.bytes.byteLength });
    const parseStartedAt = markEpubOpenSpanStart("parse_and_validation", {
      fileName: input.fileName,
      fileSizeBytes: input.fileSize || input.bytes.byteLength,
    });
    const parsed = await withAbort(this.parser.parse(input.bytes, options.signal), options.signal);
    markEpubOpenSpanEnd("parse_and_validation", parseStartedAt, {
      chapterCount: parsed.chapters.length,
      plainTextCharacters: parsed.chapters.reduce((total, chapter) => total + chapter.characterCount, 0),
    });
    options.onPhase?.({ phase: "reading_metadata", cancellable: true, fileSize: input.fileSize || input.bytes.byteLength });
    const bookId = input.bookId ?? newLibraryId();
    const previousBook = await withAbort(this.books.findById(bookId), options.signal);
    const now = Date.now();
    accountRun.check();
    const book: LibraryBook = { ...previousBook, ownerUserId: accountRun.userId, importComplete: false, id: bookId, title: parsed.title, author: parsed.author, fileName: input.fileName, filePath: input.filePath, fileHash: input.fileHash ?? previousBook?.fileHash ?? null, mimeType: "application/epub+zip", fileSize: input.fileSize, coverImagePath: parsed.coverImagePath, totalChapters: parsed.chapters.length, totalWords: parsed.chapters.reduce((total, chapter) => total + chapter.characterCount, 0), addedDate: previousBook?.addedDate ?? now, lastOpenedDate: previousBook?.lastOpenedDate ?? null, isDeleted: false, progress: previousBook?.progress ?? 0 };
    const storedChapters: StoredChapter[] = parsed.chapters.map((chapter) => ({ ...chapter, id: `${bookId}:${chapter.id}`, bookId }));
    throwIfAborted(options.signal);
    options.onPhase?.({ phase: "persisting", cancellable: false, fileSize: input.fileSize || input.bytes.byteLength });
    const persistStartedAt = markEpubOpenSpanStart("chapter_persistence", {
      chapterCount: storedChapters.length,
    });
    try {
      await this.books.save(book);
      await this.chapters.replaceForBook(bookId, storedChapters);
    } catch (error) {
      try {
        if (previousBook) await this.books.save(previousBook);
        else await this.books.softDelete(bookId);
      } catch {
        // Preserve the original persistence failure; a soft-deleted row is not shown.
      }
      throw error;
    }
    markEpubOpenSpanEnd("chapter_persistence", persistStartedAt, {
      chapterCount: storedChapters.length,
      htmlCharacters: storedChapters.reduce((total, chapter) => total + chapter.html.length, 0),
    });
    accountRun.check();
    book.importComplete = true;
    await this.books.save(book);
    return book;
  }
}
