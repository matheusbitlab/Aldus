export interface ScrapedLink {
	url: string;
	title: string;
	author?: string;
	coverUrl?: string;
	description?: string;
	language?: string;
	subjects?: string[];
	downloadCount?: number;
	estimatedSize: number | null;
	sourceSite: string;
	format: "epub" | "mobi" | "pdf" | "unknown";
}

export interface SearchPlugin {
	name: string;
	/** Only legacy HTML crawlers consult robots; catalog APIs do not. */
	requiresRobotsPolicy?: boolean;
	skipLinkValidation?: boolean;
	getSearchEndpoint(query: string): string;
	parseResults(payload: string): ScrapedLink[];
	filterResults?(links: ScrapedLink[], query: string): ScrapedLink[];
	getNextPageUrl?(payload: string): string | null;
}

export interface SearchSourceStatus {
	sourceName: string;
	status: "success" | "empty" | "error";
	error?: string;
	nextPageUrl?: string | null;
}

export interface SearchExecutionResult {
	results: ScrapedLink[];
	sources: SearchSourceStatus[];
}
export interface SearchHistory { id: string; query: string; resultsCount: number; searchedAt: number; }
