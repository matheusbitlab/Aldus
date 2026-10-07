import { PdfReflowCacheRepository } from "@/src/domain/repositories/PdfReflowCacheRepository";
import { PdfReflowCacheRecord } from "@/src/domain/types/pdfReader";
import { webDelete, webGet, webPut } from "@/src/data/database/connection/webLibraryStore";

export class IndexedDbPdfReflowCacheRepository implements PdfReflowCacheRepository {
  findByBookId(bookId: string): Promise<PdfReflowCacheRecord | null> {
    return webGet<PdfReflowCacheRecord>("pdf_reflow_cache", bookId);
  }

  save(record: PdfReflowCacheRecord): Promise<void> {
    return webPut("pdf_reflow_cache", record);
  }

  remove(bookId: string): Promise<void> {
    return webDelete("pdf_reflow_cache", bookId);
  }
}