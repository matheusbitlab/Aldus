export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) { const error = new Error("Operação cancelada."); error.name = "AbortError"; throw error; }
}

/** Complete the caller on cancellation, even if the underlying API cannot cancel. */
export function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const abort = () => { try { throwIfAborted(signal); } catch (error) { reject(error); } };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    if (signal.aborted) { signal.removeEventListener("abort", abort); abort(); }
  });
}

export function cancellableWait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => { signal?.removeEventListener("abort", abort); resolve(); };
    const timer = setTimeout(finish, milliseconds);
    const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); try { throwIfAborted(signal); } catch (error) { reject(error); } };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}
