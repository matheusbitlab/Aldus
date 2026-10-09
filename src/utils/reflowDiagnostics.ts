// Opt-in operation trace. No document contents, PDF URI, or raw exception text.
const enabled = process.env.EXPO_PUBLIC_REFLOW_DIAGNOSTICS === "1";
export function reflowDiagnostic(event: string, fields: { operationId?: number; phase?: string; pageNumber?: number; engine?: string; error?: unknown; file?: unknown; line?: unknown; column?: unknown } = {}) {
  if (!enabled) return;
  const clean: Record<string, unknown> = { event, at: Date.now() };
  for (const key of ["operationId", "pageNumber", "line", "column"] as const) {
    const value = fields[key]; if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
  }
  if (fields.phase && /^[a-zA-Z-]{1,32}$/.test(fields.phase)) clean.phase = fields.phase;
  if (fields.engine && /^[\w/. -]{1,80}$/.test(fields.engine)) clean.engine = fields.engine;
  // Keep executable basename and location; discard paths, URL queries and fragments.
  const location = (value: unknown) => typeof value === "string" ? value.split(/[?#]/)[0].split(/[\\/]/).at(-1)?.replace(/[^\w.(): -]/g, "").slice(0, 160) : undefined;
  clean.file = location(fields.file);
  const error = fields.error as { name?: unknown; message?: unknown; stack?: unknown } | undefined;
  if (typeof error?.name === "string" && /^\w{1,40}$/.test(error.name)) clean.errorName = error.name;
  clean.bytecodeReference = typeof error?.message === "string" && /bytecode is not defined/i.test(error.message);
  if (typeof error?.stack === "string") clean.stackLocations = error.stack.split("\n").slice(1, 9).map(location);
  console.info("[ReflowDiagnostic]", JSON.stringify(clean));
}
