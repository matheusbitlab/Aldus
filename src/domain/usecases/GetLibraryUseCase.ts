import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { applyBookOrganization, LibraryOrganizationRepository } from "@/src/domain/types/libraryOrganization";
export class GetLibraryUseCase {
  constructor(private readonly books: BookRepository, private readonly organization?: LibraryOrganizationRepository) {}
  async execute(): Promise<LibraryBook[]> {
    const books = await this.books.listActive();
    const records = this.organization ? await this.organization.list() : {};
    return books.map(book => applyBookOrganization(book, records[book.id]));
  }
}
