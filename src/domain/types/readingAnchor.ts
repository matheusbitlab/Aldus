/** Offsets refer to chapter text nodes, excluding scripts/styles; page numbers are hints only. */
export interface TextReadingAnchor {
  version: 1;
  kind: "epub-text";
  chapterId: string;
  start: number;
  end: number;
  quote: string;
  prefix: string;
  suffix: string;
  path: number[];
}
export interface PdfReadingAnchor { version: 1; kind: "pdf-page"; sourcePage: number }
export type ReadingAnchor = TextReadingAnchor | PdfReadingAnchor;
export type AnchorResolution = { status: "exact" | "relocated"; start: number; end: number } | { status: "ambiguous" | "missing" };

/** No approximate matching: ambiguous notes remain recoverable rather than moved silently. */
export function resolveTextAnchor(text: string, anchor: TextReadingAnchor): AnchorResolution {
  const fits = (start: number) => text.slice(start, start + anchor.quote.length) === anchor.quote &&
    (!anchor.prefix || text.slice(Math.max(0, start - anchor.prefix.length), start) === anchor.prefix) &&
    (!anchor.suffix || text.slice(start + anchor.quote.length, start + anchor.quote.length + anchor.suffix.length) === anchor.suffix);
  const matches: number[] = [];
  if (!anchor.quote) return { status: "missing" };
  let offset = text.indexOf(anchor.quote);
  while (offset !== -1) {
    if (fits(offset)) matches.push(offset);
    if (matches.length > 1) return { status: "ambiguous" };
    offset = text.indexOf(anchor.quote, offset + 1);
  }
  if (!matches.length) return { status: "missing" };
  const start = matches[0];
  return { status: start === anchor.start ? "exact" : "relocated", start, end: start + anchor.quote.length };
}
export function parseReadingAnchor(value: unknown): ReadingAnchor {
  if (!value || typeof value !== "object") throw new Error("Localização inválida.");
  const a = value as any;
  if (a.version !== 1) throw new Error("Versão de localização não suportada.");
  if (a.kind === "pdf-page") {
    if (!Number.isSafeInteger(a.sourcePage) || a.sourcePage < 1 || a.sourcePage > 1000000) throw new Error("Página fonte inválida.");
    return { version: 1, kind: "pdf-page", sourcePage: a.sourcePage };
  }
  if (a.kind !== "epub-text" || typeof a.chapterId !== "string" || !a.chapterId || a.chapterId.length > 2000 ||
      !Number.isSafeInteger(a.start) || a.start < 0 || !Number.isSafeInteger(a.end) || a.end <= a.start ||
      typeof a.quote !== "string" || !a.quote.trim() || a.quote.length > 10000 || a.end - a.start !== a.quote.length ||
      typeof a.prefix !== "string" || a.prefix.length > 128 || typeof a.suffix !== "string" || a.suffix.length > 128 ||
      !Array.isArray(a.path) || a.path.length > 100 || a.path.some((v: unknown) => !Number.isSafeInteger(v) || (v as number) < 0)) throw new Error("Localização textual inválida.");
  return { version: 1, kind: "epub-text", chapterId: a.chapterId, start: a.start, end: a.end, quote: a.quote, prefix: a.prefix, suffix: a.suffix, path: a.path };
}
