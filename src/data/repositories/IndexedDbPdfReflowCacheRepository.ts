import { PdfReflowCacheRepository } from "@/src/domain/repositories/PdfReflowCacheRepository";
import { PdfReflowCacheRecord } from "@/src/domain/types/pdfReader";
import { webDelete, webGetPersistent, webPutPersistent } from "@/src/data/database/connection/webLibraryStore";
import { isValidatedReflowDocumentAsync } from "@/src/data/local/pdfReflowQuality";

export class IndexedDbPdfReflowCacheRepository implements PdfReflowCacheRepository {
  findByBookId(bookId: string): Promise<PdfReflowCacheRecord | null> {
    return webGetPersistent<PdfReflowCacheRecord>("pdf_reflow_cache", bookId);
  }

  async save(record: PdfReflowCacheRecord, signal?: AbortSignal): Promise<void> {
    if (!await isValidatedReflowDocumentAsync(record.document, signal)) throw new Error("Cache Reflow sem validação de qualidade.");
    return webPutPersistent("pdf_reflow_cache", record, signal);
  }

  remove(bookId: string): Promise<void> {
    return webDelete("pdf_reflow_cache", bookId);
  }
}
