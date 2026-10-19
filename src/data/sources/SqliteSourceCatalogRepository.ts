import { getDatabase } from "@/src/data/database/connection/database";
import { SourceCatalogRepository } from "@/src/domain/repositories/SourceCatalogRepository";
import { SourceCatalog, SourceImportLink } from "@/src/domain/types/sourceCatalog";
import { throwIfAborted } from "@/src/core/utils/cancellation";
import { measureSource, sourcePerformance } from "@/src/utils/sourcePerformance";

export class SqliteSourceCatalogRepository implements SourceCatalogRepository {
  async get(sourceId: string): Promise<SourceCatalog | null> {
    const started = performance.now();
    const row = await (await getDatabase()).getFirstAsync<{ snapshot_json: string }>("SELECT snapshot_json FROM source_catalogs WHERE source_id = ?", sourceId);
    sourcePerformance('sqlite_read', started, null);
    if (!row) return null;
    const parseStarted = performance.now(), catalog = JSON.parse(row.snapshot_json) as SourceCatalog;
    sourcePerformance('deserialize', parseStarted, catalog.items.length);
    return catalog;
  }
  async save(catalog: SourceCatalog, signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    const serialized = measureSource('serialize', catalog.items.length, () => JSON.stringify(catalog));
    throwIfAborted(signal);
    const started = performance.now();
    await (await getDatabase()).withExclusiveTransactionAsync(async transaction => {
      throwIfAborted(signal);
      await transaction.runAsync("INSERT INTO source_catalogs (source_id, snapshot_json) VALUES (?, ?) ON CONFLICT(source_id) DO UPDATE SET snapshot_json = excluded.snapshot_json", catalog.sourceId, serialized);
      // Throw inside the transaction so cancellation rolls back the previous valid index.
      throwIfAborted(signal);
    });
    sourcePerformance('sqlite_write', started, catalog.items.length);
  }
  async links(sourceId: string): Promise<SourceImportLink[]> {
    return (await getDatabase()).getAllAsync<SourceImportLink>("SELECT source_id AS sourceId, remote_book_id AS remoteBookId, book_id AS bookId FROM source_import_links WHERE source_id = ?", sourceId);
  }
  async link(value: SourceImportLink): Promise<void> {
    await (await getDatabase()).runAsync("INSERT INTO source_import_links (source_id, remote_book_id, book_id) VALUES (?, ?, ?) ON CONFLICT(source_id, remote_book_id) DO UPDATE SET book_id = excluded.book_id", value.sourceId, value.remoteBookId, value.bookId);
  }
  async remove(sourceId: string): Promise<void> {
    await (await getDatabase()).withExclusiveTransactionAsync(async transaction => {
      await transaction.runAsync("DELETE FROM source_catalogs WHERE source_id = ?", sourceId);
      await transaction.runAsync("DELETE FROM source_import_links WHERE source_id = ?", sourceId);
    });
  }
}
