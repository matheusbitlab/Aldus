import { StoredChapter } from "@/src/domain/entities/LibraryBook";

export interface ParsedEpub { title: string; author: string; opfPath: string; coverImagePath: string | null; chapters: Omit<StoredChapter, "bookId">[]; }
export interface EpubParser { parse(bytes: Uint8Array, signal?: AbortSignal): Promise<ParsedEpub>; }
export interface EpubValidator { validate(bytes: Uint8Array): Promise<void>; }
