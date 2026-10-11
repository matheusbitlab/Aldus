import { create } from "zustand";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { appDependencies } from "@/src/presentation/services/dependencies";

interface LibraryState { books: LibraryBook[]; status: "idle" | "loading" | "success" | "error"; error: string | null; load: () => Promise<void>; refresh: () => Promise<void>; }
export const useLibraryStore = create<LibraryState>((set) => ({
  books: [], status: "idle", error: null,
  refresh:async()=>{const run=libraryAccountScope.capture();const books=await appDependencies.getLibrary.execute();run.check();set({books,status:'success',error:null});},
  load: async () => {
    const run = libraryAccountScope.capture();
    set({ status: "loading", error: null });
    try {
      await Promise.all([appDependencies.bundledEpubCatalog.registerAll(), appDependencies.bundledPdfCatalog.importAll()]);
      const books = await appDependencies.getLibrary.execute();
      run.check();
      set({ books, status: "success", error: null });
    } catch (failure) {
      try{run.check();}catch{return;}
      // Preserve the visible snapshot; failed persistence is never an empty success.
      set({ status: "error", error: failure instanceof Error ? failure.message : "Não foi possível carregar a biblioteca." });
    }
  },
}));
libraryAccountScope.subscribe(() => useLibraryStore.setState({ books: [], status: "idle", error: null }));
appDependencies.librarySync.onCompleted(()=>{void useLibraryStore.getState().refresh().catch(()=>undefined);});
