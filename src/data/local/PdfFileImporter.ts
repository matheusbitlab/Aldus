import { newLibraryId } from "@/src/domain/entities/libraryId";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
import { pdfThumbnailGenerator } from "@/src/presentation/services/PdfThumbnailGenerator";
import { WebBookFileStore } from "@/src/data/database/connection/WebBookFileStore";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { BookImportPhaseUpdate } from "@/src/domain/types/bookImport";

export class PdfFileImporter {
  constructor(
    private readonly books: BookRepository,
    private readonly chapters: ChapterRepository,
    private readonly webFiles?: WebBookFileStore
  ) {}

  async importFromUri(
    uri: string,
    fileName: string,
    stableId?: string,
    pickedFile?: Blob,
    options: { signal?: AbortSignal; onPhase?: (update: BookImportPhaseUpdate) => void } = {}
  ): Promise<LibraryBook> {
    const accountRun = libraryAccountScope.capture();
    throwIfAborted(options.signal);
    const id = stableId ?? newLibraryId();
    options.onPhase?.({ phase: "preparing", cancellable: true });
    const existingBook = stableId ? await withAbort(this.books.findById(id), options.signal) : null;
    if (existingBook) return existingBook;

    const isWeb = Platform.OS === "web";
    const isBundled = uri.startsWith("bundled-pdf://");
    options.onPhase?.({ phase: "reading", cancellable: true });
    const info = isWeb || isBundled ? null : await withAbort(FileSystem.getInfoAsync(uri), options.signal);
    if (!isWeb && !isBundled && (!info?.exists || info.isDirectory)) {
      throw new Error("Arquivo PDF não encontrado.");
    }

    if (!isWeb && !isBundled) {
      const header = await withAbort(FileSystem.readAsStringAsync(uri, { encoding: "base64", position: 0, length: 5 } as never), options.signal);
      if (!atob(header).startsWith("%PDF-")) throw new Error("O arquivo selecionado não é um PDF válido.");
    }

    let filePath = uri;
    let fileSize = info?.exists ? info.size ?? 0 : 0;
    let fileForThumbnail: Blob | undefined = pickedFile;
    let savedWebFile = false;

    try {
    options.onPhase?.({ phase: "validating", cancellable: true, fileSize: pickedFile?.size ?? fileSize });
    if (isWeb && !isBundled) {
      let file: Blob;
      if (pickedFile) {
        file = pickedFile;
      } else {
        const response = await fetch(uri, { signal: options.signal });
        if (!response.ok) throw new Error("Não foi possível ler o PDF no navegador.");
        file = await withAbort(response.blob(), options.signal);
      }
      const header = new Uint8Array(await withAbort(file.slice(0, 5).arrayBuffer(), options.signal));
      if (String.fromCharCode(...header) !== "%PDF-") throw new Error("O arquivo selecionado não é um PDF válido.");
      fileForThumbnail = file;
      if (this.webFiles) {
        await withAbort(this.webFiles.save(id, fileName, file), options.signal);
        savedWebFile = true;
        filePath = `web-pdf://${id}`;
      } else {
        filePath = await blobToDataUri(file);
      }
      fileSize = file.size;
    }

    // Generate cover thumbnail from Page 1
    let coverImagePath: string | null = null;
    if (!isBundled) {
      options.onPhase?.({ phase: "reading_metadata", cancellable: true, fileSize });
      try {
        coverImagePath = await withAbort(pdfThumbnailGenerator.generate(
          filePath,
          id,
          fileForThumbnail
        ), options.signal);
      } catch (error) {
        if (options.signal?.aborted) throw error;
        coverImagePath = null;
      }
    }

    const now = Date.now();
    accountRun.check();
    const book: LibraryBook = { ownerUserId: accountRun.userId, importComplete: false,
      id,
      title: fileName.replace(/\.pdf$/i, ""),
      author: "Arquivo local",
      fileName,
      filePath,
      fileHash: null,
      mimeType: "application/pdf",
      fileSize,
      coverImagePath,
      totalChapters: 1,
      totalWords: 0,
      addedDate: now,
      lastOpenedDate: null,
      isDeleted: false,
      progress: 0,
    };

    const chapter: StoredChapter = {
      id: `${id}-document`,
      bookId: id,
      chapterIndex: 0,
      title: book.title,
      startCfi: null,
      endCfi: null,
      characterCount: 0,
      html: "",
    };

    throwIfAborted(options.signal);
    options.onPhase?.({ phase: "persisting", cancellable: false, fileSize });
    try {
      await this.books.save(book);
      await this.chapters.replaceForBook(id, [chapter]);
    } catch (error) {
      try { await this.books.softDelete(id); } catch { /* keep original persistence error */ }
      throw error;
    }
    accountRun.check();
    book.importComplete = true;
    await this.books.save(book);
    return book;
    } catch (error) {
      if (savedWebFile && this.webFiles) await this.webFiles.delete(id).catch(() => undefined);
      throw error;
    }
  }
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Não foi possível converter o PDF."));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Não foi possível ler o PDF."));
    reader.readAsDataURL(blob);
  });
}
