import type { SourceOperationContext, SourceOperationPhase, SourceOperationProgress } from "@/src/domain/types/sourceCatalog";

let sequence = 0;
const started = new Map<string, number>();
const correlationPattern = /^(?:source|drive)-[a-z0-9]+-\d+$/;
const phases: SourceOperationPhase[] = ["preparing", "authorizing", "verifying", "indexing", "organizing", "saving", "success", "error", "cancelled"];
const codes = new Set(["disconnected", "expired", "cancelled", "popup-blocked", "auth-denied", "api-disabled", "permission", "not-found", "rate-limit", "network", "api", "invalid-folder", "unsupported", "configuration", "busy"]);
export function sourceOperationId(): string { return `source-${Date.now().toString(36)}-${++sequence}`; }
export function sourceOperationContext(context?: SourceOperationContext): SourceOperationContext {
  const result = context ?? { operationId: sourceOperationId() };
  if (correlationPattern.test(result.operationId) && !started.has(result.operationId)) {
    if (started.size >= 256) started.delete(started.keys().next().value!);
    started.set(result.operationId, Date.now());
  }
  return result;
}
export function sourceOperationErrorCode(error: unknown): string {
  if ((error as { name?: unknown } | null)?.name === "AbortError") return "cancelled";
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && codes.has(code) ? code : "unknown";
}
/** Strict allowlist. Names, source/folder IDs, URLs, provider messages and tokens cannot enter the trace. */
export function sourceProgress(context: SourceOperationContext | undefined, phase: SourceOperationPhase,
  counts: Partial<Pick<SourceOperationProgress, "booksFound" | "foldersScanned" | "foldersDiscovered">> = {}, code?: string): SourceOperationProgress | undefined {
  if (!context || !phases.includes(phase)) return;
  sourceOperationContext(context);
  const progress: SourceOperationProgress = { operationId: context.operationId, phase };
  for (const key of ["booksFound", "foldersScanned", "foldersDiscovered"] as const) {
    const value = counts[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) progress[key] = value;
  }
  try { context.onProgress?.({ ...progress }); } catch { /* Observability cannot interrupt a source operation. */ }
  if (process.env.EXPO_PUBLIC_SOURCE_DIAGNOSTICS !== "1" && process.env.EXPO_PUBLIC_DRIVE_DIAGNOSTICS !== "1" && process.env.EXPO_PUBLIC_AUTH_DIAGNOSTICS !== "1") return progress;
  if (!correlationPattern.test(context.operationId)) return progress;
  const now = Date.now();
  const entry = { ...progress, flow: "SOURCE", at: new Date(now).toISOString(), elapsedMs: Math.max(0, now - (started.get(context.operationId) ?? now)),
    ...(code ? { code: codes.has(code) || code === "unknown" ? code : "unknown" } : {}) };
  try { console.info("[SourceDiagnostic]", JSON.stringify(entry)); } catch { /* Diagnostics never affect application state. */ }
  return progress;
}
