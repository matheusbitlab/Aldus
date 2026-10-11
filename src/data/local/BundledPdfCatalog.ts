import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { PdfFileImporter } from "@/src/data/local/PdfFileImporter";
import { bundledBookManifest, findBundledAsset } from '@/src/data/library/BundledBookIdentity';

type PdfContext = {
  keys(): string[];
  (key: string): number;
};

declare const require: {
  context(directory: string, recursive?: boolean, filter?: RegExp): PdfContext;
};

const pdfFiles = require.context("../../../assets/Livros", false, /\.pdf$/i);

export class BundledPdfCatalog {
  constructor(
    private readonly importer: PdfFileImporter,
    private readonly books: BookRepository
  ) {}

  async importAll(): Promise<void> {
    if (!libraryAccountScope.userId) return;
    const run = libraryAccountScope.capture();
    const owned = await this.books.listOwned?.() ?? await this.books.listActive(); run.check();
    for (const key of pdfFiles.keys()) {
      const fileName = key.replace(/^\.\//, "");
      const asset = bundledBookManifest.find(item => item.fileName === fileName && item.format === 'pdf');
      if (!asset) continue;
      const assetId = asset.id;
      const id = assetId + "--" + libraryAccountScope.userId;
      const existing = owned.find(book => book.id === id || book.bundledAssetId === assetId || book.id === `${asset.legacyId}--${run.userId}`);
      if (existing) {
        if (!existing.isDeleted && existing.filePath.startsWith('bundled-pdf://') && (existing.bundledAssetId !== assetId || existing.fileHash !== asset.hash)) {
          run.check(); await this.books.save({ ...existing, bundledAssetId: assetId, fileHash: asset.hash, fileSize: asset.size });
        }
        continue;
      }
      const book = await this.importer.importFromUri(`bundled-pdf://${assetId}`, fileName, id);
      run.check(); await this.books.save({ ...book, bundledAssetId: assetId, fileHash: asset.hash, fileSize: asset.size });
    }
  }

  async resolveUri(bookId: string): Promise<string> {
    const run = libraryAccountScope.capture();
    const book = await this.books.findById(bookId);
    if (!book) throw new Error('Livro não disponível nesta conta.');
    const identity = findBundledAsset(book.bundledAssetId ?? bookId);
    const key = pdfFiles.keys().find(file => file.replace(/^\.\//, '') === identity?.fileName);
    if (!key) throw new Error("PDF local não encontrado no pacote do aplicativo.");

    const asset = Asset.fromModule(pdfFiles(key));
    await asset.downloadAsync();
    run.check();
    if (Platform.OS !== "web" && !asset.localUri) {
      throw new Error("Não foi possível carregar o PDF local.");
    }
    return asset.localUri ?? asset.uri;
  }
}
