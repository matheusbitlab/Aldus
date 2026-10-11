import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { MOCK_BOOKS } from "@/src/constants/mockBooks";
import { bundledBookManifest, findBundledAsset } from '@/src/data/library/BundledBookIdentity';

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
    const run = libraryAccountScope.capture();
    const owned = await this.books.listOwned?.() ?? await this.books.listActive(); run.check();
    for (const key of epubFiles.keys()) {
      const fileName = key.replace(/^\.\//, "");
      const asset = bundledBookManifest.find(item => item.fileName === fileName && item.format === 'epub');
      if (!asset) continue;
      const assetId = asset.id;
      const id = assetId + "--" + libraryAccountScope.userId;
      const existing = owned.find(book => book.id === id || book.bundledAssetId === assetId || book.id === `${asset.legacyId}--${run.userId}`);
      if (existing) {
        if (existing.isDeleted) continue;
        if (existing.filePath.startsWith('bundled-epub://') && (existing.bundledAssetId !== assetId || existing.fileHash !== asset.hash)) {
          run.check(); await this.books.save({ ...existing, bundledAssetId: assetId, fileHash: asset.hash, fileSize: asset.size });
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
        fileHash: asset.hash,
        mimeType: "application/epub+zip",
        fileSize: asset.size,
        coverImagePath: null,
        totalChapters: 0,
        totalWords: 0,
        addedDate: now,
        lastOpenedDate: null,
        isDeleted: false,
        progress: 0,
      };
      run.check(); await this.books.save(book);
    }
  }

  async resolveUri(bookId: string): Promise<string> {
    const run = libraryAccountScope.capture();
    const book = await this.books.findById(bookId);
    if (!book) throw new Error('Livro não disponível nesta conta.');
    const identity = findBundledAsset(book.bundledAssetId ?? bookId);
    const key = epubFiles.keys().find(file => file.replace(/^\.\//, '') === identity?.fileName);
    if (!key) throw new Error("EPUB local não encontrado no pacote do aplicativo.");

    const asset = Asset.fromModule(epubFiles(key));
    await asset.downloadAsync();
    run.check();
    if (Platform.OS !== "web" && !asset.localUri) {
      throw new Error("Não foi possível carregar o EPUB local.");
    }
    return asset.localUri ?? asset.uri;
  }
}
