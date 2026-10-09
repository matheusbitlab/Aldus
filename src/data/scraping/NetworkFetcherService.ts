import { NetworkError } from "@/src/core/errors/AppError";
import { withAbort, cancellableWait } from "@/src/core/utils/cancellation";
export interface FetchOptions { signal?: AbortSignal; timeoutMs?: number; retries?: number; headers?: Record<string, string>; onStage?: (stage: "fetch" | "response" | "body" | "consumed") => void; }
export class NetworkFetcherService {
  getText(url: string, options: FetchOptions = {}): Promise<string> {
    return this.perform(url, options, (response) => response.text());
  }
  request(url: string, options: FetchOptions & { method?: string } = {}): Promise<Response> {
    return this.perform(url, options, async (response) => response);
  }
  private async perform<T>(url: string, options: FetchOptions & { method?: string }, consume: (response: Response) => Promise<T>): Promise<T> {
    const retries = options.retries ?? 2;
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (options.signal?.aborted) throw new NetworkError("Operação cancelada.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
      const onAbort = () => controller.abort();
      options.signal?.addEventListener("abort", onAbort, { once: true });
      if (options.signal?.aborted) onAbort();
      try {
        options.onStage?.("fetch");
        const response = await withAbort(fetch(url, {
          method: options.method ?? "GET",
          headers: { Accept: "text/html,application/xhtml+xml,application/epub+zip,application/octet-stream", ...options.headers },
          signal: controller.signal,
        }), controller.signal);
        options.onStage?.("response");
        if (!response.ok) throw new NetworkError(`HTTP ${response.status}`, response.status);
        // Keep timeout/cancellation active while consuming the response body.
        options.onStage?.("body");
        const consumed = await withAbort(consume(response), controller.signal);
        options.onStage?.("consumed");
        return consumed;
      } catch (error) {
        lastError = error;
        if (options.signal?.aborted) throw new NetworkError("Operação cancelada.", undefined, error);
        if (attempt < retries && (!(error instanceof NetworkError) || !error.status || error.status >= 500)) {
          await cancellableWait(2 ** attempt * 1000, options.signal);
        } else break;
      } finally {
        clearTimeout(timeout);
        options.signal?.removeEventListener("abort", onAbort);
      }
    }
    throw new NetworkError("Não foi possível acessar a fonte. Confira a conexão e, na Web, o suporte a CORS.", undefined, lastError);
  }
}
