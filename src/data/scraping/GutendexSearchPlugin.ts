import { SearchPlugin, ScrapedLink } from "@/src/domain/types/search";

interface GutendexResponse {
	next?: string | null;
	results?: Array<{
		id: number;
		title?: string;
		authors?: Array<{ name?: string }>;
		formats?: Record<string, string>;
		languages?: string[];
		subjects?: string[];
		summaries?: string[];
		download_count?: number;
	}>;
}

export class GutendexSearchPlugin implements SearchPlugin {
  readonly supportsQueryFallback = true;
	name = "Gutendex";
	skipLinkValidation = true;

	getSearchEndpoint(query: string): string {
		return `https://gutendex.com/books/?search=${encodeURIComponent(query.trim())}`;
	}

	parseResults(payload: string): ScrapedLink[] {
		try {
			const data = JSON.parse(payload) as GutendexResponse;
			if (!Array.isArray(data.results)) throw new Error("Resposta Gutendex inválida.");
			return (data.results ?? []).flatMap((book) => {
				const epub = Object.entries(book.formats ?? []).find(
					([type]) => type.includes("application/epub+zip") && !type.includes("noimages")
				);
				const url = epub?.[1];
				if (!url) return [];
				return [{
					url,
					title: book.title ?? "Título indisponível",
					author: book.authors?.[0]?.name,
					coverUrl: book.formats?.["image/jpeg"],
					description: book.summaries?.[0],
					language: book.languages?.[0],
					subjects: book.subjects?.slice(0, 5),
					downloadCount: book.download_count,
					estimatedSize: null,
					sourceSite: this.name,
					format: "epub" as const,
				}];
			});
		} catch {
			throw new Error("Não foi possível interpretar a resposta Gutendex.");
		}
	}

	getNextPageUrl(payload: string): string | null {
		try {
			return (JSON.parse(payload) as GutendexResponse).next ?? null;
		} catch {
			return null;
		}
	}
}
