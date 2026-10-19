type Stage = 'sqlite_read' | 'deserialize' | 'serialize' | 'sqlite_write' | 'catalog_validation' | 'search_index' | 'sort' | 'search' | 'tree' | 'initial_frame' | 'cover';
const enabled = process.env.EXPO_PUBLIC_SOURCE_PERF_DIAGNOSTICS === '1';
let sequence = 0;
export function sourcePerformance(stage: Stage, started: number, items: number | null): void {
  if (!enabled) return;
  try {
    console.info('[SourcePerformance]', JSON.stringify({ operationId: `source-perf-${++sequence}`, stage,
      at: new Date().toISOString(), durationMs: Math.round((performance.now() - started) * 10) / 10,
      items: typeof items === 'number' && Number.isSafeInteger(items) && items >= 0 ? items : null }));
  } catch { /* Metrics never affect a library operation. No source names/IDs/URLs/content. */ }
}
export function measureSource<T>(stage: Stage, items: number, work: () => T): T {
  if (!enabled) return work();
  const started = performance.now(); try { return work(); } finally { sourcePerformance(stage, started, items); }
}
