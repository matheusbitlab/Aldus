import { SearchExecutionResult, SearchPlugin, ScrapedLink, SearchSourceStatus } from "@/src/domain/types/search";
import { SearchHistoryRepository } from "@/src/domain/repositories/SearchHistoryRepository";
import { NetworkFetcherService } from "@/src/data/scraping/NetworkFetcherService";
import { RobotsCacheService } from "@/src/data/scraping/RobotsCacheService";
import { ThrottleQueue } from "@/src/data/scraping/ThrottleQueue";
import { LinkValidatorService } from "@/src/data/scraping/LinkValidatorService";
import { SearchExecutionOptions } from "@/src/domain/types/search";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { searchDiagnostic } from "@/src/utils/searchDiagnostics";
import { readOpdsCatalog } from "@/src/data/scraping/OpdsCatalog";
import { GutenbergSearchPlugin } from "@/src/data/scraping/GutenbergSearchPlugin";
import { catalogRemoteQueries, rankCatalogBooks } from "@/src/domain/search/catalogRanking";

export class SearchBooksUseCase {
  constructor(private readonly plugins: SearchPlugin[], private readonly fetcher: NetworkFetcherService, private readonly robots: RobotsCacheService, private readonly throttle: ThrottleQueue, private readonly validator: LinkValidatorService, private readonly history: SearchHistoryRepository) {}
  setPlugins(plugins: SearchPlugin[]): void { this.plugins.splice(0, this.plugins.length, ...plugins); }
  async resolveAcquisition(book: ScrapedLink, signal?: AbortSignal): Promise<ScrapedLink> {
    if (!book.catalogEntryUrl) return book;
    const url = new URL(book.catalogEntryUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("Endereço de aquisição inválido.");
    await withAbort(this.throttle.waitFor(url.hostname, signal), signal);
    const headers = url.hostname === "www.gutenberg.org" ? new GutenbergSearchPlugin().requestHeaders : {};
    const payload = await this.fetcher.getText(url.href, { signal, timeoutMs: 12000, retries: 0, headers: { Accept: "application/atom+xml", ...headers } });
    throwIfAborted(signal);
    const resolved = readOpdsCatalog(payload, url.href, book.sourceSite).books.find(candidate => candidate.format === "epub");
    if (!resolved) throw new Error("Este registro não oferece uma aquisição EPUB disponível.");
    return { ...book, ...resolved, catalogEntryUrl: undefined };
  }
  async execute(query: string, signal?: AbortSignal): Promise<ScrapedLink[]> {
    return (await this.executeDetailed(query, this.plugins, {}, signal)).results;
  }

  async executeDetailed(
    query: string,
    plugins: SearchPlugin[] = this.plugins,
    endpointOverrides: Record<string, string> = {},
    signal?: AbortSignal,
    options: SearchExecutionOptions = {}
  ): Promise<SearchExecutionResult> {
    const cleanQuery = query.trim().replace(/[<>"']/g, "");
    if (!cleanQuery) return { results: [], sources: [] };
    const remoteQueries = catalogRemoteQueries(cleanQuery);
    if (!remoteQueries.primary) return { results: [], sources: plugins.map(plugin => ({ sourceName: plugin.name, status: "empty" })) };
    throwIfAborted(signal);
    const completed = new Map<number, { links: ScrapedLink[]; status: SearchSourceStatus }>();
    const snapshot = (): SearchExecutionResult => {
      const entries = [...completed.entries()].sort(([a], [b]) => a - b).map(([, value]) => value);
      return { results: rankCatalogBooks([...new Map(entries.flatMap(({ links }) => links).map(item => [item.url, item])).values()], cleanQuery), sources: plugins.map((plugin, index) => completed.get(index)?.status ?? { sourceName: plugin.name, status: "loading" }), pendingSources: plugins.filter((_, index) => !completed.has(index)).map(plugin => plugin.name) };
    };
    options.onPartial?.(snapshot());

    await withAbort(Promise.all(plugins.map(async (plugin, sourceIndex) => {
      const sourceName = plugin.name;
      const trace = (stage: string) => searchDiagnostic(options.operationId, stage, { sourceIndex });
      let result: { links: ScrapedLink[]; status: SearchSourceStatus };
      try {
        if (plugin.search) {
          const links = rankCatalogBooks(await withAbort(plugin.search(cleanQuery, signal), signal), cleanQuery);
          throwIfAborted(signal);
          completed.set(sourceIndex, { links, status: { sourceName, status: links.length ? "success" : "empty" } });
          options.onPartial?.(snapshot());
          return;
        }
        trace("endpoint");
        const endpoint = endpointOverrides[sourceName] ?? plugin.getSearchEndpoint(remoteQueries.primary);
        const url = new URL(endpoint);
        if (!/^https?:$/.test(url.protocol)) throw new Error("A fonte deve usar HTTP ou HTTPS.");
        if (plugin.requiresRobotsPolicy && !(await withAbort(this.robots.canFetch(endpoint, signal), signal))) {
          throw new Error("A fonte não permite esta rota em seu robots.txt.");
        }
        trace("throttle");
        await withAbort(this.throttle.waitFor(url.hostname, signal), signal);
        const fetchPayload = async (address: string) => withAbort(this.fetcher.getText(address, {
          signal,
          timeoutMs: 12000,
          retries: 0,
          headers: { Accept: "application/json,application/atom+xml,application/xml,text/html", ...plugin.requestHeaders },
          onStage: trace,
        }), signal);
        let payload = await fetchPayload(endpoint);
        throwIfAborted(signal);
        trace("adapter");
        const rank = (body: string) => rankCatalogBooks(plugin.parseResults(body).slice(0, 200), cleanQuery).slice(0,50);
        let candidates = rank(payload);
        if (!candidates.length && plugin.supportsQueryFallback && remoteQueries.fallback && !endpointOverrides[sourceName]) {
          const fallbackEndpoint = plugin.getSearchEndpoint(remoteQueries.fallback);
          if (fallbackEndpoint !== endpoint) {
            const fallbackUrl = new URL(fallbackEndpoint);
            if (!/^https?:$/.test(fallbackUrl.protocol)) throw new Error("A fonte deve usar HTTP ou HTTPS.");
            if (plugin.requiresRobotsPolicy && !(await withAbort(this.robots.canFetch(fallbackEndpoint, signal), signal))) throw new Error("A fonte não permite esta rota em seu robots.txt.");
            await withAbort(this.throttle.waitFor(fallbackUrl.hostname, signal), signal);
            trace("reduced-query");
            payload = await fetchPayload(fallbackEndpoint);
            throwIfAborted(signal);
            candidates = rank(payload);
          }
        }
        const links = plugin.skipLinkValidation
          ? candidates
          : (await Promise.all(candidates.map((link) => this.validator.validate(link, signal))))
              .filter((link): link is ScrapedLink => link !== null);
        const status: SearchSourceStatus = {
          sourceName,
          status: links.length > 0 ? "success" : "empty",
          nextPageUrl: plugin.getNextPageUrl?.(payload) ?? null,
        };
        throwIfAborted(signal);
        result = { links, status };
      } catch (failure) {
        throwIfAborted(signal);
        result = {
          links: [] as ScrapedLink[],
          status: {
            sourceName,
            status: "error" as const,
            error: failure instanceof Error ? failure.message : "Falha desconhecida na fonte.",
          },
        };
      }
      completed.set(sourceIndex, result);
      trace("source-terminal");
      options.onPartial?.(snapshot());
    })), signal);

    const response = snapshot();
    searchDiagnostic(options.operationId, "aggregation", { resultsCount: response.results.length });
    // History persistence has its own lifecycle; network results are already complete.
    searchDiagnostic(options.operationId, "history-start");
    void this.history.save({
      id: `search-${Date.now()}`,
      query: cleanQuery,
      resultsCount: response.results.length,
      searchedAt: Date.now(),
    }).then(() => searchDiagnostic(options.operationId, "history-saved"), () => searchDiagnostic(options.operationId, "history-error"));

    return response;
  }
}
