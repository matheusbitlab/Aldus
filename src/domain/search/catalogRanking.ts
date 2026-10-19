import { ScrapedLink } from "@/src/domain/types/search";
import { cancellableWait, throwIfAborted } from "@/src/core/utils/cancellation";

const stopWords = new Set("a o as os um uma uns umas de do da dos das e em no na nos nas por para the an of and by to in".split(" "));
const authorSpellings: Record<string, string> = { dostoievski: "dostoyevsky", dostoievsky: "dostoyevsky", dostoevsky: "dostoyevsky", dostoevski: "dostoyevsky", dostojevski: "dostoyevsky", dostoievskij: "dostoyevsky" };
export function normalizeCatalogText(value: string): string {
  return value.replace(/\.(?:pdf|epub)\s*$/i, "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
export function catalogTokens(value: string): string[] {
  return [...new Set(normalizeCatalogText(value).split(" ").filter(word => word && !stopWords.has(word)).map(word => authorSpellings[word] ?? word))];
}
const matches = (needle: string, words: string[]) => words.some(word => word === needle || needle.length >= 3 && word.startsWith(needle));
function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i=0,j=0,edits=0;
  while (i<a.length && j<b.length) {
    if (a[i]===b[j]) { i++; j++; continue; }
    if (++edits>1) return false;
    if (a.length === b.length && a[i] === b[j+1] && a[i+1] === b[j]) { i+=2; j+=2; continue; }
    if (a.length>=b.length) i++;
    if (b.length>=a.length) j++;
  }
  return edits + (i<a.length || j<b.length ? 1 : 0) <= 1;
}
function prepareCatalogBook(book: ScrapedLink) {
  const title = catalogTokens(book.title), author = catalogTokens(book.author ?? "");
  return { title, words: [...title, ...author], subjects: catalogTokens((book.subjects ?? []).join(" ")) };
}
function scorePreparedBook(book: ReturnType<typeof prepareCatalogBook>, terms: string[]): number {
  if (!terms.length || terms.every(term => term.length < 2)) return 0;
  const { title, words, subjects } = book;
  if (terms.join(" ") === title.join(" ")) return 500;
  if (terms.every(term => matches(term, title))) return 400 + terms.length / Math.max(1,title.length);
  const exact = terms.filter(term => matches(term, words));
  if (exact.length === terms.length) return 300 + terms.length / Math.max(1,words.length);
  if (terms.every(term => matches(term, [...words, ...subjects]))) return 150;
  const missing = terms.filter(term => !matches(term,words));
  if (missing.length === 1 && (exact.length > 0 || terms.length === 1 && missing[0].length >= 6) && missing[0].length >= 4 && words.some(word => word.length >= 4 && word[0] === missing[0][0] && oneEdit(missing[0],word))) return 100;
  return 0;
}
export function scoreCatalogBook(book: ScrapedLink, query: string): number { return scorePreparedBook(prepareCatalogBook(book), catalogTokens(query)); }
/** Same scoring rules, with book tokens prepared once per immutable snapshot. */
type CatalogRow<T extends ScrapedLink> = { book: T; index: number; prepared: ReturnType<typeof prepareCatalogBook> };
function preparedCatalogIndex<T extends ScrapedLink>(rows: CatalogRow<T>[]) {
  const finish = (matches: (CatalogRow<T> & {score: number})[], tieBreak?: (a: T, b: T) => number) =>
    matches.sort((a, b) => b.score - a.score || (tieBreak?.(a.book, b.book) ?? 0) || a.index - b.index).map(row => row.book);
  return {
    search(query: string, tieBreak?: (a: T, b: T) => number): T[] {
      const terms = catalogTokens(query);
      return finish(rows.map(row => ({ ...row, score: scorePreparedBook(row.prepared, terms) })).filter(row => row.score > 0), tieBreak);
    },
    async searchAsync(query: string, tieBreak?: (a: T, b: T) => number, signal?: AbortSignal): Promise<T[]> {
      const terms = catalogTokens(query), matches: (CatalogRow<T> & {score: number})[] = [];
      for (let index = 0; index < rows.length; index++) {
        throwIfAborted(signal);
        const row = rows[index], score = scorePreparedBook(row.prepared, terms);
        if (score > 0) matches.push({ ...row, score });
        if (index % 100 === 99) await cancellableWait(0, signal);
      }
      throwIfAborted(signal); return finish(matches, tieBreak);
    },
  };
}
export function createCatalogSearchIndex<T extends ScrapedLink>(books: T[]) {
  return preparedCatalogIndex(books.map((book, index) => ({ book, index, prepared: prepareCatalogBook(book) })));
}
export async function createCatalogSearchIndexAsync<T extends ScrapedLink>(books: T[], signal?: AbortSignal) {
  const rows: CatalogRow<T>[] = [];
  for (let index = 0; index < books.length; index++) {
    throwIfAborted(signal);
    rows.push({ book: books[index], index, prepared: prepareCatalogBook(books[index]) });
    if (index % 100 === 99) await cancellableWait(0, signal);
  }
  throwIfAborted(signal); return preparedCatalogIndex(rows);
}
export function rankCatalogBooks<T extends ScrapedLink>(books: T[], query: string): T[] {
  return createCatalogSearchIndex(books).search(query);
}
export function catalogRemoteQueries(query: string): { primary: string; fallback: string | null } {
  const terms = catalogTokens(query), primary = terms.join(" ");
  const longest = [...terms].sort((a,b) => b.length-a.length)[0] ?? "";
  const reduced = longest.slice(0,Math.min(6,Math.max(4,longest.length-2)));
  return { primary, fallback: longest.length >= 6 && reduced !== primary ? reduced : terms.length > 1 ? longest : null };
}
