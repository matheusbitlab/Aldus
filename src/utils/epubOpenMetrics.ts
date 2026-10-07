type MetricDetails = Record<string, string | number | boolean | null | undefined>;

interface EpubOpenEvent {
  event: string;
  sinceClickMs: number;
  durationMs?: number;
  details?: MetricDetails;
}

interface EpubOpenTrace {
  bookId: string;
  startedAt: number;
  events: EpubOpenEvent[];
  finished: boolean;
}

let activeTrace: EpubOpenTrace | null = null;
let libraryReadyAt: number | null = null;

function epubResetDiagnosticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("epubCenterResetDiagnostics") === "1";
  } catch {
    return false;
  }
}

export const epubDiagnosticConsole = {
  log(...args: Parameters<Console["log"]>): void {
    if (epubResetDiagnosticsEnabled()) globalThis.console.log(...args);
  },
};

function metricsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const queryEnabled = typeof window.location?.search === "string" &&
    new URLSearchParams(window.location.search).get("epubMetrics") === "1";
  if (queryEnabled) return true;
  try {
    return window.sessionStorage.getItem("epubOpenMetrics") === "1";
  } catch {
    return false;
  }
}

export function startEpubOpenTrace(bookId: string, details: MetricDetails = {}): void {
  if (!metricsEnabled()) {
    activeTrace = null;
    return;
  }
  try {
    window.sessionStorage.setItem("epubOpenMetrics", "1");
  } catch {
    /* The opt-in query parameter still enables this trace. */
  }

  activeTrace = {
    bookId,
    startedAt: performance.now(),
    events: [],
    finished: false,
  };
  markEpubOpenEvent("library_click", {
    ...details,
    libraryReadyToClickMs:
      libraryReadyAt === null ? null : activeTrace.startedAt - libraryReadyAt,
  });
}

export function markEpubLibraryReady(): void {
  if (!metricsEnabled()) return;
  libraryReadyAt = performance.now();
}

export function hasActiveEpubOpenTrace(bookId?: string): boolean {
  return Boolean(
    activeTrace &&
      !activeTrace.finished &&
      metricsEnabled() &&
      (bookId === undefined || activeTrace.bookId === bookId)
  );
}

export function markEpubOpenEvent(
  event: string,
  details?: MetricDetails,
  durationMs?: number
): void {
  if (!activeTrace || activeTrace.finished || !metricsEnabled()) return;

  const entry: EpubOpenEvent = {
    event,
    sinceClickMs: performance.now() - activeTrace.startedAt,
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(details ? { details } : {}),
  };
  activeTrace.events.push(entry);

  if (event === "first_page_state_received") {
    activeTrace.finished = true;
    const summary = {
      bookId: activeTrace.bookId,
      totalToFirstPageStateMs: entry.sinceClickMs,
      events: activeTrace.events,
      note: "O estado da primeira página chegou ao Reader; o instante de pintura dos pixels não é observável exatamente por esta API.",
    };
    const report = () => {
      console.info("[EPUB_OPEN_METRIC_SUMMARY]", {
        bookId: summary.bookId,
        totalToFirstPageStateMs: summary.totalToFirstPageStateMs,
        note: summary.note,
      });
      console.table(summary.events);
    };
    const requestIdle = (window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
    }).requestIdleCallback;
    if (requestIdle) requestIdle(report);
    else requestAnimationFrame(() => requestAnimationFrame(report));
  }
}

export function markEpubOpenSpanStart(
  name: string,
  details?: MetricDetails
): number | null {
  if (!hasActiveEpubOpenTrace()) return null;
  const startedAt = performance.now();
  markEpubOpenEvent(`${name}_start`, details);
  return startedAt;
}

export function markEpubOpenSpanEnd(
  name: string,
  startedAt: number | null,
  details?: MetricDetails
): void {
  if (startedAt === null) return;
  markEpubOpenEvent(`${name}_end`, details, performance.now() - startedAt);
}
