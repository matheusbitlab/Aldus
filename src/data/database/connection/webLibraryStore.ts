type StoreName = "books" | "book_metadata" | "chapters" | "documents" | "reading_progress" | "bookmarks" | "highlights" | "web_search_history" | "pdf_reflow_cache" | "source_catalogs" | "source_import_links";
type StoredValue = { id: string };

const storeNames: StoreName[] = ["books", "book_metadata", "chapters", "documents", "reading_progress", "bookmarks", "highlights", "web_search_history", "pdf_reflow_cache", "source_catalogs", "source_import_links"];
const memoryStores = new Map<StoreName, Map<string, StoredValue>>(storeNames.map((name) => [name, new Map()]));
const memoryDeleted = new Map<StoreName, Set<string>>(storeNames.map((name) => [name, new Set()]));
let databasePromise: Promise<IDBDatabase | null> | null = null;

export async function webGetPersistent<T extends StoredValue>(storeName: StoreName, id: string): Promise<T | null> {
  const database = await openDatabase();
  if (!database) throw new Error("Armazenamento persistente indisponível para esta fonte.");
  return await request<T | undefined>(database.transaction(storeName, "readonly").objectStore(storeName).get(id)) ?? null;
}
export async function webSourceLinksPersistent<T>(sourceId: string): Promise<T[]> {
  const database = await openDatabase();
  if (!database) throw new Error("Armazenamento persistente indisponível para esta fonte.");
  return request<T[]>(database.transaction("source_import_links", "readonly").objectStore("source_import_links").index("sourceId").getAll(sourceId));
}
/** One transaction; no mutation of book stores. */
export async function webRemoveSourcePersistent(sourceId: string): Promise<void> {
  const database = await openDatabase();
  if (!database) throw new Error("Não foi possível remover o índice persistente da fonte.");
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(["source_catalogs", "source_import_links"], "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error ?? new Error("Falha ao remover a fonte."));
    transaction.objectStore("source_catalogs").delete(sourceId);
    const cursor = transaction.objectStore("source_import_links").index("sourceId").openCursor(IDBKeyRange.only(sourceId));
    cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue(); } };
  });
}

/** Study data must be durable: do not silently acknowledge an in-memory write. */
export async function webGetAllPersistent<T extends StoredValue>(storeName: StoreName): Promise<T[]> {
  const database = await openDatabase();
  if (!database) throw new Error("Armazenamento persistente indisponível. Libere o armazenamento deste site para acessar suas notas.");
  return request<T[]>(database.transaction(storeName, "readonly").objectStore(storeName).getAll());
}
export async function webPutPersistent<T extends StoredValue>(storeName: StoreName, value: T): Promise<void> {
  await persistentMutation(storeName, store => store.put(value));
}
export async function webDeletePersistent(storeName: StoreName, id: string): Promise<void> {
  await persistentMutation(storeName, store => store.delete(id));
}
async function persistentMutation(storeName: StoreName, mutate: (store: IDBObjectStore) => void): Promise<void> {
  const database = await openDatabase();
  if (!database) throw new Error("Não foi possível salvar suas notas. Libere o armazenamento deste site e tente novamente.");
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(transaction.error ?? new Error("Não foi possível gravar a nota."));
    mutate(transaction.objectStore(storeName));
  });
}

/** Checks collisions and writes in one transaction; only oncomplete acknowledges success. */
export async function webImportStudyPersistent<T extends StoredValue & { bookId: string }>(storeName: "bookmarks" | "highlights", bookId: string, values: T[]): Promise<{ imported: number; skipped: number }> {
  if (!bookId || values.some(value => value.bookId !== bookId || !value.id) || new Set(values.map(value => value.id)).size !== values.length) throw new Error("Anotações inválidas ou duplicadas para este livro.");
  const database = await openDatabase();
  if (!database) throw new Error("Não foi possível recuperar suas notas. Libere o armazenamento deste site e tente novamente.");
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite"), store = transaction.objectStore(storeName);
    let imported = 0, skipped = 0, failure: Error | null = null;
    transaction.oncomplete = () => resolve({ imported, skipped });
    transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("A recuperação falhou. Nenhuma anotação foi importada."));
    for (const value of values) {
      const lookup = store.get(value.id);
      lookup.onsuccess = () => {
        if (failure) return;
        try {
          const previous = lookup.result as T | undefined;
          if (previous && previous.bookId !== bookId) throw new Error("Identificador utilizado em outro livro. Nenhuma anotação foi importada.");
          if (previous) skipped++;
          else { store.add(value); imported++; }
        } catch (error) {
          failure = error instanceof Error ? error : new Error("Não foi possível recuperar suas notas.");
          transaction.abort();
        }
      };
    }
  });
}

export async function webGetAll<T extends StoredValue>(storeName: StoreName): Promise<T[]> {
  const database = await openDatabase();
  const memory = memoryStores.get(storeName)!;
  const deleted = memoryDeleted.get(storeName)!;
  if (!database) return [...memory.values()].filter((item) => !deleted.has(item.id)) as T[];

  try {
    const values = await request<T[]>(database.transaction(storeName, "readonly").objectStore(storeName).getAll());
    const merged = new Map(values.map((item) => [item.id, item]));
    for (const [id, item] of memory) if (!deleted.has(id)) merged.set(id, item as T);
    for (const id of deleted) merged.delete(id);
    return [...merged.values()];
  } catch {
    return [...memory.values()].filter((item) => !deleted.has(item.id)) as T[];
  }
}

export async function webGet<T extends StoredValue>(storeName: StoreName, id: string): Promise<T | null> {
  if (memoryDeleted.get(storeName)!.has(id)) return null;
  const memoryValue = memoryStores.get(storeName)!.get(id) as T | undefined;
  const database = await openDatabase();
  if (!database) return memoryValue ?? null;
  try {
    return await request<T | undefined>(database.transaction(storeName, "readonly").objectStore(storeName).get(id)) ?? memoryValue ?? null;
  } catch {
    return memoryValue ?? null;
  }
}

export async function webPut<T extends StoredValue>(storeName: StoreName, value: T): Promise<void> {
  memoryDeleted.get(storeName)!.delete(value.id);
  const database = await openDatabase();
  if (database) {
    try {
      await request(database.transaction(storeName, "readwrite").objectStore(storeName).put(value));
      return;
    } catch {
      databasePromise = null;
    }
  }
  memoryStores.get(storeName)!.set(value.id, value);
}

export async function webDelete(storeName: StoreName, id: string): Promise<void> {
  memoryStores.get(storeName)!.delete(id);
  memoryDeleted.get(storeName)!.add(id);
  const database = await openDatabase();
  if (!database) return;
  try {
    await request(database.transaction(storeName, "readwrite").objectStore(storeName).delete(id));
  } catch {
    databasePromise = null;
  }
}

async function openDatabase(): Promise<IDBDatabase | null> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve) => {
      if (typeof indexedDB === "undefined") { resolve(null); return; }
      try {
        const request = indexedDB.open("kindle-reader-web", 5);
        request.onupgradeneeded = (event) => {
          const database = request.result;
          for (const storeName of storeNames) if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "id" });
          const sourceLinks = request.transaction!.objectStore("source_import_links");
          if (!sourceLinks.indexNames.contains("sourceId")) sourceLinks.createIndex("sourceId", "sourceId");
          if (event.oldVersion < 2) {
            const books = request.transaction!.objectStore("books");
            const metadata = request.transaction!.objectStore("book_metadata");
            const cursorRequest = books.openCursor();
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result;
              if (!cursor) return;
              const book = cursor.value as { id: string; filePath?: string } & Record<string, unknown>;
              metadata.put({
                ...book,
                filePath: book.filePath?.startsWith("data:application/pdf")
                  ? `web-pdf://${book.id}`
                  : book.filePath ?? "",
              });
              cursor.continue();
            };
          }
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => { request.result.close(); databasePromise = null; };
          resolve(request.result);
        };
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return databasePromise;
}

function request<T>(idbRequest: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    idbRequest.onsuccess = () => resolve(idbRequest.result);
    idbRequest.onerror = () => reject(idbRequest.error);
  });
}
