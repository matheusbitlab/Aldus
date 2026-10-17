import { Platform } from "react-native";
import { googleDrive } from "@/src/data/drive/driveDependencies";
import { NetworkFetcherService } from "@/src/data/scraping/NetworkFetcherService";
import { UserSourceSearchPlugin } from "@/src/data/scraping/UserSourceSearchPlugin";
import { UserSourceRepository } from "./UserSourceRepository";
import { IndexedDbSourceCatalogRepository } from "./IndexedDbSourceCatalogRepository";
import { SqliteSourceCatalogRepository } from "./SqliteSourceCatalogRepository";
import { SourceCatalogService, SourceCatalogAdapter } from "./SourceCatalogService";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";

const sources = new UserSourceRepository(), network = new NetworkFetcherService();
export const sourceCatalogAdapter: SourceCatalogAdapter = {
  catalog: async (source, signal, context) => source.kind === "google-drive" ? googleDrive.listCatalog(source, signal, true, context) : { items: await sourceCatalogAdapter.list(source, signal, context) },
  list: async (source, signal) => {
    if (source.kind === "google-drive") return googleDrive.list(source, signal, true);
    const payload = await network.getText(source.url, { signal, retries: 0 });
    // JSON V1 is an entire static collection; reject pagination rather than pretend it is complete.
    const parsed = JSON.parse(payload) as { next?: unknown; nextPageToken?: unknown; continuation?: unknown; nextPageUrl?: unknown; pagination?: unknown; hasMore?: boolean };
    if (parsed?.next || parsed?.nextPageToken || parsed?.continuation || parsed?.nextPageUrl || parsed?.pagination || parsed?.hasMore) throw new Error("Catálogo JSON paginado não suportado.");
    return new UserSourceSearchPlugin(source).parseResults(payload);
  },
  authorizationRequired: source => {
    if (source.kind !== "google-drive") return false;
    try { googleDrive.authorization.token(source.id); return false; } catch { return true; }
  },
};
export const sourceCatalogs = new SourceCatalogService(
  Platform.OS === "web" ? new IndexedDbSourceCatalogRepository() : new SqliteSourceCatalogRepository(),
  sourceCatalogAdapter, async id => (await sources.list()).find(source => source.id === id),
);
libraryAccountScope.subscribe(() => sourceCatalogs.clearSession());
