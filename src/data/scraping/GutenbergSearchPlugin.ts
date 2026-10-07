import * as cheerio from "cheerio/slim";
import { SearchPlugin, ScrapedLink } from "@/src/domain/types/search";
export class GutenbergSearchPlugin implements SearchPlugin {
  name = "Project Gutenberg";
  requiresRobotsPolicy = true;
  getSearchEndpoint(query: string): string { return `https://www.gutenberg.org/ebooks/search/?query=${encodeURIComponent(query.trim())}`; }
  parseResults(html: string): ScrapedLink[] { const $ = cheerio.load(html); const links: ScrapedLink[] = []; $("a").each((_, element) => { const href = $(element).attr("href"); const title = $(element).text().trim(); if (!href || !title) return; const format = /\.epub(?:\?|$)/i.test(href) ? "epub" : /\.mobi(?:\?|$)/i.test(href) ? "mobi" : "unknown"; if (format === "unknown") return; links.push({ url: new URL(href, "https://www.gutenberg.org").toString(), title, estimatedSize: null, sourceSite: this.name, format }); }); return deduplicate(links); }
}
function deduplicate(links: ScrapedLink[]): ScrapedLink[] { return [...new Map(links.map((link) => [link.url, link])).values()]; }
