import { SearchPlugin, ScrapedLink } from "@/src/domain/types/search";
import { readOpdsCatalog } from "./OpdsCatalog";
export const gutenbergContact = process.env.EXPO_PUBLIC_CATALOG_CONTACT ?? "";
export class GutenbergSearchPlugin implements SearchPlugin {
  name = "Gutenberg";
  readonly skipLinkValidation = true;
  readonly supportsQueryFallback = true;
  get requestHeaders(): Record<string, string> { return { "User-Agent": `AldusReader/1.0 (+${gutenbergContact})` }; }
  getSearchEndpoint(query: string): string {
    if (!/^(https:\/\/|mailto:)[^\s\r\n]+$/.test(gutenbergContact)) throw new Error("Configure o contato público do aplicativo para usar o OPDS do Gutenberg.");
    return `https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(query.trim())}`;
  }
  parseResults(payload: string): ScrapedLink[] { return readOpdsCatalog(payload, "https://www.gutenberg.org/", this.name, url => /^https:\/\/www\.gutenberg\.org\/ebooks\/\d+\.opds$/.test(url)).books; }
  getNextPageUrl(payload: string): string | null { return readOpdsCatalog(payload, "https://www.gutenberg.org/", this.name).nextPageUrl; }
}
