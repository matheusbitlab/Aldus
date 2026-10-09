import { ScrapedLink } from "@/src/domain/types/search";

const stopWords = new Set("a o as os um uma uns umas de do da dos das e em no na nos nas por para the an of and by to in".split(" "));
const authorSpellings: Record<string, string> = { dostoievski: "dostoyevsky", dostoievsky: "dostoyevsky", dostoevsky: "dostoyevsky", dostoevski: "dostoyevsky", dostojevski: "dostoyevsky", dostoievskij: "dostoyevsky" };
export function normalizeCatalogText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
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
export function scoreCatalogBook(book: ScrapedLink, query: string): number {
  const terms = catalogTokens(query);
  if (!terms.length) return 0;
  const title = catalogTokens(book.title), author = catalogTokens(book.author ?? ""), words = [...title, ...author];
  if (terms.join(" ") === title.join(" ")) return 500;
  if (terms.every(term => matches(term, title))) return 400 + terms.length / Math.max(1,title.length);
  const exact = terms.filter(term => matches(term, words));
  if (exact.length === terms.length) return 300 + terms.length / Math.max(1,words.length);
  if (terms.length >= 3 && exact.length >= Math.ceil(terms.length * 2 / 3)) return 200 + exact.length / terms.length;
  const subjects = catalogTokens((book.subjects ?? []).join(" "));
  if (terms.every(term => matches(term, [...words, ...subjects]))) return 150;
  const missing = terms.filter(term => !matches(term,words));
  if (missing.length === 1 && (exact.length > 0 || terms.length === 1 && missing[0].length >= 6) && missing[0].length >= 4 && words.some(word => word.length >= 4 && word[0] === missing[0][0] && oneEdit(missing[0],word))) return 100;
  return 0;
}
export function rankCatalogBooks(books: ScrapedLink[], query: string): ScrapedLink[] {
  return books.map((book,index) => ({book,index,score:scoreCatalogBook(book,query)})).filter(row => row.score > 0).sort((a,b) => b.score-a.score || a.index-b.index).map(row => row.book);
}
export function catalogRemoteQueries(query: string): { primary: string; fallback: string | null } {
  const terms = catalogTokens(query), primary = terms.join(" ");
  const longest = [...terms].sort((a,b) => b.length-a.length)[0] ?? "";
  const reduced = longest.slice(0,Math.min(6,Math.max(4,longest.length-2)));
  return { primary, fallback: longest.length >= 6 && reduced !== primary ? reduced : terms.length > 1 ? longest : null };
}
