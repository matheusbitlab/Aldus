import { SearchExecutionResult, SearchPlugin, ScrapedLink, SearchSourceStatus } from "@/src/domain/types/search";
import { SearchHistoryRepository } from "@/src/domain/repositories/SearchHistoryRepository";
import { NetworkFetcherService } from "@/src/data/scraping/NetworkFetcherService";
import { RobotsCacheService } from "@/src/data/scraping/RobotsCacheService";
import { ThrottleQueue } from "@/src/data/scraping/ThrottleQueue";
import { LinkValidatorService } from "@/src/data/scraping/LinkValidatorService";

export class SearchBooksUseCase {
  constructor(private readonly plugins: SearchPlugin[], private readonly fetcher: NetworkFetcherService, private readonly robots: RobotsCacheService, private readonly throttle: ThrottleQueue, private readonly validator: LinkValidatorService, private readonly history: SearchHistoryRepository) {}
  setPlugins(plugins: SearchPlugin[]): void { this.plugins.splice(0, this.plugins.length, ...plugins); }
  async execute(query: string, signal?: AbortSignal): Promise<ScrapedLink[]> {
    return (await this.executeDetailed(query, this.plugins, {}, signal)).results;
  }

  async executeDetailed(
    query: string,
    plugins: SearchPlugin[] = this.plugins,
    endpointOverrides: Record<string, string> = {},
    signal?: AbortSignal
  ): Promise<SearchExecutionResult> {
    const cleanQuery = query.trim().replace(/[<>"']/g, "");
    if (!cleanQuery) return { results: [], sources: [] };

    const sourceResults = await Promise.all(plugins.map(async (plugin) => {
      const sourceName = plugin.name;
      try {
        const endpoint = endpointOverrides[sourceName] ?? plugin.getSearchEndpoint(cleanQuery);
        const url = new URL(endpoint);
        if (!/^https?:$/.test(url.protocol)) throw new Error("A fonte deve usar HTTP ou HTTPS.");
        if (plugin.requiresRobotsPolicy && !(await this.robots.canFetch(endpoint))) {
          throw new Error("A fonte não permite esta rota em seu robots.txt.");
        }
        await this.throttle.waitFor(url.hostname);
        const payload = await this.fetcher.getText(endpoint, {
          signal,
          timeoutMs: 12000,
          retries: 0,
          headers: { Accept: "application/json,application/atom+xml,application/xml,text/html" },
        });
        const parsed = plugin.parseResults(payload);
        const candidates = (plugin.filterResults?.(parsed, cleanQuery) ?? parsed).slice(0, 50);
        const links = plugin.skipLinkValidation
          ? candidates
          : (await Promise.all(candidates.map((link) => this.validator.validate(link, signal))))
              .filter((link): link is ScrapedLink => link !== null);
        const status: SearchSourceStatus = {
          sourceName,
          status: links.length > 0 ? "success" : "empty",
          nextPageUrl: plugin.getNextPageUrl?.(payload) ?? null,
        };
        return { links, status };
      } catch (failure) {
        return {
          links: [] as ScrapedLink[],
          status: {
            sourceName,
            status: "error" as const,
            error: failure instanceof Error ? failure.message : "Falha desconhecida na fonte.",
          },
        };
      }
    }));

    const results = [...new Map(sourceResults.flatMap(({ links }) => links).map((item) => [item.url, item])).values()];
    await this.history.save({
      id: `search-${Date.now()}`,
      query: cleanQuery,
      resultsCount: results.length,
      searchedAt: Date.now(),
    }).catch(() => undefined);

    return { results, sources: sourceResults.map(({ status }) => status) };
  }
}
