import { PdfReflowCacheRecord } from "@/src/domain/types/pdfReader";

export interface PdfReflowCacheRepository {
  findByBookId(bookId: string): Promise<PdfReflowCacheRecord | null>;
  save(record: PdfReflowCacheRecord): Promise<void>;
  remove(bookId: string): Promise<void>;
}