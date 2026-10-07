import { LibraryBook } from "@/src/domain/entities/LibraryBook";

export const readingStatuses = ["unread", "reading", "completed", "interrupted"] as const;
export type ReadingStatus = typeof readingStatuses[number];
export interface BookOrganization {
  bookId: string;
  title?: string;
  author?: string;
  coverImagePath?: string | null;
  favorite: boolean;
  collections: string[];
  tags: string[];
  series: string;
  volume: number | null;
  readingStatus: ReadingStatus | null;
  updatedAt: number;
  revision: number;
}
export type OrganizationRecords = Record<string, BookOrganization>;
export interface LibraryOrganizationRepository {
  list(): Promise<OrganizationRecords>;
  save(record: BookOrganization): Promise<void>;
  merge(records: OrganizationRecords, conflicts: "keep-local" | "use-imported"): Promise<{ imported: number; conflicts: number }>;
}
export function inferredReadingStatus(book: LibraryBook, record?: BookOrganization): ReadingStatus {
  return record?.readingStatus ?? (book.progress >= 1 ? "completed" : book.progress > 0 ? "reading" : "unread");
}
export function applyBookOrganization(book: LibraryBook, record?: BookOrganization): LibraryBook {
  if (!record) return book;
  return { ...book, title: record.title ?? book.title, author: record.author ?? book.author,
    coverImagePath: record.coverImagePath === undefined ? book.coverImagePath : record.coverImagePath };
}
export function normalizeLibraryText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}
export function parseOrganizationRecord(value: unknown): BookOrganization {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Registro de organização inválido.");
  const item = value as Record<string, unknown>;
  const str = (key: string, optional = false): string | undefined => {
    if (optional && item[key] === undefined) return undefined;
    if (typeof item[key] !== "string" || (item[key] as string).length > 2000) throw new Error(`Campo inválido: ${key}.`);
    return (item[key] as string).trim();
  };
  const list = (key: string): string[] => {
    if (!Array.isArray(item[key]) || item[key].length > 100 || item[key].some((v: unknown) => typeof v !== "string" || v.length > 120)) throw new Error(`Lista inválida: ${key}.`);
    return [...new Set((item[key] as string[]).map(v => v.trim()).filter(Boolean))];
  };
  const bookId = str("bookId")!;
  const title = str("title", true), author = str("author", true);
  if (!bookId || bookId === "__proto__" || bookId === "constructor" || bookId === "prototype" || title === "" || author === "") throw new Error("Identificação ou metadados vazios.");
  if (typeof item.favorite !== "boolean" || !Number.isSafeInteger(item.updatedAt) || (item.updatedAt as number) < 0 || !Number.isSafeInteger(item.revision) || (item.revision as number) < 1) throw new Error("Versão ou preferência inválida.");
  if (item.readingStatus !== null && !readingStatuses.includes(item.readingStatus as ReadingStatus)) throw new Error("Estado de leitura inválido.");
  if (item.volume !== null && (typeof item.volume !== "number" || !Number.isFinite(item.volume) || item.volume <= 0 || item.volume > 100000)) throw new Error("O volume deve ser um número positivo.");
  const cover = item.coverImagePath;
  if (cover !== undefined && cover !== null && (typeof cover !== "string" || cover.length > 4_000_000 || !/^(https?:\/\/|file:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(cover))) throw new Error("Capa inválida; use uma imagem local ou URL HTTP/HTTPS.");
  return { bookId, ...(title === undefined ? {} : { title }), ...(author === undefined ? {} : { author }),
    ...(cover === undefined ? {} : { coverImagePath: cover as string | null }), favorite: item.favorite,
    collections: list("collections"), tags: list("tags"), series: str("series")!, volume: item.volume as number | null,
    readingStatus: item.readingStatus as ReadingStatus | null, updatedAt: item.updatedAt as number, revision: item.revision as number };
}

export function parseOrganizationBackup(text: string): OrganizationRecords {
  if (text.length > 20_000_000) throw new Error("O backup de organização excede 20 MB.");
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error("O arquivo não contém JSON válido."); }
  if (data?.format !== "kindle-library-organization" || data.version !== 1 || !Array.isArray(data.records) || data.records.length > 10000) throw new Error("Este arquivo não é um backup de organização compatível.");
  const records: OrganizationRecords = Object.create(null);
  for (const value of data.records) {
    const record = parseOrganizationRecord(value);
    if (records[record.bookId]) throw new Error("O backup contém identificadores duplicados.");
    records[record.bookId] = record;
  }
  return records;
}
export function exportOrganizationBackup(records: OrganizationRecords): string {
  return JSON.stringify({ format: "kindle-library-organization", version: 1, exportedAt: new Date().toISOString(), records: Object.values(records).map(parseOrganizationRecord) }, null, 2);
}
