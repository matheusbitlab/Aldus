import { create } from "zustand";
import { ScrapedLink } from "@/src/domain/types/search";
import { appDependencies } from "@/src/presentation/services/dependencies";
interface SearchState { query: string; results: ScrapedLink[]; status: "idle" | "loading" | "success" | "empty" | "error"; error: string | null; setQuery: (query: string) => void; search: () => Promise<void>; }
export const useSearchStore = create<SearchState>((set, get) => ({ query: "", results: [], status: "idle", error: null, setQuery: (query) => set({ query }), search: async () => { const query = get().query; set({ status: "loading", error: null }); try { const results = await appDependencies.searchBooks.execute(query); set({ results, status: results.length ? "success" : "empty" }); } catch (error) { set({ status: "error", error: error instanceof Error ? error.message : "Search failed." }); } } }));
