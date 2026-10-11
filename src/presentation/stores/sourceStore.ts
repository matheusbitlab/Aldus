import { create } from "zustand";
import { UserSource } from "@/src/domain/types/sources";
import { UserSourceRepository } from "@/src/data/sources/UserSourceRepository";
import { googleDrive } from "@/src/data/drive/driveDependencies";

const repository = new UserSourceRepository();
type NewUserSource = Omit<UserSource, "id" | "createdAt"> & { id?: string };
type UserSourceUpdate = Partial<Omit<UserSource, "id" | "createdAt">>;

interface SourceState {
  sources: UserSource[];
  load: () => Promise<void>;
  add: (source: NewUserSource) => Promise<void>;
  update: (id: string, patch: UserSourceUpdate) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useSourceStore = create<SourceState>((set, get) => ({
  sources: [],
  load: async () => set({ sources: await repository.list() }),
  add: async (source) => {
    const item: UserSource = {
      ...source,
      id: source.id ?? `source-${Date.now()}`,
      createdAt: Date.now(),
    };
    await repository.save(item);
    await get().load();
  },
  update: async (id, patch) => {
    const source = get().sources.find((item) => item.id === id);
    if (!source) return;
    await repository.save({ ...source, ...patch });
    await get().load();
  },
  remove: async (id) => {
    if (get().sources.find(source => source.id === id)?.kind === "google-drive") await googleDrive.disconnect(id);
    await repository.remove(id);
    await get().load();
  },
}));
