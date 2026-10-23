import { parseReadingAnchor, TextReadingAnchor } from "./readingAnchor";

/** Versioned location in the existing progress.cfiPosition field; never an EPUB CFI. */
export interface ReaderLocation { format: "aldus-reader-location"; version: 1; mode: "epub" | "pdf-reflow"; anchor: TextReadingAnchor }
export function encodeReaderLocation(mode: ReaderLocation["mode"], value: unknown): string {
  const anchor = parseReadingAnchor(value);
  if (anchor.kind !== "epub-text") throw new Error("A posição de leitura precisa de uma âncora textual.");
  return JSON.stringify({ format: "aldus-reader-location", version: 1, mode, anchor } satisfies ReaderLocation);
}
export function decodeReaderLocation(value: string | null | undefined, mode: ReaderLocation["mode"]): TextReadingAnchor | null {
  if (!value || value.length > 20000) return null;
  try {
    const item = JSON.parse(value);
    if (item.format !== "aldus-reader-location" || item.version !== 1 || item.mode !== mode) return null;
    const anchor = parseReadingAnchor(item.anchor);
    return anchor.kind === "epub-text" ? anchor : null;
  } catch { return null; }
}
