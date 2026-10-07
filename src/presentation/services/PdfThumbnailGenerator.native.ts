import * as FileSystem from "expo-file-system/legacy";

export class NativePdfThumbnailGenerator {
  private coversDir = `${FileSystem.documentDirectory ?? ""}covers/`;

  async ensureDirectory(): Promise<void> {
    if (!FileSystem.documentDirectory) return;
    const info = await FileSystem.getInfoAsync(this.coversDir).catch(() => null);
    if (!info?.exists) {
      await FileSystem.makeDirectoryAsync(this.coversDir, { intermediates: true }).catch(() => {});
    }
  }

  async generate(_uri: string, bookId: string, _pickedFile?: Blob): Promise<string | null> {
    try {
      await this.ensureDirectory();
      const targetPath = `${this.coversDir}${bookId}.jpg`;
      const info = await FileSystem.getInfoAsync(targetPath).catch(() => null);
      if (info?.exists) {
        return targetPath;
      }
      return null;
    } catch {
      return null;
    }
  }

  async saveBase64Cover(bookId: string, base64Image: string): Promise<string | null> {
    try {
      await this.ensureDirectory();
      const targetPath = `${this.coversDir}${bookId}.jpg`;
      const cleanBase64 = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
      await FileSystem.writeAsStringAsync(targetPath, cleanBase64, {
        encoding: "base64" as never,
      });
      return targetPath;
    } catch {
      return null;
    }
  }
}

export const pdfThumbnailGenerator = new NativePdfThumbnailGenerator();
