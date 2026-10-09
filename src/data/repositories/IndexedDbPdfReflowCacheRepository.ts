import { PdfReflowCacheRepository } from "@/src/domain/repositories/PdfReflowCacheRepository";
import { PdfReflowCacheRecord } from "@/src/domain/types/pdfReader";
import { webDelete, webGet, webPut } from "@/src/data/database/connection/webLibraryStore";
import { isValidatedReflowDocument } from "@/src/data/local/pdfReflowQuality";

export class IndexedDbPdfReflowCacheRepository implements PdfReflowCacheRepository {
  findByBookId(bookId: string): Promise<PdfReflowCacheRecord | null> {
    return webGet<PdfReflowCacheRecord>("pdf_reflow_cache", bookId);
  }

  async save(record: PdfReflowCacheRecord): Promise<void> {
    if (!isValidatedReflowDocument(record.document)) throw new Error("Cache Reflow sem validação de qualidade.");
    return webPut("pdf_reflow_cache", record);
  }

  remove(bookId: string): Promise<void> {
    return webDelete("pdf_reflow_cache", bookId);
  }
}
