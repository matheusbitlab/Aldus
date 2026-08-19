export interface ScrapedLink { url: string; title: string; estimatedSize: number | null; sourceSite: string; format: "epub" | "mobi" | "unknown"; }
export interface SearchPlugin { name: string; getSearchEndpoint(query: string): string; parseResults(html: string): ScrapedLink[]; }
export interface SearchHistory { id: string; query: string; resultsCount: number; searchedAt: number; }
