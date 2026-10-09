import * as cheerio from "cheerio/slim";
import { XMLParser } from "fast-xml-parser";
import { SearchPlugin, ScrapedLink } from "@/src/domain/types/search";
import { UserSource } from "@/src/domain/types/sources";
import { readOpdsCatalog } from "./OpdsCatalog";
import { rankCatalogBooks } from "@/src/domain/search/catalogRanking";

type AtomLink = Record<string, unknown>;
type AtomEntry = Record<string, unknown>;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
});

export class UserSourceSearchPlugin implements SearchPlugin {
  readonly skipLinkValidation = true;

  constructor(private readonly source: UserSource) {}

  get name(): string {
    return this.source.name;
  }

  getSearchEndpoint(query: string): string {
    const encodedQuery = encodeURIComponent(query.trim());
    if (this.source.url.includes("{query}")) {
      return this.source.url.replaceAll("{query}", encodedQuery);
    }
    if (this.source.kind === "json") return this.source.url;
    const endpoint = new URL(this.source.url);
    endpoint.searchParams.set(this.source.kind === "opds" ? "q" : "search", query.trim());
    return endpoint.toString();
  }

  parseResults(payload: string): ScrapedLink[] {
    if (this.source.kind === "json") return this.parseJson(payload);
    if (this.source.kind === "opds") return readOpdsCatalog(payload, this.source.url, this.name).books;
    return this.parseHtml(payload);
  }

  getNextPageUrl(payload: string): string | null {
    if (!/<(?:[\w.-]+:)?feed\b/i.test(payload)) return null;
    try {
      const feed = getRecord(xmlParser.parse(payload))?.feed;
      return this.findLink(feed, "next")?.href ?? null;
    } catch {
      return null;
    }
  }

  get requiresRobotsPolicy(): boolean { return this.source.kind === "html"; }

  private parseJson(payload: string): ScrapedLink[] {
    const catalog: unknown = JSON.parse(payload);
    const record = getRecord(catalog);
    const books = Array.isArray(catalog) ? catalog : record?.books;
    if (!Array.isArray(books)) throw new Error("Catálogo JSON inválido: use uma lista ou { books: [...] }.");
    return books.map((value) => {
      const book = getRecord(value);
      if (!book || typeof book.title !== "string" || !book.title.trim() || typeof book.url !== "string") {
        throw new Error("Cada livro precisa de title e url de EPUB.");
      }
      const url = new URL(book.url, this.source.url);
      if (!/^https?:$/.test(url.protocol) || (book.format !== undefined && book.format !== "epub")) {
        throw new Error("O catálogo V1 aceita aquisições EPUB por HTTP/HTTPS.");
      }
      const cover = typeof book.coverUrl === "string" ? new URL(book.coverUrl, this.source.url) : null;
      if (cover && !/^https?:$/.test(cover.protocol)) throw new Error("URL de capa inválida.");
      return {
        url: url.href, title: book.title.trim(),
        author: typeof book.author === "string" ? book.author : undefined,
        language: typeof book.language === "string" ? book.language : undefined,
        description: typeof book.description === "string" ? book.description : undefined,
        coverUrl: cover?.href, estimatedSize: null, sourceSite: this.name, format: "epub" as const,
      };
    });
  }

  filterResults(links: ScrapedLink[], query: string): ScrapedLink[] {
    return rankCatalogBooks(links, query);
  }
  get supportsQueryFallback(): boolean { return this.source.url.includes("{query}") || this.source.kind === "opds"; }

  private parseOpds(payload: string): ScrapedLink[] {
    try {
      const feed = getRecord(xmlParser.parse(payload))?.feed;
      const entries = toArray<AtomEntry>(getRecord(feed)?.entry);
      return entries.flatMap((entry) => {
        const links = toArray<AtomLink>(entry.link).map((link) => this.readLink(link));
        const acquisition = links.find((link) =>
          link.href && (link.rel.includes("acquisition") || /epub\+zip/i.test(link.type) || /\.epub(?:\?|$)/i.test(link.href))
        );
        if (!acquisition?.href || !/epub\+zip|\.epub(?:\?|$)/i.test(`${acquisition.type} ${acquisition.href}`)) return [];
        const author = getRecord(entry.author);
        const cover = links.find((link) => /image|cover/i.test(link.rel));
        const updated = new URL(acquisition.href, this.source.url).toString();
        return [{
          url: updated,
          title: readText(entry.title) || "Título indisponível",
          author: readText(author?.name) || undefined,
          coverUrl: cover?.href ? new URL(cover.href, this.source.url).toString() : undefined,
          description: readText(entry.summary ?? entry.content) || undefined,
          estimatedSize: null,
          sourceSite: this.source.name,
          format: "epub" as const,
        }];
      });
    } catch {
      return [];
    }
  }

  private parseHtml(html: string): ScrapedLink[] {
    const $ = cheerio.load(html);
    return $("a[href]").toArray().flatMap((element) => {
      const href = $(element).attr("href") ?? "";
      const title = $(element).text().trim();
      if (!title || !/\.epub(?:\?|$)/i.test(href)) return [];
      const url = new URL(href, this.source.url);
      if (!/^https?:$/.test(url.protocol)) return [];
      return [{
        url: url.toString(),
        title,
        estimatedSize: null,
        sourceSite: this.source.name,
        format: "epub" as const,
      }];
    });
  }

  private findLink(value: unknown, rel: string): { href: string; rel: string; type: string } | null {
    return toArray<AtomLink>(getRecord(value)?.link)
      .map((link) => this.readLink(link))
      .find((link) => link.rel.split(/\s+/).includes(rel) && link.href) ?? null;
  }

  private readLink(link: AtomLink): { href: string; rel: string; type: string } {
    return {
      href: readText(link["@_href"]),
      rel: readText(link["@_rel"]),
      type: readText(link["@_type"]),
    };
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function toArray<T>(value: unknown): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value as T[] : [value as T];
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const record = getRecord(value);
  return typeof record?.["#text"] === "string" ? String(record["#text"]).trim() : "";
}
