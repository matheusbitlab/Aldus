import { SearchPlugin, ScrapedLink } from "@/src/domain/types/search";
import { SearchHistoryRepository } from "@/src/domain/repositories/SearchHistoryRepository";
import { NetworkFetcherService } from "@/src/data/scraping/NetworkFetcherService";
import { RobotsCacheService } from "@/src/data/scraping/RobotsCacheService";
import { ThrottleQueue } from "@/src/data/scraping/ThrottleQueue";
import { LinkValidatorService } from "@/src/data/scraping/LinkValidatorService";

export class SearchBooksUseCase {
  constructor(private readonly plugins: SearchPlugin[], private readonly fetcher: NetworkFetcherService, private readonly robots: RobotsCacheService, private readonly throttle: ThrottleQueue, private readonly validator: LinkValidatorService, private readonly history: SearchHistoryRepository) {}
  async execute(query: string, signal?: AbortSignal): Promise<ScrapedLink[]> { const cleanQuery = query.trim().replace(/[<>"']/g, ""); if (!cleanQuery) return []; const results: ScrapedLink[] = []; for (const plugin of this.plugins) { try { const endpoint = plugin.getSearchEndpoint(cleanQuery); const url = new URL(endpoint); if (!(await this.robots.canFetch(endpoint))) continue; await this.throttle.waitFor(url.hostname); const html = await this.fetcher.getText(endpoint, { signal }); const links = plugin.parseResults(html); for (const link of links.slice(0, 20)) { const valid = await this.validator.validate(link, signal); if (valid) results.push(valid); } } catch { continue; } } const unique = [...new Map(results.map((item) => [item.url, item])).values()]; await this.history.save({ id: `search-${Date.now()}`, query: cleanQuery, resultsCount: unique.length, searchedAt: Date.now() }); return unique; }
}
