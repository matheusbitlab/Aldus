import { cancellableWait, throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
export class ThrottleQueue {
  private readonly lastRequest = new Map<string, number>();
  private readonly pending = new Map<string, Promise<void>>();
  constructor(private readonly intervalMs = 2000) {}
  async waitFor(domain: string, signal?: AbortSignal): Promise<void> {
    const previous = this.pending.get(domain) ?? Promise.resolve();
    const next = previous.then(async () => {
      throwIfAborted(signal);
      const elapsed = Date.now() - (this.lastRequest.get(domain) ?? 0);
      if (elapsed < this.intervalMs) await cancellableWait(this.intervalMs - elapsed, signal);
      throwIfAborted(signal);
      this.lastRequest.set(domain, Date.now());
    });
    const tail = next.catch(() => undefined);
    this.pending.set(domain, tail);
    void tail.then(() => { if (this.pending.get(domain) === tail) this.pending.delete(domain); });
    await withAbort(next, signal);
  }
}
