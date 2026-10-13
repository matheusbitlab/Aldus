import type { ReadingSnapshot, ReadingStats } from "./models";

/** Calendar keys follow the supplied local date; no UTC conversion of session days. */
export function calculateStats(snapshot: ReadingSnapshot, today: string): ReadingStats {
  if (new Set(snapshot.books.map(b => b.id)).size !== snapshot.books.length) throw Error("Livros duplicados na fonte de leitura.");
  const books = snapshot.books;
  for (const book of books) {
    if (!book.id || !["unread", "reading", "completed", "interrupted", "abandoned"].includes(book.status) ||
      (book.progress !== null && (!Number.isFinite(book.progress) || book.progress < 0 || book.progress > 1)) ||
      [book.startedAt, book.completedAt].some(v => v !== null && (!Number.isSafeInteger(v) || v < 0 || !Number.isFinite(new Date(v).getTime()))) ||
      [book.pagesRead, book.readingSeconds].some(v => v !== null && (!Number.isFinite(v) || v < 0)) ||
      (book.genres !== null && (!Array.isArray(book.genres) || book.genres.some(v => typeof v !== "string" || !v.trim())))) throw Error("Dados de leitura inválidos na fonte.");
  }
  const count = (status: string) => books.filter(b => b.status === status).length;
  const complete = books.filter(b => b.status === "completed");
  const datesAvailable = complete.every(b => b.completedAt !== null && Number.isFinite(b.completedAt));
  const byMonth: Record<string, number> = {}, byYear: Record<string, number> = {};
  if (datesAvailable) for (const book of complete) {
    const date = new Date(book.completedAt!);
    const year = String(date.getFullYear()), month = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    byYear[year] = (byYear[year] ?? 0) + 1; byMonth[month] = (byMonth[month] ?? 0) + 1;
  }
  const active = books.filter(b => b.status !== "unread");
  const sum = (field: "pagesRead" | "readingSeconds") => active.every(b => b[field] !== null && Number.isFinite(b[field]) && b[field]! >= 0)
    ? active.reduce((n, b) => n + b[field]!, 0) : null;
  const genres: Record<string, number> = Object.create(null);
  if (complete.every(b => b.genres !== null)) for (const book of complete) for (const genre of new Set(book.genres!)) genres[genre] = (genres[genre] ?? 0) + 1;
  return { total: books.length, started: books.length - count("unread"), completed: count("completed"),
    abandoned: count("abandoned"), interrupted: count("interrupted"), reading: count("reading"), unread: count("unread"),
    pagesRead: sum("pagesRead"), readingSeconds: sum("readingSeconds"), streak: snapshot.readingDays === null ? null : currentStreak(snapshot.readingDays, today),
    booksByMonth: datesAvailable ? byMonth : null, booksByYear: datesAvailable ? byYear : null,
    mostReadGenres: complete.every(b => b.genres !== null) ? Object.entries(genres).map(([genre, n]) => ({ genre, books: n })).sort((a, b) => b.books - a.books || a.genre.localeCompare(b.genre)) : null };
}
export function localDay(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function validDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  return y >= 2000 && localDay(new Date(y, m - 1, d, 12)) === day;
}
function previousDay(day: string): string { const [y, m, d] = day.split("-").map(Number); return localDay(new Date(y, m - 1, d - 1, 12)); }
export function currentStreak(days: string[], today: string): number {
  if (!validDay(today) || days.some(day => !validDay(day))) throw Error("Dia de leitura inválido.");
  const set = new Set(days);
  let cursor = set.has(today) ? today : previousDay(today), streak = 0;
  while (set.has(cursor)) { streak++; cursor = previousDay(cursor); }
  return streak;
}
