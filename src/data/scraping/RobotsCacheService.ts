import { NetworkFetcherService } from "@/src/data/scraping/NetworkFetcherService";
export class RobotsCacheService {
  private readonly cache = new Map<string, { fetchedAt: number; disallowAll: boolean }>();
  constructor(private readonly fetcher: NetworkFetcherService, private readonly ttlMs = 3600000) {}
  async canFetch(url: string): Promise<boolean> { const origin = new URL(url).origin; const cached = this.cache.get(origin); if (!cached || Date.now() - cached.fetchedAt > this.ttlMs) { try { const text = await this.fetcher.getText(`${origin}/robots.txt`, { timeoutMs: 5000, retries: 0 }); const disallowAll = /user-agent:\s*\*/i.test(text) && /disallow:\s*\/\s*(?:\r?\n|$)/i.test(text); this.cache.set(origin, { fetchedAt: Date.now(), disallowAll }); } catch { this.cache.set(origin, { fetchedAt: Date.now(), disallowAll: false }); } } return !this.cache.get(origin)!.disallowAll; }
}
