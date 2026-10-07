import { webGet, webPut } from "@/src/data/database/connection/webLibraryStore";

interface StoredBookFile {
  id: string;
  data: Blob;
  fileName: string;
  mimeType: string;
}

export class WebBookFileStore {
  async save(bookId: string, fileName: string, file: Blob): Promise<void> {
    await webPut("documents", {
      id: bookId,
      data: file,
      fileName,
      mimeType: file.type || "application/octet-stream",
    });
  }

  async get(bookId: string): Promise<Blob | null> {
    const storedFile = await webGet<StoredBookFile>("documents", bookId);
    return storedFile?.data ?? null;
  }
}
