import { webDelete, webGet, webPut } from "@/src/data/database/connection/webLibraryStore";

interface StoredBookFile {
  id: string;
  data: Blob;
  fileName: string;
  mimeType: string;
}

export class WebBookFileStore {
  constructor(private readonly canRead?: (bookId: string) => Promise<boolean>) {}
  async save(bookId: string, fileName: string, file: Blob): Promise<void> {
    await webPut("documents", {
      id: bookId,
      data: file,
      fileName,
      mimeType: file.type || "application/octet-stream",
    });
  }

  async get(bookId: string): Promise<Blob | null> {
    if (this.canRead && !await this.canRead(bookId)) return null;
    const storedFile = await webGet<StoredBookFile>("documents", bookId);
    if (this.canRead && !await this.canRead(bookId)) return null;
    return storedFile?.data ?? null;
  }

  async delete(bookId: string): Promise<void> {
    await webDelete("documents", bookId);
  }
}
