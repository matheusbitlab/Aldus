import { ScrapedLink } from "@/src/domain/types/search";
import { NetworkFetcherService } from "@/src/data/scraping/NetworkFetcherService";
export class LinkValidatorService {
  constructor(private readonly fetcher: NetworkFetcherService) {}
  async validate(link: ScrapedLink, signal?: AbortSignal): Promise<ScrapedLink | null> { try { const response = await this.fetcher.request(link.url, { method: "HEAD", retries: 1, timeoutMs: 10000, signal }); const type = (response.headers.get("content-type") ?? "").toLowerCase(); const length = Number(response.headers.get("content-length") ?? 0); const accepted = link.format === "epub" ? type.includes("epub") || type.includes("zip") || type.includes("octet-stream") : link.format === "mobi" ? type.includes("octet-stream") || type.includes("mobi") : true; if (!accepted || (length > 0 && length < 100 * 1024)) return null; return { ...link, estimatedSize: length || link.estimatedSize }; } catch { return null; } }
}
