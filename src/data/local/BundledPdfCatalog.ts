import { Asset } from "expo-asset";
import { Platform } from "react-native";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { PdfFileImporter } from "@/src/data/local/PdfFileImporter";

type PdfContext = {
  keys(): string[];
  (key: string): number;
};

declare const require: {
  context(directory: string, recursive?: boolean, filter?: RegExp): PdfContext;
};

const pdfFiles = require.context("../../../Livros", false, /\.pdf$/i);

export class BundledPdfCatalog {
  constructor(
    private readonly importer: PdfFileImporter,
    private readonly books: BookRepository
  ) {}

  async importAll(): Promise<void> {
    for (const key of pdfFiles.keys()) {
      const fileName = key.replace(/^\.\//, "");
      const id = getBookId(fileName);
      const existing = await this.books.findById(id);
      if (existing) continue;
      await this.importer.importFromUri(`bundled-pdf://${id}`, fileName, id);
    }
  }

  async resolveUri(bookId: string): Promise<string> {
    const key = pdfFiles.keys().find((file) => getBookId(file.replace(/^\.\//, "")) === bookId);
    if (!key) throw new Error("PDF local não encontrado no pacote do aplicativo.");

    const asset = Asset.fromModule(pdfFiles(key));
    await asset.downloadAsync();
    if (Platform.OS !== "web" && !asset.localUri) {
      throw new Error("Não foi possível carregar o PDF local.");
    }
    return asset.localUri ?? asset.uri;
  }
}

function getBookId(fileName: string): string {
  let hash = 2166136261;
  for (const character of fileName.toLowerCase()) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return `bundled-pdf-${(hash >>> 0).toString(16)}`;
}