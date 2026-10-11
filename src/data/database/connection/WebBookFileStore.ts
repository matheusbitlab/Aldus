import { webDeletePersistent, webGetPersistent, webPutPersistent } from "@/src/data/database/connection/webLibraryStore";

interface StoredBookFile {
  id: string;
  data: Blob;
  fileName: string;
  mimeType: string;
}

export class WebBookFileStore {
  constructor(private readonly canRead?: (bookId: string) => Promise<boolean>, private readonly canWrite?: (bookId: string) => Promise<boolean>) {}
  async save(bookId: string, fileName: string, file: Blob): Promise<void> {
    if(this.canWrite && !await this.canWrite(bookId))throw new Error('Arquivo não disponível nesta conta.');
    await webPutPersistent("documents", {
      id: bookId,
      data: file,
      fileName,
      mimeType: file.type || "application/octet-stream",
    });
  }

  async get(bookId: string): Promise<Blob | null> {
    if (this.canRead && !await this.canRead(bookId)) return null;
    const storedFile = await webGetPersistent<StoredBookFile>("documents", bookId);
    if (this.canRead && !await this.canRead(bookId)) return null;
    return storedFile?.data ?? null;
  }

  async delete(bookId: string): Promise<void> {
    if(this.canWrite && !await this.canWrite(bookId))throw new Error('Arquivo não disponível nesta conta.');
    await webDeletePersistent("documents", bookId);
  }
}
