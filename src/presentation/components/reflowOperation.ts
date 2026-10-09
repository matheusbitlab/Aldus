// One terminal transition per generation. Abort also releases pending continuations.
export function createReflowOperation() {
  const controller = new AbortController();
  let terminal = false;
  return {
    signal: controller.signal,
    get active() { return !terminal; },
    finish() { if (terminal) return false; terminal = true; controller.abort(); return true; },
  };
}
