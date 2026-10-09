export type ReaderUiContext = { mode: "epub" | "original" | "reflow"; controlsVisible: boolean; reflowPreparing: boolean; feedback: boolean };
const enabled = process.env.EXPO_PUBLIC_READER_UI_DIAGNOSTICS === "1";
export function readerUiDiagnostic(event: "LAYOUT" | "PRESS", role: string, context?: ReaderUiContext, layout?: { x: number; y: number; width: number; height: number }, geometry?: { pointerEvents?: string; zIndex?: number; elevation?: number; overflow?: string }) {
  if (!enabled) return;
  const bounds = layout && Object.fromEntries(Object.entries(layout).filter(([k,v]) => ["x","y","width","height"].includes(k) && Number.isFinite(v)));
  console.info("[ReaderUiDiagnostic]", JSON.stringify({ event, role, at: Date.now(), ...context, bounds, ...geometry }));
}
