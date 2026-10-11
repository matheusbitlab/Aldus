import { SearchPlugin } from "@/src/domain/types/search";
import { UserSource } from "@/src/domain/types/sources";
import { googleDrive } from "@/src/data/drive/driveDependencies";
import { rankCatalogBooks } from "@/src/domain/search/catalogRanking";
export class GoogleDriveSearchPlugin implements SearchPlugin {
  readonly name: string;
  readonly skipLinkValidation = true;
  constructor(private readonly source: UserSource) { this.name = source.name; }
  async search(query: string, signal?: AbortSignal) { return rankCatalogBooks(await googleDrive.list(this.source, signal), query); }
  getSearchEndpoint(): string { throw new Error("Drive usa o adapter autenticado, não uma URL pública de pesquisa."); }
  parseResults() { return []; }
}
