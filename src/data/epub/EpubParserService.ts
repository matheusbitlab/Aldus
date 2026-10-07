import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { EpubParser, ParsedEpub } from "@/src/data/epub/EpubTypes";
import { EpubParsingError } from "@/src/data/epub/EpubErrors";
import { EpubValidatorService } from "@/src/data/epub/EpubValidatorService";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true });

export class EpubParserService implements EpubParser {
  constructor(private readonly validator = new EpubValidatorService()) {}
  async parse(bytes: Uint8Array): Promise<ParsedEpub> {
    const zip = await this.validator.openAndValidate(bytes);
    try {
      const container = xmlParser.parse(await zip.file("META-INF/container.xml")!.async("string"));
      const opfPath = normalizePath(String(container.container.rootfiles.rootfile["@_full-path"]));
      const opfDirectory = directoryOf(opfPath);
      const opf = xmlParser.parse(await zip.file(opfPath)!.async("string")).package;
      const metadata = opf.metadata ?? {};
      const title = textValue(metadata.title) || "Sem título";
      const author = textValue(metadata.creator) || "Autor desconhecido";
      const manifestItems = asArray(opf.manifest?.item) as Array<Record<string, unknown>>;
      const manifest = new Map(manifestItems.map((item) => [String(item["@_id"]), item]));
      const spineItems = asArray(opf.spine?.itemref);
      const chapters: ChapterDraft[] = [];
      for (let index = 0; index < spineItems.length; index += 1) {
        const item = manifest.get(String(spineItems[index]["@_idref"]));
        if (!item?.["@_href"]) continue;
        const chapterPath = resolveResourcePath(opfPath, String(item["@_href"]), opfDirectory);
        const file = zip.file(chapterPath);
        if (!file) continue;
        const rawHtml = normalizeHtml(await file.async("string"));
        const text = extractText(rawHtml);
        if (!text.trim()) continue;
        chapters.push({
          id: `${opfPath}:${index}`,
          chapterIndex: chapters.length,
          title: extractTitle(rawHtml) || `Capítulo ${index + 1}`,
          startCfi: null,
          endCfi: null,
          characterCount: text.length,
          html: rawHtml,
          path: chapterPath,
        });
      }
      if (!chapters.length) throw new EpubParsingError("O EPUB não possui capítulos legíveis.");
      const chapterIndexByPath = new Map(chapters.map((chapter) => [chapter.path, chapter.chapterIndex]));
      const resolvedChapters = await Promise.all(chapters.map(async (chapter) => {
        let html = await inlineChapterResources(
          chapter.html,
          chapter.path,
          zip,
          opfDirectory,
          manifestItems
        );
        html = rewriteChapterLinks(html, chapter.path, opfDirectory, chapterIndexByPath);
        const { path: _path, ...storedChapter } = chapter;
        return { ...storedChapter, html };
      }));
      return { title, author, opfPath, coverImagePath: null, chapters: resolvedChapters };
    } catch (error) {
      if (error instanceof EpubParsingError) throw error;
      throw new EpubParsingError("Não foi possível interpretar a estrutura do EPUB.", error);
    }
  }
}

interface ChapterDraft {
  id: string;
  chapterIndex: number;
  title: string;
  startCfi: null;
  endCfi: null;
  characterCount: number;
  html: string;
  path: string;
}

function asArray<T>(value: T | T[] | undefined): T[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function textValue(value: unknown): string { if (Array.isArray(value)) return value.map(textValue).find(Boolean) ?? ""; if (typeof value === "string") return value.trim(); if (value && typeof value === "object" && "#text" in value) return String((value as { "#text": unknown })["#text"]).trim(); return ""; }
function normalizePath(filePath: string): string { const output: string[] = []; for (const part of filePath.replace(/\\/g, "/").split("/")) { if (!part || part === ".") continue; if (part === "..") output.pop(); else output.push(part); } return output.join("/"); }
function directoryOf(filePath: string): string { const index = filePath.lastIndexOf("/"); return index < 0 ? "" : filePath.slice(0, index + 1); }
function decodePath(value: string): string { try { return decodeURIComponent(value.replace(/&amp;/gi, "&")); } catch { return value.replace(/&amp;/gi, "&"); } }
function resolveResourcePath(baseFilePath: string, href: string, packageDirectory: string): string {
  const target = decodePath(href.split(/[?#]/, 1)[0]);
  if (target.startsWith("/")) return normalizePath(`${packageDirectory}/${target.slice(1)}`);
  return normalizePath(`${directoryOf(baseFilePath)}${target}`);
}
function normalizeHtml(html: string): string {
  return html
    .replace(/<(script|iframe|object|embed|form|meta|base)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(?:script|iframe|object|embed|form|meta|base)\b[^>]*\/?\s*>/gi, "")
    .replace(/\s+on[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:href|src|xlink:href|action|formaction)\s*=\s*(["']?)\s*(?:javascript:|vbscript:|data:text\/html)[^\s>]*\1/gi, "");
}
function extractText(html: string): string { return html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(); }
function extractTitle(html: string): string { return html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, "").trim() ?? ""; }

async function inlineChapterResources(
  html: string,
  chapterPath: string,
  zip: JSZip,
  packageDirectory: string,
  manifestItems: Array<Record<string, unknown>>
): Promise<string> {
  const manifestByPath = new Map(
    manifestItems
      .filter((item) => item["@_href"])
      .map((item) => [
        resolveResourcePath(`${packageDirectory}/content.opf`, String(item["@_href"]), packageDirectory),
        item,
      ])
  );
  let output = html;

  for (const match of [...output.matchAll(/<link\b[^>]*>/gi)].reverse()) {
    const tag = match[0];
    const rel = readAttribute(tag, "rel") ?? "";
    const href = readAttribute(tag, "href");
    if (!/\bstylesheet\b/i.test(rel) || !href || isExternalResource(href)) continue;
    const path = resolveResourcePath(chapterPath, href, packageDirectory);
    const file = zip.file(path);
    if (!file) continue;
    const styles = await inlineCssResources(await file.async("string"), path, zip, packageDirectory, manifestByPath, new Set([path]));
    output = replaceAt(output, match.index ?? 0, tag.length, `<style>${styles.replace(/<\/style/gi, "<\\/style")}</style>`);
  }

  const tags = [...output.matchAll(/<(?:img|image|source|video|audio|track)\b[^>]*>/gi)].reverse();
  for (const match of tags) {
    const tag = match[0];
    let updatedTag = tag;
    for (const attribute of ["src", "href", "xlink:href", "poster", "data-src"]) {
      const resource = readAttribute(updatedTag, attribute);
      if (!resource || isExternalResource(resource)) continue;
      const path = resolveResourcePath(chapterPath, resource, packageDirectory);
      const dataUri = await getResourceDataUri(path, zip, manifestByPath);
      if (dataUri) updatedTag = replaceAttribute(updatedTag, attribute, dataUri);
    }
    const srcSet = readAttribute(updatedTag, "srcset");
    if (srcSet && !/^data:/i.test(srcSet)) {
      const candidates = await Promise.all(srcSet.split(",").map(async (candidate) => {
        const [source, ...descriptors] = candidate.trim().split(/\s+/);
        if (!source || isExternalResource(source)) return candidate.trim();
        const path = resolveResourcePath(chapterPath, source, packageDirectory);
        const dataUri = await getResourceDataUri(path, zip, manifestByPath);
        return dataUri ? [dataUri, ...descriptors].join(" ") : candidate.trim();
      }));
      updatedTag = replaceAttribute(updatedTag, "srcset", candidates.join(", "));
    }
    output = replaceAt(output, match.index ?? 0, tag.length, updatedTag);
  }

  for (const match of [...output.matchAll(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi)].reverse()) {
    const styleText = await inlineCssResources(match[2], chapterPath, zip, packageDirectory, manifestByPath, new Set());
    output = replaceAt(output, match.index ?? 0, match[0].length, ` style=${match[1]}${styleText}${match[1]}`);
  }

  for (const match of [...output.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].reverse()) {
    const styles = await inlineCssResources(match[1], chapterPath, zip, packageDirectory, manifestByPath, new Set());
    output = replaceAt(output, match.index ?? 0, match[0].length, match[0].replace(match[1], styles));
  }

  return output;
}

async function inlineCssResources(
  css: string,
  cssPath: string,
  zip: JSZip,
  packageDirectory: string,
  manifestByPath: Map<string, Record<string, unknown>>,
  visited: Set<string>
): Promise<string> {
  let output = css;
  for (const match of [...output.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?\s*([^;]*);/gi)].reverse()) {
    const href = match[2];
    if (isExternalResource(href)) continue;
    const path = resolveResourcePath(cssPath, href, packageDirectory);
    const file = zip.file(path);
    if (!file || visited.has(path)) {
      output = replaceAt(output, match.index ?? 0, match[0].length, "");
      continue;
    }
    const nextVisited = new Set(visited).add(path);
    let imported = await inlineCssResources(await file.async("string"), path, zip, packageDirectory, manifestByPath, nextVisited);
    const media = match[3].trim();
    if (media) imported = `@media ${media}{${imported}}`;
    output = replaceAt(output, match.index ?? 0, match[0].length, imported);
  }

  for (const match of [...output.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].reverse()) {
    const href = match[2].trim();
    if (!href || isExternalResource(href)) continue;
    const path = resolveResourcePath(cssPath, href, packageDirectory);
    const dataUri = await getResourceDataUri(path, zip, manifestByPath, visited);
    if (dataUri) output = replaceAt(output, match.index ?? 0, match[0].length, `url("${dataUri}")`);
  }
  return output;
}

async function getResourceDataUri(
  path: string,
  zip: JSZip,
  manifestByPath: Map<string, Record<string, unknown>>,
  visited = new Set<string>()
): Promise<string | null> {
  if (visited.has(path)) return null;
  const file = zip.file(path);
  if (!file) return null;
  const mimeType = String(manifestByPath.get(path)?.["@_media-type"] ?? mimeTypeForPath(path));
  if (mimeType === "image/svg+xml" || path.toLowerCase().endsWith(".svg")) {
    const nextVisited = new Set(visited).add(path);
    const svg = await inlineSvgResources(
      await file.async("string"),
      path,
      zip,
      directoryOf(path),
      manifestByPath,
      nextVisited
    );
    return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
  }
  return `data:${mimeType};base64,${await file.async("base64")}`;
}

async function inlineSvgResources(
  svg: string,
  svgPath: string,
  zip: JSZip,
  packageDirectory: string,
  manifestByPath: Map<string, Record<string, unknown>>,
  visited: Set<string>
): Promise<string> {
  let output = await inlineCssResources(svg, svgPath, zip, packageDirectory, manifestByPath, visited);
  for (const match of [...output.matchAll(/<image\b[^>]*>/gi)].reverse()) {
    let updatedTag = match[0];
    for (const attribute of ["href", "xlink:href"]) {
      const href = readAttribute(updatedTag, attribute);
      if (!href || isExternalResource(href)) continue;
      const path = resolveResourcePath(svgPath, href, packageDirectory);
      const dataUri = await getResourceDataUri(path, zip, manifestByPath, visited);
      if (dataUri) updatedTag = replaceAttribute(updatedTag, attribute, dataUri);
    }
    output = replaceAt(output, match.index ?? 0, match[0].length, updatedTag);
  }
  return output;
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function mimeTypeForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    css: "text/css",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    otf: "font/otf",
    png: "image/png",
    svg: "image/svg+xml",
    ttf: "font/ttf",
    woff: "font/woff",
    woff2: "font/woff2",
    webp: "image/webp",
  };
  return types[extension ?? ""] ?? "application/octet-stream";
}

function readAttribute(tag: string, name: string): string | null {
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return tag.match(new RegExp(`\\s${safeName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"))?.[2] ?? null;
}

function replaceAttribute(tag: string, name: string, value: string): string {
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(\\s${safeName}\\s*=\\s*)(["'])([\\s\\S]*?)\\2`, "i");
  return tag.replace(pattern, (_match, prefix, quote) => `${prefix}${quote}${value}${quote}`);
}

function isExternalResource(value: string): boolean {
  return /^(?:data:|https?:|blob:|file:|\/\/|#|mailto:|javascript:)/i.test(value.trim());
}

function replaceAt(value: string, start: number, length: number, replacement: string): string {
  return value.slice(0, start) + replacement + value.slice(start + length);
}

function rewriteChapterLinks(
  html: string,
  chapterPath: string,
  packageDirectory: string,
  chapterIndexByPath: Map<string, number>
): string {
  return html.replace(/<a\b[^>]*>/gi, (tag) => {
    const href = readAttribute(tag, "href");
    if (!href || isExternalResource(href)) return tag;
    const path = resolveResourcePath(chapterPath, href, packageDirectory);
    const chapterIndex = chapterIndexByPath.get(path);
    return chapterIndex === undefined ? tag : replaceAttribute(tag, "href", `#epub-chapter-${chapterIndex}`);
  });
}
