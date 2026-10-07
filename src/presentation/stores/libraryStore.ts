import { create } from "zustand";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { appDependencies } from "@/src/presentation/services/dependencies";

interface LibraryState { books: LibraryBook[]; status: "idle" | "loading" | "success" | "error"; error: string | null; load: () => Promise<void>; }
export const useLibraryStore = create<LibraryState>((set) => ({
  books: [], status: "idle", error: null,
  load: async () => {
    set({ status: "loading", error: null });
    try {
      await Promise.all([appDependencies.bundledEpubCatalog.registerAll(), appDependencies.bundledPdfCatalog.importAll()]);
      const books = await appDependencies.getLibrary.execute();
      set({ books, status: "success", error: null });
    } catch (failure) {
      // Preserve the visible snapshot; failed persistence is never an empty success.
      set({ status: "error", error: failure instanceof Error ? failure.message : "Não foi possível carregar a biblioteca." });
    }
  },
}));
