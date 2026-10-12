import { SearchPlugin } from "@/src/domain/types/search";
import { UserSource } from "@/src/domain/types/sources";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";
import { querySourceCatalog } from "@/src/data/sources/SourceCatalogService";
import { sourceIdentity } from "@/src/domain/types/sourceCatalog";
import { throwIfAborted } from "@/src/core/utils/cancellation";
export class GoogleDriveSearchPlugin implements SearchPlugin {
  readonly name: string;
  readonly skipLinkValidation = true;
  constructor(private readonly source: UserSource) { this.name = source.name; }
  async search(query: string, signal?: AbortSignal) {
    throwIfAborted(signal);
    if (sourceCatalogs.view(this.source.id).catalog?.sourceIdentity !== sourceIdentity(this.source)) await sourceCatalogs.load(this.source);
    throwIfAborted(signal);
    const catalog = sourceCatalogs.view(this.source.id).catalog;
    if (!catalog || catalog.sourceIdentity !== sourceIdentity(this.source)) throw new Error("Atualize esta fonte em Minhas fontes para pesquisar o catálogo do Drive.");
    return querySourceCatalog(catalog.items, query, "az");
  }
  getSearchEndpoint(): string { throw new Error("Drive usa o adapter autenticado, não uma URL pública de pesquisa."); }
  parseResults() { return []; }
}
