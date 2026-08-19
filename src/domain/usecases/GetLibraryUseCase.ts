import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
export class GetLibraryUseCase { constructor(private readonly books: BookRepository) {} execute(): Promise<LibraryBook[]> { return this.books.listActive(); } }
