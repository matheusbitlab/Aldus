import { create } from "zustand";
import { ScrapedLink, SearchSourceStatus } from "@/src/domain/types/search";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { UserSourceRepository } from "@/src/data/sources/UserSourceRepository";
import { GutendexSearchPlugin } from "@/src/data/scraping/GutendexSearchPlugin";
import { GutenbergSearchPlugin } from "@/src/data/scraping/GutenbergSearchPlugin";
import { builtinCatalogs, BUILTIN_CATALOG_NAMES, configuredCatalog } from "@/src/data/scraping/catalogPlugins";
const sourceRepository = new UserSourceRepository();
import { withAbort } from "@/src/core/utils/cancellation";
import { searchDiagnostic } from "@/src/utils/searchDiagnostics";
import { rankCatalogBooks } from "@/src/domain/search/catalogRanking";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
let requestVersion = 0;
let activeRequest: AbortController | null = null;
type SearchStatus = "idle" | "loading" | "success" | "empty" | "partial" | "error" | "cancelled";

interface SearchState {
	query: string;
	results: ScrapedLink[];
	sourceStatuses: SearchSourceStatus[];
	nextPageUrl: string | null;
	nextPageSource: string | null;
	status: SearchStatus;
	error: string | null;
	isSearching: boolean;
	selectedSource: string;
	pendingSources: string[];
	setQuery: (query: string) => void;
	selectSource: (source: string) => void;
	cancel: () => void;
	search: (source?: string) => Promise<void>;
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
	nextPageSource: null,
	status: "idle",
	error: null,
	isSearching: false,
	selectedSource: "Todos",
	pendingSources: [],
	selectSource: (selectedSource) => {
		requestVersion++; activeRequest?.abort();
		set({ selectedSource, results: [], sourceStatuses: [], pendingSources: [], nextPageUrl: null, status: "idle", isSearching: false, error: null });
	},
	cancel: () => {
		searchDiagnostic(requestVersion, "cancel");
		requestVersion++; activeRequest?.abort(); activeRequest = null;
		set({ isSearching: false, pendingSources: [], status: "cancelled", sourceStatuses: get().sourceStatuses.map(source => source.status === "loading" ? { ...source, status: "cancelled" } : source) });
	},
	setQuery: (query) => {
		requestVersion++;
		activeRequest?.abort();
		set({ query, results: [], sourceStatuses: [], pendingSources: [], nextPageUrl: null, status: "idle", isSearching: false, error: null });
	},
	search: async (selectedSource = get().selectedSource) => {
		const version = ++requestVersion;
		activeRequest?.abort();
		const controller = activeRequest = new AbortController();
		const query = get().query.trim();
		if (!query) {
			set({ results: [], sourceStatuses: [], nextPageUrl: null, status: "idle", isSearching: false, pendingSources: [], error: null });
			return;
		}
		set({ status: "loading", isSearching: true, selectedSource, results: [], error: null, sourceStatuses: [], pendingSources: [], nextPageUrl: null });
		searchDiagnostic(version, "start");
		try {
			searchDiagnostic(version, "source-list");
			const sources = BUILTIN_CATALOG_NAMES.includes(selectedSource) ? [] : (await withAbort(sourceRepository.list(), controller.signal)).filter((source) => source.enabled && source.status === "active");
			const plugins = [
				...(selectedSource === "Todos" ? builtinCatalogs() : selectedSource === "Gutendex" ? [new GutendexSearchPlugin()] : selectedSource === "Gutenberg" ? [new GutenbergSearchPlugin()] : []),
				...sources.filter(source => selectedSource === "Todos" || selectedSource === "Minhas Fontes" || source.name === selectedSource).map(configuredCatalog),
			];
			if (version !== requestVersion) return;
			searchDiagnostic(version, "plugins", { sourceCount: plugins.length });
			set({ pendingSources: plugins.map(plugin => plugin.name), sourceStatuses: plugins.map(plugin => ({ sourceName: plugin.name, status: "loading" })) });
			const response = await withAbort(appDependencies.searchBooks.executeDetailed(query, plugins, {}, controller.signal, {
				operationId: version,
				onPartial: partial => {
					if (version !== requestVersion) return;
					set({ results: partial.results, sourceStatuses: partial.sources, pendingSources: partial.pendingSources ?? [], status: partial.results.length ? "partial" : "loading" });
				},
			}), controller.signal);
			if (version !== requestVersion) return;
			const nextSource = response.sources.find(source => source.nextPageUrl);
			const nextPageUrl = nextSource?.nextPageUrl ?? null;
			set({
				isSearching: false, pendingSources: [],
				results: response.results,
				sourceStatuses: response.sources,
				nextPageUrl,
				nextPageSource: nextSource?.sourceName ?? null,
				status: chooseStatus(response.results, response.sources),
				error: response.sources.find((source) => source.status === "error")?.error ?? null,
			});
			searchDiagnostic(version, "set-status", { status: get().status, resultsCount: response.results.length });
		} catch (failure) {
			if (version !== requestVersion) return;
			set({ status: "error", isSearching: false, pendingSources: [], sourceStatuses: get().sourceStatuses.map(source => source.status === "loading" ? { ...source, status: "error", error: "Não foi possível concluir a consulta." } : source), error: failure instanceof Error ? failure.message : "Não foi possível buscar livros." });
			searchDiagnostic(version, "set-status", { status: "error" });
		}
	},
	loadMore: async () => {
		const { query, nextPageUrl, nextPageSource, results, sourceStatuses } = get();
		if (!nextPageUrl || !query.trim() || get().isSearching) return;
		const version = ++requestVersion;
		activeRequest?.abort();
		const controller = activeRequest = new AbortController();
		set({ status: "loading", isSearching: true, error: null, pendingSources: nextPageSource ? [nextPageSource] : [], sourceStatuses: sourceStatuses.map(source => source.sourceName === nextPageSource ? { ...source, status: "loading" } : source) });
		try {
			const plugin = builtinCatalogs().find(source => source.name === nextPageSource) ?? (await withAbort(sourceRepository.list(), controller.signal)).filter(source => source.enabled && source.status === "active" && source.name === nextPageSource).map(configuredCatalog)[0];
			if (!plugin) throw new Error("A fonte de paginação não está ativa.");
			const response = await withAbort(appDependencies.searchBooks.executeDetailed(
				query,
				[plugin],
				{ [plugin.name]: nextPageUrl },
				controller.signal,
				{ operationId: version }
			), controller.signal);
			if (version !== requestVersion) return;
			const mergedResults = rankCatalogBooks([...new Map([...results, ...response.results].map((item) => [item.url, item])).values()], query);
			const updatedSources = [
				...sourceStatuses.filter((source) => source.sourceName !== plugin.name),
				...response.sources,
			];
			const pagination = updatedSources.find(source => source.nextPageUrl && source.status !== "error");
			const updatedNextPage = response.sources[0]?.status === "error" ? nextPageUrl : pagination?.nextPageUrl ?? null;
			set({
				results: mergedResults,
				isSearching: false, pendingSources: [],
				sourceStatuses: updatedSources,
				nextPageUrl: updatedNextPage,
				nextPageSource: response.sources[0]?.status === "error" ? nextPageSource : pagination?.sourceName ?? null,
				status: chooseStatus(mergedResults, updatedSources),
				error: response.sources.find((source) => source.status === "error")?.error ?? null,
			});
		} catch (failure) {
			if (version !== requestVersion) return;
			set({ status: "partial", isSearching: false, pendingSources: [], sourceStatuses: sourceStatuses.map(source => source.sourceName === nextPageSource ? { ...source, status: "error", error: "Não foi possível carregar mais resultados." } : source), error: failure instanceof Error ? failure.message : "Não foi possível carregar mais resultados." });
		}
	},
}));

libraryAccountScope.subscribe(() => {
	requestVersion++; activeRequest?.abort(); activeRequest = null;
	useSearchStore.setState({ results: [], sourceStatuses: [], pendingSources: [], nextPageUrl: null,
		nextPageSource: null, selectedSource: "Todos", isSearching: false, status: "idle", error: null });
});
