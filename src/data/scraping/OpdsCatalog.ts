import { XMLParser, XMLValidator } from "fast-xml-parser";
import { ScrapedLink } from "@/src/domain/types/search";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true, parseTagValue: false });
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" ? value as RecordValue : {};
const array = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown): string => typeof value === "string" ? value.trim() : typeof record(value)["#text"] === "string" ? String(record(value)["#text"]).trim() : "";
function httpUrl(href: string, base: string): string | undefined {
  if (!href) return undefined;
  const url = new URL(href, base);
  return /^https?:$/.test(url.protocol) ? url.href : undefined;
}

export function readOpdsCatalog(payload: string, base: string, sourceSite: string, isBookNavigation?: (url: string) => boolean): { books: ScrapedLink[]; nextPageUrl: string | null } {
  if (XMLValidator.validate(payload) !== true) throw new Error("Catálogo OPDS inválido.");
  const parsed = parser.parse(payload);
  const feed = record(parsed.feed);
  if (!parsed.feed && !parsed.entry) throw new Error("A fonte não retornou um catálogo OPDS.");
  const readLinks = (value: unknown) => array(record(value).link).map(raw => {
    const l = record(raw);
    return { href: httpUrl(text(l["@_href"]), base), rel: text(l["@_rel"]), type: text(l["@_type"]) };
  });
  const entries = parsed.entry ? [parsed.entry] : array(feed.entry);
  const books: ScrapedLink[] = entries.flatMap(raw => {
    const e = record(raw), links = readLinks(e);
    const acquisition = links.find(l => l.href && /epub\+zip/i.test(l.type) && /acquisition/.test(l.rel));
    const navigation = links.find(l => l.href && /atom\+xml/.test(l.type) && (isBookNavigation ? isBookNavigation(l.href) : l.rel === "alternate" && Boolean(e.author)));
    const url = acquisition?.href ?? navigation?.href;
    if (!url || !text(e.title)) return [];
    const cover = links.find(l => /image|cover/.test(l.rel) && l.href);
    return [{ url, title: text(e.title), author: array(e.author).map(a => text(record(a).name)).filter(Boolean).join(", ") || (isBookNavigation && navigation ? text(e.content) : undefined),
      description: text(e.summary ?? (acquisition ? e.content : undefined)) || undefined,
      coverUrl: cover?.href, language: text(e.language) || undefined,
      catalogEntryUrl: acquisition ? undefined : navigation?.href,
      estimatedSize: null, sourceSite, format: acquisition ? "epub" as const : "unknown" as const }];
  });
  return { books, nextPageUrl: readLinks(feed).find(l => l.rel === "next")?.href ?? null };
}
