import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { Bookmark } from "@/src/domain/repositories/BookmarkRepository";
import { parseReadingAnchor, ReadingAnchor } from "@/src/domain/types/readingAnchor";

export interface StudyBookmarkLocation { format: "kindle-study-bookmark"; version: 1; name: string; chapterTitle: string; anchor: ReadingAnchor }
export function encodeStudyLocation(value: StudyBookmarkLocation): string { return JSON.stringify({ ...value, anchor: parseReadingAnchor(value.anchor) }); }
export function readStudyLocation(bookmark: Bookmark): StudyBookmarkLocation | null {
  try {
    const value = JSON.parse(bookmark.cfiPosition ?? "null");
    if (value?.format !== "kindle-study-bookmark" || value.version !== 1 || typeof value.name !== "string" || typeof value.chapterTitle !== "string") return null;
    return { ...value, anchor: parseReadingAnchor(value.anchor) };
  } catch { return null; }
}
export function exportStudyBookmarks(book: LibraryBook, bookmarks: Bookmark[], format: "json" | "markdown" | "text"): string {
  if (format === "json") return JSON.stringify({ format: "kindle-study-bookmarks", version: 1, exportedAt: new Date().toISOString(), book: { id: book.id, title: book.title, author: book.author, fileHash: book.fileHash }, bookmarks }, null, 2);
  const escape = (v: string) => format === "markdown" ? v.replace(/[\\`*_{}\[\]<>#]/g, "\\$&") : v;
  return `${format === "markdown" ? "# " : ""}${escape(book.title)}\n${escape(book.author)}\n\n` + bookmarks.map(bookmark => {
    const location = readStudyLocation(bookmark);
    const reference = location?.anchor.kind === "pdf-page" ? `Página fonte do PDF: ${location.anchor.sourcePage}` : location ? `Capítulo: ${location.chapterTitle}` : "Localização antiga: retorno exato indisponível";
    return `${format === "markdown" ? "## " : ""}${escape(location?.name || "Marcador")}\n${escape(reference)}\n\n${format === "markdown" ? "> " : "Trecho: "}${escape(bookmark.textPreview).replace(/\n/g, format === "markdown" ? "\n> " : "\n")}\n\n${escape(bookmark.note ?? "")}\n`;
  }).join("\n---\n\n");
}
export function parseStudyBookmarksBackup(text: string, book: LibraryBook): Bookmark[] {
  if (text.length > 20_000_000) throw new Error("Backup de marcadores excede 20 MB.");
  let value: any; try { value = JSON.parse(text); } catch { throw new Error("JSON inválido."); }
  if (value?.format !== "kindle-study-bookmarks" || value.version !== 1 || value.book?.id !== book.id || !Array.isArray(value.bookmarks) || value.bookmarks.length > 10000) throw new Error("Backup incompatível ou de outro livro. A edição e o identificador devem corresponder.");
  if (value.book.fileHash && book.fileHash && value.book.fileHash !== book.fileHash) throw new Error("O arquivo pertence a outra edição. Não é seguro transferir localizações automaticamente.");
  const ids = new Set();
  return value.bookmarks.map((b: any) => {
    if (!b || typeof b.id !== "string" || !b.id || b.id.length > 2000 || ids.has(b.id) || b.bookId !== book.id || typeof b.chapterId !== "string" || typeof b.textPreview !== "string" || b.textPreview.length > 10000 || (b.cfiPosition !== null && (typeof b.cfiPosition !== "string" || b.cfiPosition.length > 100000)) || (b.note !== null && (typeof b.note !== "string" || b.note.length > 100000)) || !Number.isSafeInteger(b.createdAt) || b.createdAt < 0) throw new Error("Marcador inválido ou duplicado.");
    ids.add(b.id);
    const bookmark: Bookmark = { id: b.id, bookId: b.bookId, chapterId: b.chapterId, cfiPosition: b.cfiPosition, textPreview: b.textPreview, note: b.note, createdAt: b.createdAt };
    const location = readStudyLocation(bookmark);
    if (!location) {
      let raw: any; try { raw = JSON.parse(bookmark.cfiPosition ?? "null"); } catch { /* Legacy CFI is preserved without executing it. */ }
      if (raw?.format === "kindle-study-bookmark") throw new Error("Localização de marcador inválida.");
      return bookmark;
    }
    if (!location.name.trim() || location.name.length > 200 || location.chapterTitle.length > 2000 || (location.anchor.kind === "epub-text" && (location.anchor.chapterId !== bookmark.chapterId || location.anchor.quote !== bookmark.textPreview))) throw new Error("Localização, trecho ou nome de marcador inválido.");
    bookmark.cfiPosition = encodeStudyLocation(location);
    return bookmark;
  });
}
