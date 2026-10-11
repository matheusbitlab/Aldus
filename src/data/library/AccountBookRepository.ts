import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { BookRepository } from "@/src/domain/repositories/BookRepository";
import { LibraryAccountScope, libraryAccountScope } from "./LibraryAccountScope";

export interface LocalBookStorage extends BookRepository { listAll(): Promise<LibraryBook[]>; }
export class AccountBookRepository implements BookRepository {
  constructor(readonly storage: LocalBookStorage, readonly scope: LibraryAccountScope = libraryAccountScope) {}
  async listActive() {
    const run = this.scope.capture();
    const books = await this.storage.listActive(); run.check();
    return run.userId ? books.filter(book => book.ownerUserId === run.userId) : [];
  }
  async findById(id: string) {
    const run = this.scope.capture();
    const book = await this.storage.findById(id); run.check();
    return run.userId && book?.ownerUserId === run.userId ? book : null;
  }
  async save(book: LibraryBook) {
    const run = this.scope.capture();
    if (!run.userId) throw new Error("Entre na sua conta para salvar livros.");
    const previous = (await this.storage.listAll()).find(item => item.id === book.id); run.check();
    if (previous && previous.ownerUserId !== run.userId) throw new Error("Este livro não pertence à conta atual.");
    if (book.ownerUserId !== undefined && book.ownerUserId !== run.userId) throw new Error("Conta do livro incompatível.");
    await this.storage.save({ ...book, ownerUserId: run.userId }); run.check();
  }
  async softDelete(id: string) {
    const run = this.scope.capture();
    if (!await this.findById(id)) throw new Error("Livro não disponível nesta conta."); run.check();
    await this.storage.softDelete(id); run.check();
  }
  async listLegacy() {
    const run = this.scope.capture();
    const books = await this.storage.listAll(); run.check();
    return run.userId ? books.filter(book => !book.ownerUserId && !book.isDeleted && !book.id.startsWith("bundled-")) : [];
  }
  async claimLegacy(ids: string[]) {
    const run = this.scope.capture();
    if (!run.userId) throw new Error("Entre na sua conta.");
    const available = await this.listLegacy(); run.check();
    for (const id of ids) {
      const book = available.find(item => item.id === id);
      if (!book) throw new Error("Livro local indisponível para vinculação.");
      run.check(); await this.storage.save({ ...book, ownerUserId: run.userId, importComplete: true });
    }
    run.check();
  }
}

/** Guard every child repository at the data boundary, including direct ID lookups. */
export function scopeBookData<T extends object>(repository: T, books: AccountBookRepository): T {
  return new Proxy(repository, { get(target, property) {
    const member = Reflect.get(target, property);
    if (typeof member !== "function") return member;
    return async (...args: any[]) => {
      const run = books.scope.capture();
      let bookId: string | undefined;
      if (["listByBookId", "findByBookId", "replaceForBook", "get", "delete", "importPreservingExisting"].includes(String(property))) bookId = args[0];
      else if (property === "save") bookId = args[0]?.bookId ?? (typeof args[0] === "string" ? args[0] : undefined);
      else if (property === "remove" && !("findById" in target)) bookId = args[0];
      else if (property === "findById" || property === "remove") {
        const item = await (target as any).findById(args[0]); run.check();
        if (!item || !await books.findById(item.bookId)) return property === "findById" ? null : undefined;
        bookId = item.bookId;
      }
      if (!bookId || !await books.findById(bookId)) throw new Error("Dados de leitura não disponíveis nesta conta.");
      if (property === "save" && args[0]?.id && "findById" in target) {
        const previous = await (target as any).findById(args[0].id);
        run.check();
        if (previous && previous.bookId !== bookId) throw new Error("Identificador de anotação utilizado em outro livro.");
      }
      run.check(); const result = await member.apply(target, args); run.check(); return result;
    };
  } });
}
