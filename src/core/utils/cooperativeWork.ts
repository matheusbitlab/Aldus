import { throwIfAborted } from "./cancellation";

/** CPU work crosses a host-task boundary, not RN's microtask-backed setImmediate. */
export async function runCooperatively<T>(steps: Generator<unknown, T>, signal?: AbortSignal): Promise<T> {
  try {
    await yieldToHost(signal);
    let deadline = Date.now() + 8;
    for (;;) {
      throwIfAborted(signal);
      const next = steps.next();
      if (next.done) return next.value;
      if (Date.now() >= deadline) {
        await yieldToHost(signal);
        deadline = Date.now() + 8;
      }
    }
  } finally { steps.return(undefined as never); }
}

export function yieldToHost(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let release = () => {};
    const cleanup = () => { release(); signal?.removeEventListener("abort", abort); };
    const finish = () => { cleanup(); resolve(); };
    const abort = () => { cleanup(); try { throwIfAborted(signal); } catch (error) { reject(error); } };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(finish, { timeout: 50 });
      release = () => { if (typeof cancelIdleCallback === "function") cancelIdleCallback(id); };
    } else {
      // Scheduling CPU slices, not delaying/retrying an operation to hide a stall.
      const id = setTimeout(finish, 0);
      release = () => clearTimeout(id);
    }
  });
}
