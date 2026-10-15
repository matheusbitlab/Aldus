import { PdfReflowCacheRecord } from "@/src/domain/types/pdfReader";

export interface PdfReflowCacheRepository {
  findByBookId(bookId: string): Promise<PdfReflowCacheRecord | null>;
  save(record: PdfReflowCacheRecord, signal?: AbortSignal): Promise<void>;
  remove(bookId: string): Promise<void>;
}
