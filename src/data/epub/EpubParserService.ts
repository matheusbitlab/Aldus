import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { EpubParser, ParsedEpub } from "@/src/data/epub/EpubTypes";
import { EpubParsingError } from "@/src/data/epub/EpubErrors";
import { EpubValidatorService } from "@/src/data/epub/EpubValidatorService";
import { throwIfAborted, withAbort, cancellableWait } from "@/src/core/utils/cancellation";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true });

export class EpubParserService implements EpubParser {
  constructor(private readonly validator = new EpubValidatorService()) {}
  async parse(bytes: Uint8Array, signal?: AbortSignal): Promise<ParsedEpub> {
    throwIfAborted(signal);
    const zip = await withAbort(this.validator.openAndValidate(bytes, signal), signal);
    try {
      const resources = new ResourceContext(signal);
      const container = xmlParser.parse(await resources.read(zip.file("META-INF/container.xml")!, "string"));
      const opfPath = normalizePath(String(container.container.rootfiles.rootfile["@_full-path"]));
      const opfDirectory = directoryOf(opfPath);
      const opf = xmlParser.parse(await resources.read(zip.file(opfPath)!, "string")).package;
      const metadata = opf.metadata ?? {};
      const title = textValue(metadata.title) || "Sem título";
      const author = textValue(metadata.creator) || "Autor desconhecido";
      const manifestItems = asArray(opf.manifest?.item) as Array<Record<string, unknown>>;
      const manifest = new Map(manifestItems.map((item) => [String(item["@_id"]), item]));
      const manifestByPath = new Map(manifestItems.filter(item => item["@_href"]).map(item => [
        resolveResourcePath(opfPath, String(item["@_href"]), opfDirectory), item,
      ]));
      const spineItems = asArray(opf.spine?.itemref);
      const chapters: ChapterDraft[] = [];
      for (let index = 0; index < spineItems.length; index += 1) {
        await resources.checkpoint();
        const item = manifest.get(String(spineItems[index]["@_idref"]));
        if (!item?.["@_href"]) continue;
        const chapterPath = resolveResourcePath(opfPath, String(item["@_href"]), opfDirectory);
        const file = zip.file(chapterPath);
        if (!file) continue;
        const rawHtml = normalizeHtml(await resources.read(file, "string"));
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
      const resolvedChapters: ParsedEpub["chapters"] = [];
      for (const chapter of chapters) {
        await resources.checkpoint();
        let html = await inlineChapterResources(
          chapter.html,
          chapter.path,
          zip,
          opfDirectory,
          manifestByPath,
          resources
        );
        html = rewriteChapterLinks(html, chapter.path, opfDirectory, chapterIndexByPath);
        const { path: _path, ...storedChapter } = chapter;
        resolvedChapters.push({ ...storedChapter, html });
      }
      // Combined-document reader: retain each identical font rule only at its
      // last original location, preserving cascade order and media conditions.
      for (const chapter of resolvedChapters) chapter.html = resources.restoreFonts(chapter.html);
      throwIfAborted(signal);
      let coverImagePath: string | null = null;
      try { coverImagePath = await extractCover(opf, opfPath, opfDirectory, zip, manifestItems, resources); }
      catch { throwIfAborted(signal); /* Optional artwork must never prevent reading. */ }
      return { title, author, opfPath, coverImagePath, chapters: resolvedChapters };
    } catch (error) {
      throwIfAborted(signal);
      if (error instanceof EpubParsingError) throw error;
      throw new EpubParsingError("Não foi possível interpretar a estrutura do EPUB.", error);
    }
  }
}

/** Caches are owned by a single parse; no content survives a cancelled import. */
class ResourceContext {
  readonly dataUris = new Map<string, Promise<string | null>>();
  readonly stylesheets = new Map<string, Promise<string>>();
  readonly splitStyles = new Map<string, { css: string; fonts: string[] }>();
  private readonly fontFaces = new Map<string, { id: number; rule: string; last: number }>();
  private readonly fonts: Array<{ id: number; rule: string; last: number }> = [];
  private fontReference = 0;
  private lastYield = Date.now();
  constructor(readonly signal?: AbortSignal) {}
  async read(file: JSZip.JSZipObject, type: "string" | "base64"): Promise<string> {
    throwIfAborted(this.signal);
    const result = await withAbort(file.async(type), this.signal);
    throwIfAborted(this.signal);
    return result;
  }
  async checkpoint(): Promise<void> {
    throwIfAborted(this.signal);
    if (Date.now() - this.lastYield >= 8) {
      // A macrotask gives touch/cancel events a turn, unlike resolved Promises.
      await cancellableWait(0, this.signal);
      this.lastYield = Date.now();
    }
  }
  shareFonts(css: string): string {
    let split = this.splitStyles.get(css);
    if (!split) {
      const fonts: string[] = [];
      // Only top-level rules can be shared without dropping @media conditions.
      let depth = 0, quote = "", comment = false, start = -1;
      const pieces: string[] = [];
      let previous = 0;
      for (let i = 0; i < css.length; i++) {
        const char = css[i], next = css[i + 1];
        if (comment) { if (char === "*" && next === "/") { comment = false; i++; } continue; }
        if (quote) { if (char === "\\") i++; else if (char === quote) quote = ""; continue; }
        if (char === "/" && next === "*") { comment = true; i++; continue; }
        if (char === '"' || char === "'") { quote = char; continue; }
        if (depth === 0 && char === "@" && /^@font-face\s*\{/i.test(css.slice(i, i + 32))) start = i;
        if (char === "{") depth++;
        if (char === "}") {
          depth--;
          if (depth === 0 && start >= 0) {
            pieces.push(css.slice(previous, start), `/*aldus-font-rule:${fonts.length}*/`);
            fonts.push(css.slice(start, i + 1));
            previous = i + 1; start = -1;
          }
        }
      }
      pieces.push(css.slice(previous));
      split = { css: pieces.join(""), fonts };
      this.splitStyles.set(css, split);
    }
    return split.css.replace(/\/\*aldus-font-rule:(\d+)\*\//g, (_marker, index) => {
      const rule = split.fonts[Number(index)];
      let font = this.fontFaces.get(rule);
      if (!font) {
        font = { id: this.fonts.length, rule, last: 0 };
        this.fontFaces.set(rule, font); this.fonts.push(font);
      }
      font.last = ++this.fontReference;
      return `/*aldus-font-ref:${font.id}:${font.last}*/`;
    });
  }
  restoreFonts(html: string): string {
    return html.replace(/\/\*aldus-font-ref:(\d+):(\d+)\*\//g, (marker, id, reference) => {
      const font = this.fonts[Number(id)];
      return font ? font.last === Number(reference) ? font.rule : "" : marker;
    });
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

/** Read only the declared cover, never scan/decompress all archive images. */
async function extractCover(
  opf: { metadata?: { meta?: Record<string, unknown> | Array<Record<string, unknown>> }; guide?: { reference?: Record<string, unknown> | Array<Record<string, unknown>> } }, opfPath: string, directory: string, zip: JSZip,
  manifest: Array<Record<string, unknown>>, resources: ResourceContext,
): Promise<string | null> {
  const modern = manifest.find(item => String(item['@_properties'] ?? '').split(/\s+/).includes('cover-image'));
  const legacy = asArray(opf.metadata?.meta).find(item => String(item['@_name']).toLowerCase() === 'cover');
  const declared = modern ?? manifest.find(item => item['@_id'] === legacy?.['@_content']);
  let href = declared?.['@_href'];
  if (!href) {
    const guide = asArray(opf.guide?.reference).find(item => String(item['@_type']).split(/\s+/).includes('cover'));
    if (!guide?.['@_href'] || isExternalResource(String(guide['@_href']))) return null;
    const guidePath = resolveResourcePath(opfPath, String(guide['@_href']), directory);
    if (/\.(?:xhtml|html|htm)$/i.test(guidePath)) {
      const file = zip.file(guidePath);
      if (!file || archiveEntrySize(file) > 128 * 1024) return null;
      const html = await resources.read(file, 'string');
      const image = html.match(/<(?:img|image)\b[^>]*>/i)?.[0];
      href = image && (readAttribute(image, 'src') || readAttribute(image, 'href') || readAttribute(image, 'xlink:href'));
      if (href && !isExternalResource(String(href))) href = `/${resolveResourcePath(guidePath, String(href), directory).slice(directory.length)}`;
    } else href = guide['@_href'];
  }
  if (!href || isExternalResource(String(href))) return null;
  const path = resolveResourcePath(opfPath, String(href), directory), file = zip.file(path);
  // A bounded original is persisted once in existing cover metadata. No extra
  // full-book image extraction, network request or thumbnail dependency.
  if (!file || archiveEntrySize(file) > 1024 * 1024) return null;
  const type = String(declared?.['@_media-type'] ?? mimeTypeForPath(path)).toLowerCase();
  if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(type)) return null;
  const cached = resources.dataUris.get(path);
  const dataUri = cached ? await cached : `data:${type};base64,${await resources.read(file, 'base64')}`;
  if (!dataUri || dataUri.length > 1_400_000) return null;
  const head = atob(dataUri.slice(dataUri.indexOf(',') + 1).slice(0, 64));
  const valid = type === 'image/png' ? head.startsWith('\x89PNG\r\n\x1a\n') && head.length >= 24
    : type === 'image/jpeg' ? head.startsWith('\xff\xd8\xff') && head.length >= 16
    : type === 'image/gif' ? /^GIF8[79]a/.test(head) && head.length >= 10
    : head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP';
  return valid ? dataUri : null;
}

function archiveEntrySize(file: JSZip.JSZipObject): number {
  // JSZip's already parsed ZIP directory gives the uncompressed size before read.
  return (file as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? Infinity;
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
  manifestByPath: Map<string, Record<string, unknown>>,
  resources: ResourceContext
): Promise<string> {
  let output = html;

  const tags = [...output.matchAll(/<(?:img|image|source|video|audio|track)\b[^>]*>/gi)].reverse();
  for (const match of tags) {
    await resources.checkpoint();
    const tag = match[0];
    let updatedTag = tag;
    for (const attribute of ["src", "href", "xlink:href", "poster", "data-src"]) {
      const resource = readAttribute(updatedTag, attribute);
      if (!resource || isExternalResource(resource)) continue;
      const path = resolveResourcePath(chapterPath, resource, packageDirectory);
      const dataUri = await getResourceDataUri(path, zip, manifestByPath, resources);
      if (dataUri) updatedTag = replaceAttribute(updatedTag, attribute, dataUri);
    }
    const srcSet = readAttribute(updatedTag, "srcset");
    if (srcSet && !/^data:/i.test(srcSet)) {
      const candidates: string[] = [];
      for (const candidate of srcSet.split(",")) {
        const [source, ...descriptors] = candidate.trim().split(/\s+/);
        if (!source || isExternalResource(source)) { candidates.push(candidate.trim()); continue; }
        const path = resolveResourcePath(chapterPath, source, packageDirectory);
        const dataUri = await getResourceDataUri(path, zip, manifestByPath, resources);
        candidates.push(dataUri ? [dataUri, ...descriptors].join(" ") : candidate.trim());
      }
      updatedTag = replaceAttribute(updatedTag, "srcset", candidates.join(", "));
    }
    output = replaceAt(output, match.index ?? 0, tag.length, updatedTag);
  }

  for (const match of [...output.matchAll(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi)].reverse()) {
    const styleText = await inlineCssResources(match[2], chapterPath, zip, packageDirectory, manifestByPath, new Set(), resources);
    output = replaceAt(output, match.index ?? 0, match[0].length, ` style=${match[1]}${styleText}${match[1]}`);
  }

  // Process style/link nodes in source order, once; don't rescan expanded CSS.
  const styles = [...output.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>|<link\b[^>]*>/gi)];
  const replacements: Array<{ start: number; length: number; html: string }> = [];
  for (const match of styles) {
    await resources.checkpoint();
    let css: string;
    if (match[1] !== undefined) {
      css = await inlineCssResources(match[1], chapterPath, zip, packageDirectory, manifestByPath, new Set(), resources);
    } else {
      const href = readAttribute(match[0], "href");
      if (!/\bstylesheet\b/i.test(readAttribute(match[0], "rel") ?? "") || !href || isExternalResource(href)) continue;
      const path = resolveResourcePath(chapterPath, href, packageDirectory);
      if (!zip.file(path)) continue;
      css = await readStylesheet(path, zip, packageDirectory, manifestByPath, new Set([path]), resources);
    }
    const media = readAttribute(match[0], "media");
    if (!media) css = resources.shareFonts(css);
    replacements.push({ start: match.index ?? 0, length: match[0].length,
      html: `<style${media ? ` media="${media.replace(/"/g, "&quot;")}"` : ""}>${css.replace(/<\/style/gi, "<\\/style")}</style>` });
  }
  for (const replacement of replacements.reverse()) {
    output = replaceAt(output, replacement.start, replacement.length, replacement.html);
  }

  return output;
}

function readStylesheet(path: string, zip: JSZip, packageDirectory: string,
  manifest: Map<string, Record<string, unknown>>, visited: Set<string>, resources: ResourceContext): Promise<string> {
  const key = `${path}\n${[...visited].sort().join("\n")}`;
  let pending = resources.stylesheets.get(key);
  if (!pending) {
    pending = resources.read(zip.file(path)!, "string").then(css => inlineCssResources(css, path, zip, packageDirectory, manifest, visited, resources));
    resources.stylesheets.set(key, pending);
  }
  return withAbort(pending, resources.signal);
}

async function inlineCssResources(
  css: string,
  cssPath: string,
  zip: JSZip,
  packageDirectory: string,
  manifestByPath: Map<string, Record<string, unknown>>,
  visited: Set<string>,
  resources: ResourceContext
): Promise<string> {
  let output = css;
  for (const match of [...output.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?\s*([^;]*);/gi)].reverse()) {
    await resources.checkpoint();
    const href = match[2];
    if (isExternalResource(href)) continue;
    const path = resolveResourcePath(cssPath, href, packageDirectory);
    const file = zip.file(path);
    if (!file || visited.has(path)) {
      output = replaceAt(output, match.index ?? 0, match[0].length, "");
      continue;
    }
    const nextVisited = new Set(visited).add(path);
    let imported = await readStylesheet(path, zip, packageDirectory, manifestByPath, nextVisited, resources);
    const media = match[3].trim();
    if (media) imported = `@media ${media}{${imported}}`;
    output = replaceAt(output, match.index ?? 0, match[0].length, imported);
  }

  for (const match of [...output.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].reverse()) {
    await resources.checkpoint();
    const href = match[2].trim();
    if (!href || isExternalResource(href)) continue;
    const path = resolveResourcePath(cssPath, href, packageDirectory);
    const dataUri = await getResourceDataUri(path, zip, manifestByPath, resources, visited);
    if (dataUri) output = replaceAt(output, match.index ?? 0, match[0].length, `url("${dataUri}")`);
  }
  return output;
}

async function getResourceDataUri(
  path: string,
  zip: JSZip,
  manifestByPath: Map<string, Record<string, unknown>>,
  resources: ResourceContext,
  visited = new Set<string>()
): Promise<string | null> {
  await resources.checkpoint();
  if (visited.has(path)) return null;
  const file = zip.file(path);
  if (!file) return null;
  const mimeType = String(manifestByPath.get(path)?.["@_media-type"] ?? mimeTypeForPath(path));
  const svgResource = mimeType === "image/svg+xml" || path.toLowerCase().endsWith(".svg");
  const key = svgResource ? `${path}\n${[...visited].sort().join("\n")}` : path;
  const cached = resources.dataUris.get(key);
  if (cached) return withAbort(cached, resources.signal);
  const pending = resolveDataUri();
  resources.dataUris.set(key, pending);
  return withAbort(pending, resources.signal);
  async function resolveDataUri(): Promise<string> {
    if (svgResource) {
      const nextVisited = new Set(visited).add(path);
      const svg = await inlineSvgResources(
        await resources.read(file!, "string"), path, zip, directoryOf(path), manifestByPath, nextVisited, resources
      );
      return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
    }
    return `data:${mimeType};base64,${await resources.read(file!, "base64")}`;
  }
}

async function inlineSvgResources(
  svg: string,
  svgPath: string,
  zip: JSZip,
  packageDirectory: string,
  manifestByPath: Map<string, Record<string, unknown>>,
  visited: Set<string>,
  resources: ResourceContext
): Promise<string> {
  let output = await inlineCssResources(svg, svgPath, zip, packageDirectory, manifestByPath, visited, resources);
  for (const match of [...output.matchAll(/<image\b[^>]*>/gi)].reverse()) {
    let updatedTag = match[0];
    for (const attribute of ["href", "xlink:href"]) {
      const href = readAttribute(updatedTag, attribute);
      if (!href || isExternalResource(href)) continue;
      const path = resolveResourcePath(svgPath, href, packageDirectory);
      const dataUri = await getResourceDataUri(path, zip, manifestByPath, resources, visited);
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
