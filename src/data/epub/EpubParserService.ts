import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { EpubParser, ParsedEpub } from "@/src/data/epub/EpubTypes";
import { EpubParsingError } from "@/src/data/epub/EpubErrors";
import { EpubValidatorService } from "@/src/data/epub/EpubValidatorService";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true });

export class EpubParserService implements EpubParser {
  constructor(private readonly validator = new EpubValidatorService()) {}
  async parse(bytes: Uint8Array): Promise<ParsedEpub> {
    await this.validator.validate(bytes);
    try {
      const zip = await JSZip.loadAsync(bytes);
      const container = xmlParser.parse(await zip.file("META-INF/container.xml")!.async("string"));
      const opfPath = String(container.container.rootfiles.rootfile["@_full-path"]);
      const opfDirectory = directoryOf(opfPath);
      const opf = xmlParser.parse(await zip.file(opfPath)!.async("string")).package;
      const metadata = opf.metadata ?? {};
      const title = textValue(metadata.title) || "Untitled book";
      const author = textValue(metadata.creator) || "Unknown author";
      const manifestItems = asArray(opf.manifest?.item);
      const manifest = new Map(manifestItems.map((item) => [String(item["@_id"]), item]));
      const spineItems = asArray(opf.spine?.itemref);
      const chapters = [];
      for (let index = 0; index < spineItems.length; index += 1) {
        const item = manifest.get(String(spineItems[index]["@_idref"]));
        if (!item?.["@_href"]) continue;
        const href = resolvePath(opfDirectory, String(item["@_href"]));
        const file = zip.file(href);
        if (!file) continue;
        const html = normalizeHtml(await file.async("string"));
        const text = extractText(html);
        if (!text.trim()) continue;
        chapters.push({ id: `${opfPath}:${index}`, chapterIndex: index, title: extractTitle(html) || `Chapter ${index + 1}`, startCfi: null, endCfi: null, characterCount: text.length, html });
      }
      if (!chapters.length) throw new EpubParsingError("O EPUB não possui capítulos legíveis.");
      return { title, author, opfPath, coverImagePath: findCoverPath(metadata, manifestItems, opfDirectory), chapters };
    } catch (error) {
      if (error instanceof EpubParsingError) throw error;
      throw new EpubParsingError("Não foi possível interpretar a estrutura do EPUB.", error);
    }
  }
}

function asArray<T>(value: T | T[] | undefined): T[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function textValue(value: unknown): string { if (typeof value === "string") return value.trim(); if (value && typeof value === "object" && "#text" in value) return String((value as { "#text": unknown })["#text"]).trim(); return ""; }
function directoryOf(filePath: string): string { const index = filePath.lastIndexOf("/"); return index < 0 ? "" : filePath.slice(0, index + 1); }
function resolvePath(directory: string, href: string): string { const cleanHref = decodeURIComponent(href.split("#")[0]); const parts = `${directory}${cleanHref}`.split("/"); const output: string[] = []; for (const part of parts) { if (!part || part === ".") continue; if (part === "..") output.pop(); else output.push(part); } return output.join("/"); }
function normalizeHtml(html: string): string { return html.replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/\son[a-z]+="[^"]*"/gi, "").replace(/\son[a-z]+='[^']*'/gi, ""); }
function extractText(html: string): string { return html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(); }
function extractTitle(html: string): string { return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, "").trim() ?? ""; }
function findCoverPath(metadata: Record<string, unknown>, manifestItems: Array<Record<string, unknown>>, directory: string): string | null { const coverId = textValue(metadata.meta && typeof metadata.meta === "object" && "@_name" in metadata.meta ? metadata.meta : ""); const coverItem = manifestItems.find((item) => String(item["@_properties"] ?? "").includes("cover-image") || String(item["@_id"]) === coverId); return coverItem?.["@_href"] ? resolvePath(directory, String(coverItem["@_href"])) : null; }
