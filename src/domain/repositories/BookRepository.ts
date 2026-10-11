import { LibraryBook } from "@/src/domain/entities/LibraryBook";

export interface BookRepository {
  listOwned?(): Promise<LibraryBook[]>;
  listActive(): Promise<LibraryBook[]>;
  findById(bookId: string): Promise<LibraryBook | null>;
  save(book: LibraryBook): Promise<void>;
  softDelete(bookId: string): Promise<void>;
}
