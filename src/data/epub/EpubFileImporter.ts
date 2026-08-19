import * as FileSystem from "expo-file-system";
import { ImportEpubUseCase } from "@/src/domain/usecases/ImportEpubUseCase";

export class EpubFileImporter {
  constructor(private readonly importEpub: ImportEpubUseCase) {}
  async validateUri(uri: string): Promise<void> { const bytes = await this.readBytes(uri); await this.importEpub.validateBytes(bytes); }
  async importFromUri(uri: string, fileName: string) {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) throw new Error("Arquivo EPUB não encontrado.");
    const bytes = await this.readBytes(uri);
    return this.importEpub.execute({ bytes, fileName, filePath: uri, fileSize: info.size ?? bytes.byteLength });
  }
  private async readBytes(uri: string): Promise<Uint8Array> { const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" } as never); return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)); }
}
