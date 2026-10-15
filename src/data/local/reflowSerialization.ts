import { runCooperatively } from "@/src/core/utils/cooperativeWork";

/** Plain cache records only. Escape bounded strings instead of one giant stringify. */
export async function serializeReflowCache(document: object, signal?: AbortSignal): Promise<string> {
  const pieces: string[] = [];
  await runCooperatively(jsonSteps(document, pieces), signal);
  return pieces.join(""); // One flat value is required by the existing SQLite TEXT column.
}

function* jsonSteps(value: unknown, out: string[]): Generator<void, void> {
  yield;
  if (typeof value === "string") {
    out.push('"');
    for (let start = 0; start < value.length;) {
      let end = Math.min(start + 16384, value.length);
      if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1]) && /[\uDC00-\uDFFF]/.test(value[end])) end--;
      out.push(JSON.stringify(value.slice(start, end)).slice(1, -1));
      start = end; yield;
    }
    out.push('"');
  } else if (value === null || typeof value === "number" || typeof value === "boolean") {
    out.push(JSON.stringify(value));
  } else if (Array.isArray(value)) {
    out.push("[");
    for (let i = 0; i < value.length; i++) {
      if (i) out.push(",");
      yield* jsonSteps(value[i] === undefined ? null : value[i], out);
    }
    out.push("]");
  } else if (typeof value === "object") {
    out.push("{"); let first = true;
    for (const key of Object.keys(value)) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) continue;
      if (!first) out.push(","); first = false;
      yield* jsonSteps(key, out); out.push(":"); yield* jsonSteps(item, out);
    }
    out.push("}");
  } else throw new Error("Cache Reflow contém valor não serializável.");
}
