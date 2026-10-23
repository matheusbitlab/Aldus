import { BookOrganization, LibraryOrganizationRepository, parseOrganizationRecord, ReadingStatus } from "@/src/domain/types/libraryOrganization";

export type LibraryBulkAction =
  | { kind: "add-collection" | "remove-collection" | "add-tag" | "remove-tag"; name: string }
  | { kind: "rename-collection"; name: string; replacement: string }
  | { kind: "favorite"; value: boolean }
  | { kind: "status"; value: ReadingStatus | null };

function name(value: string): string {
  const result = value.trim();
  if (!result || result.length > 120) throw new Error("Use um nome entre 1 e 120 caracteres.");
  return result;
}

/** Reuses existing per-book records; the repository commits the whole local selection. */
export async function organizeLibrarySelection(repository: LibraryOrganizationRepository, bookIds: string[], action: LibraryBulkAction, check?: () => void): Promise<number> {
  let ids = [...new Set(bookIds)];
  if (!ids.length) throw new Error("Selecione pelo menos um livro.");
  const label = "name" in action ? name(action.name) : "";
  const replacement = action.kind === "rename-collection" ? name(action.replacement) : "";
  const current = await repository.list();
  check?.();
  if (action.kind === "rename-collection") ids = Object.values(current).filter(record => record.collections.includes(label)).map(record => record.bookId);
  const changes: BookOrganization[] = [];
  for (const bookId of ids) {
    const old = current[bookId];
    const value: BookOrganization = old ?? { bookId, favorite: false, collections: [], tags: [], series: "", volume: null, readingStatus: null, revision: 0, updatedAt: 0 };
    let next = { ...value };
    switch (action.kind) {
      case "add-collection": next.collections = [...new Set([...value.collections, label])]; break;
      case "remove-collection": next.collections = value.collections.filter(item => item !== label); break;
      case "add-tag": next.tags = [...new Set([...value.tags, label])]; break;
      case "remove-tag": next.tags = value.tags.filter(item => item !== label); break;
      case "rename-collection": next.collections = [...new Set(value.collections.map(item => item === label ? replacement : item))]; break;
      case "favorite": next.favorite = action.value; break;
      case "status": next.readingStatus = action.value; break;
    }
    if (JSON.stringify(next) === JSON.stringify(value)) continue;
    next = parseOrganizationRecord({ ...next, updatedAt: Date.now(), revision: value.revision + 1 });
    changes.push(next);
  }
  check?.();
  if (changes.length) await repository.saveMany(changes, latest => {
    check?.();
    if (action.kind === 'rename-collection') {
      const members = Object.values(latest).filter(record => record.collections.includes(label)).map(record => record.bookId).sort();
      if (JSON.stringify(members) !== JSON.stringify([...ids].sort())) throw Object.assign(new Error('A coleção mudou durante a edição. Recarregue antes de renomear.'), { code: 'LOCAL_REVISION_CONFLICT' });
    }
  });
  return changes.length;
}
