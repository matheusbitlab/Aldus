export class ThrottleQueue {
  private readonly lastRequest = new Map<string, number>();
  private readonly pending = new Map<string, Promise<void>>();
  constructor(private readonly intervalMs = 2000) {}
  async waitFor(domain: string): Promise<void> { const previous = this.pending.get(domain) ?? Promise.resolve(); const next = previous.then(async () => { const elapsed = Date.now() - (this.lastRequest.get(domain) ?? 0); if (elapsed < this.intervalMs) await new Promise((resolve) => setTimeout(resolve, this.intervalMs - elapsed)); this.lastRequest.set(domain, Date.now()); }); this.pending.set(domain, next.catch(() => undefined)); await next; }
}
