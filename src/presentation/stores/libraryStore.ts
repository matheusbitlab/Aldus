import { create } from "zustand";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { appDependencies } from "@/src/presentation/services/dependencies";

interface LibraryState { books: LibraryBook[]; status: "idle" | "loading" | "success" | "error"; error: string | null; load: () => Promise<void>; }
export const useLibraryStore = create<LibraryState>((set) => ({ books: [], status: "idle", error: null, load: async () => { set({ status: "loading", error: null }); try { await appDependencies.seedMockBook.execute(); const books = await appDependencies.getLibrary.execute(); set({ books, status: "success" }); } catch (error) { set({ status: "error", error: error instanceof Error ? error.message : "Não foi possível carregar a biblioteca." }); } } }));
