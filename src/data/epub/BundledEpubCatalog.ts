import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { MOCK_BOOKS } from "@/src/constants/mockBooks";

type EpubContext = {
  keys(): string[];
  (key: string): number;
};

declare const require: {
  context(directory: string, recursive?: boolean, filter?: RegExp): EpubContext;
};

const epubFiles = require.context("../../../assets/Livros", false, /\.epub$/i);

export class BundledEpubCatalog {
  constructor(private readonly books: BookRepository) {}

  async registerAll(): Promise<void> {
    if (!libraryAccountScope.userId) return;
    for (const key of epubFiles.keys()) {
      const fileName = key.replace(/^\.\//, "");
      const assetId = getBookId(fileName);
      const id = assetId + "--" + libraryAccountScope.userId;
      const existing = await this.books.findById(id);
      if (existing) {
        if (existing.filePath.startsWith("web-epub://")) {
          await this.books.save({ ...existing, filePath: `bundled-epub://${id}` });
        }
        continue;
      }

      const mock = MOCK_BOOKS.find(
        (book) => book.fileUri.split("/").pop()?.toLowerCase() === fileName.toLowerCase()
      );
      const now = Date.now();
      const book: LibraryBook = {
        id, bundledAssetId: assetId, importComplete: true,
        title: mock?.title ?? fileName.replace(/\.epub$/i, ""),
        author: mock?.author ?? "Arquivo local",
        fileName,
        filePath: `bundled-epub://${id}`,
        fileHash: null,
        mimeType: "application/epub+zip",
        fileSize: 0,
        coverImagePath: null,
        totalChapters: 0,
        totalWords: 0,
        addedDate: now,
        lastOpenedDate: null,
        isDeleted: false,
        progress: 0,
      };
      await this.books.save(book);
    }
  }

  async resolveUri(bookId: string): Promise<string> {
    const key = epubFiles.keys().find((file) => getBookId(file.replace(/^\.\//, "")) === bookId.split("--")[0]);
    if (!key) throw new Error("EPUB local não encontrado no pacote do aplicativo.");

    const asset = Asset.fromModule(epubFiles(key));
    await asset.downloadAsync();
    if (Platform.OS !== "web" && !asset.localUri) {
      throw new Error("Não foi possível carregar o EPUB local.");
    }
    return asset.localUri ?? asset.uri;
  }
}

function getBookId(fileName: string): string {
  let hash = 2166136261;
  for (const character of fileName.toLowerCase()) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return `bundled-epub-${(hash >>> 0).toString(16)}`;
}
