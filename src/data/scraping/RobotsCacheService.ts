import { NetworkFetcherService } from "@/src/data/scraping/NetworkFetcherService";
import { throwIfAborted } from "@/src/core/utils/cancellation";
export class RobotsCacheService {
  private readonly cache = new Map<string, { fetchedAt: number; disallowAll: boolean }>();
  constructor(private readonly fetcher: NetworkFetcherService, private readonly ttlMs = 3600000) {}
  async canFetch(url: string, signal?: AbortSignal): Promise<boolean> {
    throwIfAborted(signal);
    const target = new URL(url);
    if (
      target.hostname === "www.gutenberg.org" &&
      target.pathname.startsWith("/ebooks/search")
    ) return false;
    if (target.hostname === "gutendex.com" && target.pathname === "/books/") return true;

    if (typeof window !== "undefined") return true;

    const origin = target.origin;
    const cached = this.cache.get(origin);
    if (!cached || Date.now() - cached.fetchedAt > this.ttlMs) {
      try {
        const text = await this.fetcher.getText(`${origin}/robots.txt`, { timeoutMs: 5000, retries: 0, signal });
        const disallowAll = /user-agent:\s*\*/i.test(text) && /disallow:\s*\/\s*(?:\r?\n|$)/i.test(text);
        this.cache.set(origin, { fetchedAt: Date.now(), disallowAll });
      } catch {
        throwIfAborted(signal);
        this.cache.set(origin, { fetchedAt: Date.now(), disallowAll: false });
      }
    }
    return !this.cache.get(origin)!.disallowAll;
  }
}
