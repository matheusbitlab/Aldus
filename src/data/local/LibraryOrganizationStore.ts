import AsyncStorage from "@react-native-async-storage/async-storage";
import { BookOrganization, LibraryOrganizationRepository, OrganizationRecords, parseOrganizationRecord } from "@/src/domain/types/libraryOrganization";

export const LIBRARY_ORGANIZATION_KEY = "@kindle/library-organization.v1";
interface KeyValueStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }

/** Serializa read-modify-write; não substitui dados por memória se a persistência falhar. */
export class LibraryOrganizationStore implements LibraryOrganizationRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: KeyValueStorage = AsyncStorage) {}
  async list(): Promise<OrganizationRecords> {
    await this.queue.catch(() => undefined);
    return this.read();
  }
  private async read(): Promise<OrganizationRecords> {
    const text = await this.storage.getItem(LIBRARY_ORGANIZATION_KEY);
    const result: OrganizationRecords = Object.create(null);
    if (!text) return result;
    const values: unknown = JSON.parse(text);
    if (!Array.isArray(values)) throw new Error("Dados de organização inválidos. Preserve o armazenamento antes de recuperar um backup.");
    for (const value of values) {
      const record = parseOrganizationRecord(value);
      if (result[record.bookId]) throw new Error("Dados de organização duplicados.");
      result[record.bookId] = record;
    }
    return result;
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const job = this.queue.catch(() => undefined).then(operation);
    this.queue = job;
    return job;
  }
  save(value: BookOrganization): Promise<void> {
    return this.saveMany([value]);
  }
  saveMany(values: BookOrganization[], beforeCommit?: (current: OrganizationRecords) => void): Promise<void> {
    const validated = values.map(parseOrganizationRecord);
    if (new Set(validated.map(record => record.bookId)).size !== validated.length) throw new Error("A seleção contém livros duplicados.");
    return this.enqueue(async () => {
      const records = await this.read();
      beforeCommit?.(records);
      for (const record of validated) {
        const previous = records[record.bookId];
        if (previous && previous.revision !== record.revision - 1) throw Object.assign(new Error("Este livro foi alterado em outra janela. Reabra a organização antes de salvar."),{code:'LOCAL_REVISION_CONFLICT'});
        if (!previous && record.revision !== 1) throw Object.assign(new Error("A versão inicial deste registro é inválida."),{code:'LOCAL_REVISION_CONFLICT'});
        records[record.bookId] = record;
      }
      // One durable write after every revision and account guard has passed.
      if (!validated.length) return;
      await this.storage.setItem(LIBRARY_ORGANIZATION_KEY, JSON.stringify(Object.values(records)));
    });
  }
  merge(values: OrganizationRecords, conflicts: "keep-local" | "use-imported"): Promise<{ imported: number; conflicts: number }> {
    const validated = Object.values(values).map(parseOrganizationRecord);
    return this.enqueue(async () => {
      const records = await this.read();
      let imported = 0, conflicting = 0;
      for (const record of validated) {
        const previous = records[record.bookId];
        if (previous && sameOrganization(previous, record)) continue;
        if (previous) { conflicting++; if (conflicts === "keep-local") continue; }
        records[record.bookId] = { ...record, revision: (previous?.revision ?? 0) + 1, updatedAt: Date.now() };
        imported++;
      }
      await this.storage.setItem(LIBRARY_ORGANIZATION_KEY, JSON.stringify(Object.values(records)));
      return { imported, conflicts: conflicting };
    });
  }
}

function sameOrganization(first: BookOrganization, second: BookOrganization): boolean {
  const { revision: _firstRevision, updatedAt: _firstDate, ...firstData } = first;
  const { revision: _secondRevision, updatedAt: _secondDate, ...secondData } = second;
  return JSON.stringify(firstData) === JSON.stringify(secondData);
}
