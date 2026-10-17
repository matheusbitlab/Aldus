import { webGetPersistent, webPutPersistent, webSourceLinksPersistent, webRemoveSourcePersistent } from "@/src/data/database/connection/webLibraryStore";
import { SourceCatalogRepository } from "@/src/domain/repositories/SourceCatalogRepository";
import { SourceCatalog, SourceImportLink } from "@/src/domain/types/sourceCatalog";

export class IndexedDbSourceCatalogRepository implements SourceCatalogRepository {
  async get(sourceId: string): Promise<SourceCatalog | null> {
    const record = await webGetPersistent<{ id: string; catalog: SourceCatalog }>("source_catalogs", sourceId);
    return record?.catalog ?? null;
  }
  save(catalog: SourceCatalog, signal?: AbortSignal): Promise<void> { return webPutPersistent("source_catalogs", { id: catalog.sourceId, catalog }, signal); }
  links(sourceId: string): Promise<SourceImportLink[]> { return webSourceLinksPersistent(sourceId); }
  link(value: SourceImportLink): Promise<void> { return webPutPersistent("source_import_links", { ...value, id: JSON.stringify([value.sourceId, value.remoteBookId]) }); }
  remove(sourceId: string): Promise<void> { return webRemoveSourcePersistent(sourceId); }
}
