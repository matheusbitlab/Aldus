import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { ChapterRepository } from "@/src/domain/repositories/ChapterRepository";
import { LibraryBook, StoredChapter } from "@/src/domain/entities/LibraryBook";
import { pdfThumbnailGenerator } from "@/src/presentation/services/PdfThumbnailGenerator";
import { WebBookFileStore } from "@/src/data/database/connection/WebBookFileStore";

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
    pickedFile?: Blob
  ): Promise<LibraryBook> {
    const id = stableId ?? `pdf-${Date.now()}`;
    const existingBook = stableId ? await this.books.findById(id) : null;
    if (existingBook) return existingBook;

    const isWeb = Platform.OS === "web";
    const isBundled = uri.startsWith("bundled-pdf://");
    const info = isWeb || isBundled ? null : await FileSystem.getInfoAsync(uri);
    if (!isWeb && !isBundled && (!info?.exists || info.isDirectory)) {
      throw new Error("Arquivo PDF não encontrado.");
    }

    if (!isWeb && !isBundled) {
      const header = await FileSystem.readAsStringAsync(uri, { encoding: "base64", position: 0, length: 5 } as never);
      if (!atob(header).startsWith("%PDF-")) throw new Error("O arquivo selecionado não é um PDF válido.");
    }

    let filePath = uri;
    let fileSize = info?.exists ? info.size ?? 0 : 0;
    let fileForThumbnail: Blob | undefined = pickedFile;

    if (isWeb && !isBundled) {
      let file: Blob;
      if (pickedFile) {
        file = pickedFile;
      } else {
        const response = await fetch(uri);
        if (!response.ok) throw new Error("Não foi possível ler o PDF no navegador.");
        file = await response.blob();
      }
      const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...header) !== "%PDF-") throw new Error("O arquivo selecionado não é um PDF válido.");
      fileForThumbnail = file;
      if (this.webFiles) {
        await this.webFiles.save(id, fileName, file);
        filePath = `web-pdf://${id}`;
      } else {
        filePath = await blobToDataUri(file);
      }
      fileSize = file.size;
    }

    // Generate cover thumbnail from Page 1
    let coverImagePath: string | null = null;
    if (!isBundled) {
      try {
        coverImagePath = await pdfThumbnailGenerator.generate(
          filePath,
          id,
          fileForThumbnail
        );
      } catch {
        coverImagePath = null;
      }
    }

    const now = Date.now();
    const book: LibraryBook = {
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

    await this.books.save(book);
    await this.chapters.replaceForBook(id, [chapter]);
    return book;
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
