import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserSource } from "@/src/domain/types/sources";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { throwIfAborted } from "@/src/core/utils/cancellation";

const KEY = "kindle-reader.user-sources.v1";
// All instances share the same read/modify/write boundary.
let pendingWrite: Promise<void> = Promise.resolve();
const visible = (source: UserSource, userId: string | null) => userId
  ? source.ownerId === userId : source.ownerId == null;
const verified = (source: UserSource): UserSource => source.status ? source : {
  ...source, enabled: false, status: "error", lastError: "Atualize esta biblioteca para verificar a conexão.",
};

export class UserSourceRepository {
  private async read(): Promise<UserSource[]> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error("Não foi possível ler suas bibliotecas. Os dados foram preservados."); }
    if (!Array.isArray(value) || value.some(source => !source || typeof source.id !== "string")) {
      throw new Error("Não foi possível ler suas bibliotecas. Os dados foram preservados.");
    }
    return value;
  }
  async list(): Promise<UserSource[]> {
    const scope = libraryAccountScope.capture();
    const sources = await this.read(); scope.check();
    return sources.filter(source => visible(source, scope.userId)).map(verified);
  }
  async listLegacy(): Promise<UserSource[]> {
    const scope = libraryAccountScope.capture();
    if (!scope.userId) return [];
    const sources = await this.read(); scope.check();
    return sources.filter(source => source.ownerId == null).map(verified);
  }
  private mutate(change: (sources: UserSource[]) => UserSource[], signal?: AbortSignal): Promise<void> {
    const scope = libraryAccountScope.capture();
    const operation = pendingWrite.catch(() => undefined).then(async () => {
      scope.check(); throwIfAborted(signal);
      const sources = await this.read(); scope.check(); throwIfAborted(signal);
      const next = change(sources); scope.check(); throwIfAborted(signal);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      scope.check();
    });
    pendingWrite = operation.catch(() => undefined);
    return operation;
  }
  save(source: UserSource, signal?: AbortSignal): Promise<void> {
    const ownerId = libraryAccountScope.userId;
    return this.mutate(sources => {
      const existing = sources.find(item => item.id === source.id);
      if (existing && !visible(existing, ownerId)) throw new Error("Esta biblioteca não está vinculada à conta atual.");
      if (typeof source.ownerId === "string" && source.ownerId !== ownerId) throw new Error("A conta mudou. Reabra a operação.");
      const next = { ...source, ownerId };
      return existing ? sources.map(item => item.id === source.id ? next : item) : [...sources, next];
    }, signal);
  }
  adoptLegacy(id: string): Promise<void> {
    const ownerId = libraryAccountScope.userId;
    if (!ownerId) return Promise.reject(new Error("Entre na conta para vincular esta biblioteca."));
    return this.mutate(sources => {
      const source = sources.find(item => item.id === id);
      if (!source || source.ownerId != null) throw new Error("Esta biblioteca já foi vinculada ou não está disponível.");
      return sources.map(item => item.id === id ? { ...item, ownerId } : item);
    });
  }
  /** Undo only this incomplete save; never overwrite a newer edit or a different account. */
  rollbackSave(expected: UserSource, previous: UserSource | null): Promise<void> {
    const ownerId = libraryAccountScope.userId;
    return this.mutate(sources => {
      const current = sources.find(item => item.id === expected.id);
      if (!current || !visible(current, ownerId) || JSON.stringify(current) !== JSON.stringify(expected)) return sources;
      return previous ? sources.map(item => item.id === expected.id ? previous : item) : sources.filter(item => item.id !== expected.id);
    });
  }
  remove(id: string): Promise<void> {
    const ownerId = libraryAccountScope.userId;
    return this.mutate(sources => sources.filter(source => source.id !== id || !visible(source, ownerId)));
  }
}
