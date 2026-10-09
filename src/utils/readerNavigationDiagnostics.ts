export const READER_NAVIGATION_ORIGINS = ["SLIDER_PREVIEW", "SLIDER_COMMIT", "NEXT_PAGE", "PREVIOUS_PAGE", "TOUCH_ZONE", "RESTORE", "LAYOUT_RECALC", "VIEWER_CONFIRMATION", "TRANSITION_END", "RESIZE", "SETTINGS_LAYOUT", "CONTROLS_TOGGLE", "CONTENTS", "SEARCH"] as const;
export type ReaderNavigationOrigin = typeof READER_NAVIGATION_ORIGINS[number];
const enabled = process.env.EXPO_PUBLIC_READER_NAVIGATION_DIAGNOSTICS === "1";
const started = performance.now();
export function readerNavigationDiagnostic(origin: ReaderNavigationOrigin, details: Record<string, unknown>) {
  if (!enabled || !READER_NAVIGATION_ORIGINS.includes(origin)) return;
  const record: Record<string, unknown> = { origin, elapsedMs: performance.now() - started };
  for (const field of ["operationId", "requestedPage", "confirmedPage", "currentPage", "targetPage", "totalPages", "viewerElapsedMs"]) {
    if (typeof details[field] === "number" && Number.isFinite(details[field])) record[field] = details[field];
  }
  for (const field of ["sliderDragging", "controlsVisible"]) if (typeof details[field] === "boolean") record[field] = details[field];
  console.info("[ReaderNavigationDiagnostic]", JSON.stringify(record));
}
