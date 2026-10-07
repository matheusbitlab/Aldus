import { Highlight } from "@/src/domain/repositories/HighlightRepository";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { parseReadingAnchor, TextReadingAnchor } from "@/src/domain/types/readingAnchor";
export interface StudyHighlightLocation { format: "kindle-study-highlight"; version: 1; anchor: TextReadingAnchor; chapterTitle: string; note: string }
export function readHighlightLocation(highlight: Highlight): StudyHighlightLocation | null {
  try {
    const value = JSON.parse(highlight.startCfi);
    if (value?.format !== "kindle-study-highlight" || value.version !== 1 || typeof value.note !== "string" || typeof value.chapterTitle !== "string") return null;
    const anchor = parseReadingAnchor(value.anchor);
    if (anchor.kind !== "epub-text") return null;
    return { format: "kindle-study-highlight", version: 1, anchor, note: value.note, chapterTitle: value.chapterTitle };
  } catch { return null; }
}
export function exportStudyHighlights(book: LibraryBook, highlights: Highlight[], format: "json" | "markdown" | "text"): string {
  if (format === "json") return JSON.stringify({ format: "kindle-study-highlights", version: 1, book: { id: book.id, title: book.title, author: book.author, fileHash: book.fileHash }, highlights }, null, 2);
  const escape = (v: string) => format === "markdown" ? v.replace(/[\\`*_{}\[\]<>#]/g, "\\$&") : v;
  return `${format === "markdown" ? "# " : ""}${escape(book.title)}\n${escape(book.author)}\n\n` + highlights.map(h => {
    const location = readHighlightLocation(h);
    return `${format === "markdown" ? "## " : ""}${escape(location?.chapterTitle ?? "Localização antiga indisponível")}\nCor: ${h.colorLabel}\n\n${format === "markdown" ? "> " : "Trecho: "}${escape(h.highlightedText).replace(/\n/g, format === "markdown" ? "\n> " : "\n")}\n\n${escape(location?.note ?? "")}\n`;
  }).join("\n---\n\n");
}
export function parseStudyHighlightsBackup(text: string, book: LibraryBook): Highlight[] {
  if (text.length > 20_000_000) throw new Error("Backup de grifos excede 20 MB.");
  let value: any; try { value = JSON.parse(text); } catch { throw new Error("JSON inválido."); }
  if (value?.format !== "kindle-study-highlights" || value.version !== 1 || value.book?.id !== book.id || !Array.isArray(value.highlights) || value.highlights.length > 10000 || (value.book.fileHash && book.fileHash && value.book.fileHash !== book.fileHash)) throw new Error("Backup incompatível ou de outra edição/livro.");
  const ids = new Set();
  return value.highlights.map((h: any) => {
    if (!h || typeof h.id !== "string" || !h.id || h.id.length > 2000 || ids.has(h.id) || h.bookId !== book.id || typeof h.chapterId !== "string" || typeof h.highlightedText !== "string" || !h.highlightedText.trim() || h.highlightedText.length > 10000 || typeof h.startCfi !== "string" || h.startCfi.length > 200000 || typeof h.endCfi !== "string" || h.endCfi.length > 200000 || !["yellow", "green", "blue", "pink", "purple"].includes(h.colorLabel) || !Number.isSafeInteger(h.createdAt) || h.createdAt < 0) throw new Error("Grifo inválido ou duplicado.");
    const result: Highlight = { id: h.id, bookId: h.bookId, chapterId: h.chapterId, startCfi: h.startCfi, endCfi: h.endCfi, highlightedText: h.highlightedText, colorLabel: h.colorLabel, createdAt: h.createdAt };
    const location = readHighlightLocation(result);
    if (!location) {
      let raw: any; try { raw = JSON.parse(result.startCfi); } catch { /* Preserve legacy CFI without interpreting it. */ }
      if (raw?.format === "kindle-study-highlight") throw new Error("Localização do grifo inválida.");
      ids.add(h.id); return result;
    }
    if (location.note.length > 100000 || location.chapterTitle.length > 2000 || location.anchor.chapterId !== result.chapterId || location.anchor.quote !== result.highlightedText) throw new Error("Localização do grifo inválida.");
    ids.add(h.id); return result;
  });
}
