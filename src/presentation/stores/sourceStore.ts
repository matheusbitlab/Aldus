import { create } from "zustand";
import { UserSource } from "@/src/domain/types/sources";
import { UserSourceRepository } from "@/src/data/sources/UserSourceRepository";
import { googleDrive } from "@/src/data/drive/driveDependencies";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";
import { SourceCatalog, SourceOperationContext, sourceCapabilities, sourceIdentity } from "@/src/domain/types/sourceCatalog";
import { throwIfAborted } from "@/src/core/utils/cancellation";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";

const repository = new UserSourceRepository();
let loadRevision = 0;
type NewUserSource = Omit<UserSource, "id" | "createdAt"> & { id?: string };
type UserSourceUpdate = Partial<Omit<UserSource, "id" | "createdAt">>;
interface SaveOptions { prepared?: SourceCatalog; context?: SourceOperationContext; }

interface SourceState {
  sources: UserSource[];
  legacySources: UserSource[];
  loadError: string | null;
  load: () => Promise<void>;
  add: (source: NewUserSource, signal?: AbortSignal, options?: SaveOptions) => Promise<void>;
  update: (id: string, patch: UserSourceUpdate, signal?: AbortSignal, options?: SaveOptions) => Promise<void>;
  adoptLegacy: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useSourceStore = create<SourceState>((set, get) => ({
  sources: [],
  legacySources: [], loadError: null,
  load: async () => {
    const revision = ++loadRevision;
    const scope = libraryAccountScope.capture();
    try {
      const [sources, legacySources] = await Promise.all([repository.list(), repository.listLegacy()]);
      scope.check(); if (revision === loadRevision) set({ sources, legacySources, loadError: null });
    } catch (error) {
      if (scope.userId !== libraryAccountScope.userId) return;
      try { scope.check(); } catch { return; }
      if (revision !== loadRevision) return;
      set({ sources: [], legacySources: [], loadError: "Não foi possível carregar suas bibliotecas. Os dados foram preservados." });
    }
  },
  add: async (source, signal, options) => {
    const scope = libraryAccountScope.capture();
    throwIfAborted(signal);
    const item: UserSource = {
      ...source,
      id: source.id ?? `source-${Date.now()}`,
      createdAt: Date.now(),
      ownerId: scope.userId,
    };
    await repository.save(item, signal); scope.check();
    if (options?.prepared) {
      try { await sourceCatalogs.commitPrepared(item, options.prepared, signal, options.context); scope.check(); }
      catch (error) { scope.check(); await repository.rollbackSave(item, null); throw error; }
      finally { if (scope.userId === libraryAccountScope.userId) await get().load(); }
      return;
    }
    await get().load();
    scope.check();
    if (sourceCapabilities(item).supportsCatalog) {
      if (signal?.aborted) { sourceCatalogs.cancel(item.id); return; }
      await sourceCatalogs.load(item, signal);
      if (item.enabled) await sourceCatalogs.refresh(item, signal);
    }
  },
  update: async (id, patch, signal, options) => {
    const scope = libraryAccountScope.capture(); throwIfAborted(signal);
    const source = get().sources.find((item) => item.id === id);
    if (!source) throw new Error("Esta biblioteca não está disponível na conta atual.");
    const next = { ...source, ...patch, ownerId: scope.userId };
    const changed = sourceIdentity(next) !== sourceIdentity(source);
    if (!options?.prepared && (!next.enabled || changed)) sourceCatalogs.cancel(id);
    await repository.save(next, signal); scope.check();
    if (changed) googleDrive.clearIndex(id);
    if (options?.prepared) {
      try { await sourceCatalogs.commitPrepared(next, options.prepared, signal, options.context); scope.check(); }
      catch (error) { scope.check(); await repository.rollbackSave(next, source); throw error; }
      finally { if (scope.userId === libraryAccountScope.userId) await get().load(); }
      return;
    }
    await get().load();
    scope.check();
    if (sourceCapabilities(next).supportsCatalog) await sourceCatalogs.load(next, signal);
  },
  adoptLegacy: async id => {
    const scope = libraryAccountScope.capture();
    await repository.adoptLegacy(id); scope.check();
    await get().load();
  },
  remove: async (id) => {
    const scope = libraryAccountScope.capture();
    const source = get().sources.find(item => item.id === id);
    if (!source) throw new Error("Esta biblioteca não está disponível na conta atual.");
    await sourceCatalogs.remove(id);
    scope.check();
    if (source.kind === "google-drive") await googleDrive.disconnect(id);
    scope.check(); await repository.remove(id); scope.check();
    await get().load();
  },
}));

libraryAccountScope.subscribe(() => {
  // Clear synchronously, even for an A → B → A switch before an old read resolves.
  loadRevision++;
  useSourceStore.setState({ sources: [], legacySources: [], loadError: null });
  void useSourceStore.getState().load();
});
