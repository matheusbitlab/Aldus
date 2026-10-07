import { create } from "zustand";
import { ScrapedLink, SearchSourceStatus } from "@/src/domain/types/search";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { UserSourceRepository } from "@/src/data/sources/UserSourceRepository";
import { UserSourceSearchPlugin } from "@/src/data/scraping/UserSourceSearchPlugin";
import { GutendexSearchPlugin } from "@/src/data/scraping/GutendexSearchPlugin";
const sourceRepository = new UserSourceRepository();
let requestVersion = 0;
let activeRequest: AbortController | null = null;
type SearchStatus = "idle" | "loading" | "success" | "empty" | "partial" | "error";

interface SearchState {
	query: string;
	results: ScrapedLink[];
	sourceStatuses: SearchSourceStatus[];
	nextPageUrl: string | null;
	status: SearchStatus;
	error: string | null;
	setQuery: (query: string) => void;
	search: () => Promise<void>;
	loadMore: () => Promise<void>;
}

function chooseStatus(results: ScrapedLink[], sources: SearchSourceStatus[]): SearchStatus {
	const failures = sources.filter((source) => source.status === "error").length;
	if (results.length) return failures ? "partial" : "success";
	if (failures === sources.length && failures > 0) return "error";
	if (failures) return "partial";
	return "empty";
}

export const useSearchStore = create<SearchState>((set, get) => ({
	query: "",
	results: [],
	sourceStatuses: [],
	nextPageUrl: null,
	status: "idle",
	error: null,
	setQuery: (query) => {
		requestVersion++;
		activeRequest?.abort();
		set({ query, results: [], sourceStatuses: [], nextPageUrl: null, status: "idle", error: null });
	},
	search: async () => {
		const version = ++requestVersion;
		activeRequest?.abort();
		const controller = activeRequest = new AbortController();
		const query = get().query.trim();
		if (!query) {
			set({ results: [], sourceStatuses: [], nextPageUrl: null, status: "idle", error: null });
			return;
		}
		set({ status: "loading", results: [], error: null, sourceStatuses: [], nextPageUrl: null });
		try {
			const sources = (await sourceRepository.list()).filter((source) => source.enabled && source.status === "active");
			const plugins = [
				new GutendexSearchPlugin(),
				...sources.map((source) => new UserSourceSearchPlugin(source)),
			];
			if (version !== requestVersion) return;
			const response = await appDependencies.searchBooks.executeDetailed(query, plugins, {}, controller.signal);
			if (version !== requestVersion) return;
			const nextPageUrl = response.sources.find((source) => source.sourceName === "Gutendex")?.nextPageUrl ?? null;
			set({
				results: response.results,
				sourceStatuses: response.sources,
				nextPageUrl,
				status: chooseStatus(response.results, response.sources),
				error: response.sources.find((source) => source.status === "error")?.error ?? null,
			});
		} catch (failure) {
			if (version !== requestVersion) return;
			set({ status: "error", error: failure instanceof Error ? failure.message : "Não foi possível buscar livros." });
		}
	},
	loadMore: async () => {
		const { query, nextPageUrl, results, sourceStatuses } = get();
		if (!nextPageUrl || !query.trim() || get().status === "loading") return;
		const version = ++requestVersion;
		activeRequest?.abort();
		const controller = activeRequest = new AbortController();
		set({ status: "loading", error: null });
		try {
			const plugin = new GutendexSearchPlugin();
			const response = await appDependencies.searchBooks.executeDetailed(
				query,
				[plugin],
				{ [plugin.name]: nextPageUrl },
				controller.signal
			);
			if (version !== requestVersion) return;
			const mergedResults = [...new Map([...results, ...response.results].map((item) => [item.url, item])).values()];
			const updatedSources = [
				...sourceStatuses.filter((source) => source.sourceName !== plugin.name),
				...response.sources,
			];
			const updatedNextPage = response.sources[0]?.status === "error" ? nextPageUrl : response.sources[0]?.nextPageUrl ?? null;
			set({
				results: mergedResults,
				sourceStatuses: updatedSources,
				nextPageUrl: updatedNextPage,
				status: chooseStatus(mergedResults, updatedSources),
				error: response.sources.find((source) => source.status === "error")?.error ?? null,
			});
		} catch (failure) {
			if (version !== requestVersion) return;
			set({ status: "partial", error: failure instanceof Error ? failure.message : "Não foi possível carregar mais resultados." });
		}
	},
}));
