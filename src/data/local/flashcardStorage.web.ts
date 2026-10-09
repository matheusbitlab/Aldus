import AsyncStorage from "@react-native-async-storage/async-storage";

let opening: Promise<IDBDatabase> | null = null;
function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(
      new Error(
        "O navegador não disponibiliza IndexedDB para salvar flashcards.",
      ),
    );
  if (!opening)
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open("kindle-flashcards", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("snapshots");
      request.onerror = () => {
        opening = null;
        reject(
          request.error ?? new Error("Não foi possível abrir o estudo local."),
        );
      };
      request.onblocked = () => {
        opening = null;
        reject(
          new Error("Feche outras abas do app para abrir o estudo local."),
        );
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
    });
  return opening;
}

async function read(key: string): Promise<string | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("snapshots", "readonly");
    const request = transaction.objectStore("snapshots").get(key);
    transaction.oncomplete = () =>
      resolve(typeof request.result === "string" ? request.result : null);
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error ?? new Error("Falha ao ler os flashcards."));
  });
}

async function write(
  key: string,
  value: string,
  onlyIfMissing = false,
): Promise<string> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("snapshots", "readwrite"),
      store = transaction.objectStore("snapshots");
    let saved = value;
    if (onlyIfMissing) {
      const request = store.get(key);
      request.onsuccess = () => {
        if (typeof request.result === "string") saved = request.result;
        else store.put(value, key);
      };
    } else store.put(value, key);
    transaction.oncomplete = () => resolve(saved);
    transaction.onabort = transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error(
            "Falha ao salvar os flashcards. Os dados anteriores permanecem preservados.",
          ),
      );
  });
}

export const flashcardStorage = {
  async getItem(key: string): Promise<string | null> {
    const current = await read(key);
    if (current !== null) return current;
    const legacy = await AsyncStorage.getItem(key);
    return legacy === null ? null : write(key, legacy, true);
  },
  async setItem(key: string, value: string): Promise<void> {
    await write(key, value);
  },
};
