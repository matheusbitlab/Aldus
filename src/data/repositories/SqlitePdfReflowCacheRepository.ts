import { PdfReflowCacheRepository } from "@/src/domain/repositories/PdfReflowCacheRepository";
import { PdfReflowCacheRecord } from "@/src/domain/types/pdfReader";
import { getDatabase } from "@/src/data/database/connection/database";
import { isValidatedReflowDocument } from "@/src/data/local/pdfReflowQuality";

export class SqlitePdfReflowCacheRepository implements PdfReflowCacheRepository {
  async findByBookId(bookId: string): Promise<PdfReflowCacheRecord | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<CacheRow>(
      "SELECT * FROM pdf_reflow_cache WHERE book_id = ?",
      bookId
    );
    if (!row) return null;
    try {
      return {
        id: row.book_id,
        sourceSignature: row.source_signature,
        processorVersion: row.processor_version,
        document: JSON.parse(row.document_json) as PdfReflowCacheRecord["document"],
        updatedAt: row.updated_at,
      };
    } catch {
      return null;
    }
  }

  async save(record: PdfReflowCacheRecord): Promise<void> {
    if (!isValidatedReflowDocument(record.document)) throw new Error("Cache Reflow sem validação de qualidade.");
    const database = await getDatabase();
    await database.runAsync(
      "INSERT INTO pdf_reflow_cache (book_id, source_signature, processor_version, document_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(book_id) DO UPDATE SET source_signature = excluded.source_signature, processor_version = excluded.processor_version, document_json = excluded.document_json, updated_at = excluded.updated_at",
      record.id,
      record.sourceSignature,
      record.processorVersion,
      JSON.stringify(record.document),
      record.updatedAt
    );
  }

  async remove(bookId: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("DELETE FROM pdf_reflow_cache WHERE book_id = ?", bookId);
  }
}

interface CacheRow {
  book_id: string;
  source_signature: string;
  processor_version: number;
  document_json: string;
  updated_at: number;
}
