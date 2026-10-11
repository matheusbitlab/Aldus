import { SourceCatalog, SourceImportLink } from "../types/sourceCatalog";

export interface SourceCatalogRepository {
  get(sourceId: string): Promise<SourceCatalog | null>;
  /** Replaces the entire, validated snapshot in a single durable atomic write. */
  save(catalog: SourceCatalog): Promise<void>;
  links(sourceId: string): Promise<SourceImportLink[]>;
  link(value: SourceImportLink): Promise<void>;
  /** Only source metadata/associations. Never personal books/files or annotations. */
  remove(sourceId: string): Promise<void>;
}
