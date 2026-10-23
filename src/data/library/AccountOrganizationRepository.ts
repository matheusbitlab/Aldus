import { BookOrganization, LibraryOrganizationRepository, OrganizationRecords } from "@/src/domain/types/libraryOrganization";
import { AccountBookRepository } from "./AccountBookRepository";
export class AccountOrganizationRepository implements LibraryOrganizationRepository {
  constructor(private readonly storage: LibraryOrganizationRepository, private books: AccountBookRepository) {}
  async list(): Promise<OrganizationRecords> {
    const run = this.books.scope.capture();
    const [records, books] = await Promise.all([this.storage.list(), this.books.listActive()]); run.check();
    const ids = new Set(books.map(book => book.id));
    return Object.fromEntries(Object.entries(records).filter(([id]) => ids.has(id)));
  }
  async save(record: BookOrganization) {
    const run = this.books.scope.capture();
    if (!await this.books.findById(record.bookId)) throw new Error("Livro não disponível nesta conta.");
    run.check(); await this.storage.save(record); run.check();
  }
  async saveMany(records: BookOrganization[], beforeCommit?: (current: OrganizationRecords) => void) {
    const run = this.books.scope.capture();
    const check = (current?: OrganizationRecords) => {
      try { run.check(); }
      catch { throw Object.assign(new Error("A conta mudou. Reabra a organização."), { code: "LOCAL_MUTATION_CANCELLED" }); }
      if (current) beforeCommit?.(Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id))));
    };
    const ids = new Set((await this.books.listActive()).map(book => book.id));
    check();
    if (records.some(record => !ids.has(record.bookId))) throw new Error("A seleção contém livros fora desta conta.");
    await this.storage.saveMany(records, check);
    run.check();
  }
  async merge(records: OrganizationRecords, conflicts: "keep-local" | "use-imported") {
    const run = this.books.scope.capture();
    for (const [id,record] of Object.entries(records)) if (id!==record.bookId || !await this.books.findById(id)) throw new Error("O backup contém livros fora desta conta.");
    run.check(); const result = await this.storage.merge(records, conflicts); run.check(); return result;
  }
}
