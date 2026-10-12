export interface ScrapedLink {
  remoteBookId?: string;
  modifiedAt?: string;
  sourceId?: string;
  parentFolderId?: string;
  relativeFolderPath?: string;
  drive?: { fileId: string; resourceKey?: string; modifiedTime?: string; canDownload?: boolean };
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
	/** Partial OPDS entry; resolve the acquisition on explicit user action. */
	catalogEntryUrl?: string;
}

export interface SearchPlugin {
  /** Authenticated APIs can execute without exposing tokens in URLs/results. */
  search?(query: string, signal?: AbortSignal): Promise<ScrapedLink[]>;
	name: string;
	/** Only legacy HTML crawlers consult robots; catalog APIs do not. */
	requiresRobotsPolicy?: boolean;
	skipLinkValidation?: boolean;
	requestHeaders?: Record<string, string>;
	/** At most one reduced remote query when the ranked primary response is empty. */
	supportsQueryFallback?: boolean;
	getSearchEndpoint(query: string): string;
	parseResults(payload: string): ScrapedLink[];
	filterResults?(links: ScrapedLink[], query: string): ScrapedLink[];
	getNextPageUrl?(payload: string): string | null;
}

export interface SearchSourceStatus {
	sourceName: string;
	status: "loading" | "success" | "empty" | "error" | "cancelled";
	error?: string;
	nextPageUrl?: string | null;
}

export interface SearchExecutionResult {
	results: ScrapedLink[];
	sources: SearchSourceStatus[];
	pendingSources?: string[];
}
export interface SearchExecutionOptions { operationId?: number; onPartial?: (result: SearchExecutionResult) => void; }
export interface SearchHistory { id: string; query: string; resultsCount: number; searchedAt: number; }
