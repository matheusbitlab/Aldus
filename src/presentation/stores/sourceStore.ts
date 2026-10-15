import { create } from "zustand";
import { UserSource } from "@/src/domain/types/sources";
import { UserSourceRepository } from "@/src/data/sources/UserSourceRepository";
import { googleDrive } from "@/src/data/drive/driveDependencies";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";
import { sourceCapabilities, sourceIdentity } from "@/src/domain/types/sourceCatalog";
import { throwIfAborted } from "@/src/core/utils/cancellation";

const repository = new UserSourceRepository();
type NewUserSource = Omit<UserSource, "id" | "createdAt"> & { id?: string };
type UserSourceUpdate = Partial<Omit<UserSource, "id" | "createdAt">>;

interface SourceState {
  sources: UserSource[];
  load: () => Promise<void>;
  add: (source: NewUserSource, signal?: AbortSignal) => Promise<void>;
  update: (id: string, patch: UserSourceUpdate) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useSourceStore = create<SourceState>((set, get) => ({
  sources: [],
  load: async () => set({ sources: await repository.list() }),
  add: async (source, signal) => {
    throwIfAborted(signal);
    const item: UserSource = {
      ...source,
      id: source.id ?? `source-${Date.now()}`,
      createdAt: Date.now(),
    };
    await repository.save(item);
    await get().load();
    if (sourceCapabilities(item).supportsCatalog) {
      if (signal?.aborted) { sourceCatalogs.cancel(item.id); return; }
      await sourceCatalogs.load(item, signal);
      if (item.enabled) await sourceCatalogs.refresh(item, signal);
    }
  },
  update: async (id, patch) => {
    const source = get().sources.find((item) => item.id === id);
    if (!source) return;
    const next = { ...source, ...patch };
    if (!next.enabled || sourceIdentity(next) !== sourceIdentity(source)) sourceCatalogs.cancel(id);
    await repository.save(next);
    if (sourceIdentity(next) !== sourceIdentity(source)) { googleDrive.clearIndex(id); await sourceCatalogs.reset(id); }
    await get().load();
    if (sourceCapabilities(next).supportsCatalog) await sourceCatalogs.load(next);
  },
  remove: async (id) => {
    await sourceCatalogs.remove(id);
    if (get().sources.find(source => source.id === id)?.kind === "google-drive") await googleDrive.disconnect(id);
    await repository.remove(id);
    await get().load();
  },
}));
