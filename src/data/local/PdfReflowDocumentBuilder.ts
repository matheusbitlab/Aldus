import {
  PdfReflowBlock,
  PdfReflowChapter,
  PdfReflowDocument,
  PdfReflowImage,
  PdfReflowPageData,
  PdfReflowTextItem,
  PdfReflowTocEntry,
} from "@/src/domain/types/pdfReader";
import { StoredChapter } from "@/src/domain/entities/LibraryBook";

interface VisualLine {
  pageNumber: number;
  pageHeight: number;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  pageLeft: number;
}

interface FlowParagraph {
  text: string;
  pageNumber: number;
  x: number;
  y: number;
  fontSize: number;
  pageLeft: number;
}

export function buildPdfReflowDocument(
  pages: PdfReflowPageData[],
  pageCount: number
): PdfReflowDocument {
  const chapters: PdfReflowChapter[] = [{ id: "chapter-0", title: "Início", blocks: [] }];
  const pageLines = pages.map((page) => ({ page, lines: groupTextItems(page) }));
  const repeatedHeaders = findRepeatedPageFurniture(pageLines);
  const toc: PdfReflowTocEntry[] = [];
  const textPages = new Set<number>();
  const imagePages = new Set<number>();
  let characterCount = 0;
  let tocMode = false;
  let paragraph: FlowParagraph | null = null;

  const flushParagraph = () => {
    if (!paragraph) return;
    const text = normalizeText(paragraph.text);
    if (text) {
      characterCount += text.length;
      chapters[chapters.length - 1].blocks.push({
        type: "paragraph",
        text,
        pageNumber: paragraph.pageNumber,
      });
      textPages.add(paragraph.pageNumber);
    }
    paragraph = null;
  };

  for (const { page, lines } of pageLines) {
    const bodyFontSize = median(lines.filter((line) => line.text.length > 35).map((line) => line.fontSize));
    const dropCapImages = new Set(
      page.images.filter((image) => isDropCapImage(image, page, lines))
    );
    const events: Array<{ kind: "line"; line: VisualLine } | { kind: "image"; image: PdfReflowImage }> = [
      ...lines.map((line) => ({ kind: "line" as const, line })),
      ...page.images.map((image) => ({ kind: "image" as const, image })),
    ].sort((first, second) => eventY(first) - eventY(second));

    for (const event of events) {
      if (event.kind === "image") {
        flushParagraph();
        if (event.image.width < 24 || event.image.height < 24) continue;
        chapters[chapters.length - 1].blocks.push({
          type: "image",
          src: event.image.src,
          alt: dropCapImages.has(event.image) ? "Letra capitular decorativa" : "Ilustração",
          presentation: dropCapImages.has(event.image) ? "drop-cap" : undefined,
          pageNumber: page.pageNumber,
        });
        imagePages.add(page.pageNumber);
        continue;
      }

      const line = event.line;
      const text = normalizeText(line.text);
      if (!text || isRepeatedPageFurniture(text, page.pageNumber, line.y, line.pageHeight, repeatedHeaders)) continue;

      if (/^(?:SUM[AÁ]RIO|[ÍI]NDICE|CONTENTS|TABLE OF CONTENTS)$/i.test(text)) {
        flushParagraph();
        tocMode = true;
        continue;
      }

      const tocEntry = tocMode ? parseTocEntry(text) : null;
      if (tocEntry) {
        flushParagraph();
        toc.push(tocEntry);
        continue;
      }

      if (/^\d{1,4}$/.test(text) && (line.y < line.pageHeight * 0.1 || line.y > line.pageHeight * 0.9)) continue;

        const chapterHeading = normalizeChapterHeading(text);
      const chapterKey = getChapterHeadingKey(chapterHeading);
      if (chapterKey) {
        tocMode = false;
        const currentChapter = chapters[chapters.length - 1];
        // Running chapter labels are repeated in this PDF's page furniture. Check
        // them before flushing: they must not split a paragraph at a page edge.
        if (getChapterHeadingKey(currentChapter.title) === chapterKey) continue;
        flushParagraph();
        if (currentChapter.blocks.length > 0) {
          chapters.push({ id: `chapter-${chapters.length}`, title: chapterHeading, blocks: [] });
        } else {
          currentChapter.title = chapterHeading;
        }
        chapters[chapters.length - 1].blocks.push({
          type: "heading",
          text: chapterHeading,
          level: 1,
          pageNumber: page.pageNumber,
        });
        continue;
      }

      if (tocMode) {
        tocMode = false;
      }

      if (isLikelyHeading(line, bodyFontSize)) {
        flushParagraph();
        chapters[chapters.length - 1].blocks.push({
          type: "heading",
          text,
          level: line.fontSize >= bodyFontSize * 1.5 ? 1 : 2,
          pageNumber: page.pageNumber,
        });
        characterCount += text.length;
        textPages.add(page.pageNumber);
        continue;
      }

      const next: FlowParagraph = { text, pageNumber: page.pageNumber, x: line.x, y: line.y, fontSize: line.fontSize, pageLeft: line.pageLeft };
      if (!paragraph || shouldStartParagraph(paragraph, next)) {
        flushParagraph();
        paragraph = next;
      } else {
        paragraph.text = joinWrappedLines(paragraph.text, text);
        paragraph.pageNumber = page.pageNumber;
        paragraph.y = line.y;
        paragraph.pageLeft = line.pageLeft;
      }
    }
  }
  flushParagraph();

  const minimumText = Math.max(500, pageCount * 20);
  const classification = characterCount < minimumText
    ? "image-based"
    : imagePages.size > 0
    ? "mixed"
    : "text-based";

  return {
    classification,
    pageCount,
    textPageCount: textPages.size,
    imagePageCount: imagePages.size,
    characterCount,
    chapters: chapters.filter((chapter) => chapter.blocks.length > 0),
    toc: deduplicateTocEntries(toc),
  };
}

function isDropCapImage(
  image: PdfReflowImage,
  page: PdfReflowPageData,
  lines: VisualLine[]
): boolean {
  if (
    image.width <= 0 ||
    image.height / image.width < 1.7 ||
    image.width > page.pageWidth * 0.22 ||
    image.height > page.pageHeight * 0.3 ||
    image.x > page.pageWidth * 0.3
  ) return false;

  return lines.some((line) => {
    const text = line.text.trim();
    if (!/^\p{Ll}/u.test(text)) return false;
    const lineTop = line.pageHeight - line.y - line.fontSize;
    const lineBottom = line.pageHeight - line.y;
    const overlapsFirstLine = image.y <= lineBottom && image.y + image.height >= lineTop;
    const startsBesideImage =
      line.x - line.pageLeft >= line.fontSize * 1.8 &&
      image.x <= line.pageLeft + line.fontSize * 2.8 &&
      image.x + image.width >= line.x - line.fontSize * 1.5 &&
      image.x + image.width <= line.x + line.fontSize * 2.5;
    return overlapsFirstLine && startsBesideImage;
  });
}

function groupTextItems(page: PdfReflowPageData): VisualLine[] {
  const items = page.textItems
    .map((item) => ({ ...item, fontSize: Math.max(6, item.height || 12) }))
    .sort((first, second) => second.y - first.y || first.x - second.x);
  const lines: Array<{ y: number; items: typeof items }> = [];

  for (const item of items) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(2, item.fontSize * 0.16));
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  const pageLeft = lines.length ? Math.min(...lines.map((line) => Math.min(...line.items.map((item) => item.x)))) : 0;
  return lines.map((line) => {
    const sortedItems = line.items.sort((first, second) => first.x - second.x);
    return {
      pageNumber: page.pageNumber,
      pageHeight: page.pageHeight,
      text: reconstructLine(sortedItems),
      x: sortedItems[0]?.x ?? 0,
      y: line.y,
      width: sortedItems.reduce((right, item) => Math.max(right, item.x + item.width), 0) - (sortedItems[0]?.x ?? 0),
      fontSize: median(sortedItems.map((item) => item.fontSize)),
      pageLeft,
    };
  }).sort((first, second) => second.y - first.y || first.x - second.x);
}

function reconstructLine(items: Array<PdfReflowTextItem & { fontSize: number }>): string {
  if (isTrackedGlyphLine(items)) {
    const fragments = items.map((item) => ({
      text: compactSpacedLetters(item.text).replace(/\s+/g, "").trim(),
      x: item.x,
      right: item.x + item.width,
    })).filter((item) => item.text);
    const gaps = fragments.slice(1).map((item, index) => item.x - fragments[index].right).filter((gap) => gap > 0);
    const typicalGap = median(gaps.filter((gap) => gap <= items[0].fontSize * 1.2)) || median(gaps);
    const trackingGap = typicalGap || 0;
    const wordGap = Math.max(items[0].fontSize * 0.9, trackingGap * 1.9);
    return fragments.map((item, index) => `${index > 0 && item.x - fragments[index - 1].right > wordGap ? " " : ""}${item.text}`).join("");
  }

  let result = "";
  let previousRight = 0;
  let previousText = "";
  for (const item of items) {
    const text = compactSpacedLetters(item.text);
    if (!text) continue;
    const gap = item.x - previousRight;
    const wordGap = Math.max(1, item.fontSize * 0.2);
    const needsSpace = result.length > 0 &&
      !/\s$/.test(result) &&
      !/^\s/.test(text) &&
      gap > wordGap &&
      !isPunctuationStart(text) &&
      !isOpeningPunctuationEnd(result);
    result += `${needsSpace ? " " : ""}${text}`;
    previousRight = item.x + item.width;
    previousText = text;
  }
  return result || previousText;
}

function isTrackedGlyphLine(items: Array<PdfReflowTextItem & { fontSize: number }>): boolean {
  const letters = items.filter((item) => /\p{L}/u.test(item.text));
  if (letters.length < 5) return false;
  const shortFragments = letters.filter((item) => compactSpacedLetters(item.text).replace(/\s/g, "").length <= 2).length;
  const gaps = letters.slice(1).map((item, index) => item.x - (letters[index].x + letters[index].width));
  const largeGaps = gaps.filter((gap) => gap > Math.max(2, letters[0].fontSize * 0.22)).length;
  return shortFragments / letters.length >= 0.8 && largeGaps / Math.max(1, gaps.length) >= 0.6;
}

function shouldStartParagraph(previous: FlowParagraph, next: FlowParagraph): boolean {
  if (previous.pageNumber !== next.pageNumber) {
    const startsIndented = next.x - next.pageLeft > Math.max(18, next.fontSize * 1.1);
    return startsIndented && /[.!?]["”’')\]]*$/u.test(previous.text.trim());
  }
  const verticalGap = previous.y - next.y;
  const lineHeight = Math.max(previous.fontSize, next.fontSize);
  const startsIndented = next.x - next.pageLeft > Math.max(18, lineHeight * 1.1);
  return verticalGap > lineHeight * 2.2 || (startsIndented && /[.!?]["”’')\]]*$/u.test(previous.text.trim()));
}

function joinWrappedLines(previous: string, next: string): string {
  if (/[\p{L}][\-\u00ad]$/u.test(previous) && /^\p{Ll}/u.test(next)) {
    return `${previous.slice(0, -1)}${next}`;
  }
  return `${previous.replace(/[\u00ad]$/u, "").trimEnd()} ${next.trimStart()}`;
}

function isPunctuationStart(text: string): boolean {
  return /^[,.;:!?%)\]}»”’]/u.test(text);
}

function isOpeningPunctuationEnd(text: string): boolean {
  return /[([{«“‘]$/u.test(text.trimEnd());
}

function eventY(event: { kind: "line"; line: VisualLine } | { kind: "image"; image: PdfReflowImage }): number {
  return event.kind === "line" ? event.line.pageHeight - event.line.y : event.image.y;
}

function findRepeatedPageFurniture(pages: Array<{ page: PdfReflowPageData; lines: VisualLine[] }>): Set<string> {
  const seen = new Map<string, Set<number>>();
  for (const { page, lines } of pages) {
    for (const line of lines) {
      if (line.y > page.pageHeight * 0.12 && line.y < page.pageHeight * 0.88) continue;
      const key = normalizeText(line.text).toLocaleLowerCase("pt-BR");
      if (key.length < 4 || key.length > 80) continue;
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(page.pageNumber);
    }
  }
  const threshold = Math.max(4, Math.ceil(pages.length * 0.12));
  return new Set([...seen].filter(([, pageNumbers]) => pageNumbers.size >= threshold).map(([key]) => key));
}

function isRepeatedPageFurniture(
  text: string,
  pageNumber: number,
  y: number,
  pageHeight: number,
  repeatedHeaders: Set<string>
): boolean {
  if (y > pageHeight * 0.12 && y < pageHeight * 0.88) return false;
  return repeatedHeaders.has(normalizeText(text).toLocaleLowerCase("pt-BR")) || /^\d{1,4}$/.test(text);
}

function parseTocEntry(text: string): PdfReflowTocEntry | null {
  const normalized = normalizeText(text).replace(/[.…·]{2,}\s*/gu, " ");
  const match = normalized.match(/^(CAP[IÍ]TULO|CHAPTER)\s+([IVXLCDM]+|\d+)(?:\s+(.+?))?\s+(\d{1,4})$/i);
  if (!match) return null;
  const title = match[3]?.replace(/[.…·]+$/gu, "").trim();
  return {
    title: `${match[1]} ${match[2]}${title ? ` ${title}` : ""}`,
    pageNumber: Number(match[4]),
  };
}

function deduplicateTocEntries(entries: PdfReflowTocEntry[]): PdfReflowTocEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${getChapterHeadingKey(entry.title)}:${entry.pageNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isLikelyHeading(line: VisualLine, bodyFontSize: number): boolean {
  return line.text.trim().length >= 3 && line.text.length <= 100 && bodyFontSize > 0 && line.fontSize >= bodyFontSize * 1.35;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.floor(sorted.length / 2)];
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function compactSpacedLetters(value: string): string {
  const tokens = value.trim().split(/\s+/u);
  let longestSingleLetterRun = 0;
  let currentSingleLetterRun = 0;
  let joinsRunToUppercase = false;
  for (let index = 0; index < tokens.length; index += 1) {
    if (/^\p{L}$/u.test(tokens[index])) {
      currentSingleLetterRun += 1;
      longestSingleLetterRun = Math.max(longestSingleLetterRun, currentSingleLetterRun);
      continue;
    }
    if (
      currentSingleLetterRun >= 3 &&
      /^\p{Lu}\p{L}{2,}$/u.test(tokens[index])
    ) joinsRunToUppercase = true;
    currentSingleLetterRun = 0;
  }
  const isTrackedText = longestSingleLetterRun >= 4 || joinsRunToUppercase;
  const compact = isTrackedText
    ? tokens.reduce((output, token, index) => {
        if (!index) return token;
        const previous = tokens[index - 1];
        const previousIsLetter = /^\p{L}$/u.test(previous);
        const currentIsLetter = /^\p{L}$/u.test(token);
        const continuesTrackedWord =
          currentIsLetter ||
          (/^\p{Lu}\p{L}{2,}$/u.test(token) &&
            tokens.slice(Math.max(0, index - 3), index).every((part) => /^\p{L}$/u.test(part)));
        const joinsAsGlyphs = previousIsLetter && currentIsLetter;
        const camelCaseWordBoundary = /\p{Ll}$/u.test(previous) && /^\p{Lu}/u.test(token);
        const separator =
          joinsAsGlyphs
            ? camelCaseWordBoundary ? " " : ""
            : continuesTrackedWord ? "" : " ";
        return `${output}${separator}${token}`;
      }, "")
    : value;
  return compact.replace(/^(CAP[IÍ]TULO|CHAPTER)(?=[IVXLCDM0-9])/i, "$1 ");
}

function normalizeChapterHeading(value: string): string {
  const compact = compactSpacedLetters(normalizeText(value));
  const match = compact.match(/^(CAP[IÍ]TULO|CHAPTER)\s+((?:[IVXLCDM]\s*)+|\d+)/i);
  return match ? `${match[1]} ${match[2].replace(/\s+/g, "")}` : compact;
}
export function toStoredReflowChapters(
  bookId: string,
  document: PdfReflowDocument
): StoredChapter[] {
  return document.chapters.map((chapter, chapterIndex) => {
    const toc = chapterIndex === 0 && document.toc.length
      ? `<nav class="reader-toc"><h1>Sumário</h1><ol>${document.toc.map((entry) => {
          const targetIndex = document.chapters.findIndex((candidate) => getChapterHeadingKey(candidate.title) === getChapterHeadingKey(entry.title));
          const target = targetIndex >= 0 ? targetIndex : 0;
          return `<li><a href="#epub-chapter-${target}">${escapeHtml(entry.title)}</a></li>`;
        }).join("")}</ol></nav>`
      : "";
    const blocks = chapter.blocks.map((block) => {
      if (block.type === "image" && block.src) {
        const className = block.presentation === "drop-cap" ? " class=\"pdf-reflow-drop-cap\"" : "";
        return `<figure${className}><img data-pdf-reflow-image="true" src="${escapeAttribute(block.src)}" alt="${escapeAttribute(block.alt ?? "Ilustração")}" /></figure>`;
      }
      if (block.type === "heading") {
        const level = Math.min(3, Math.max(1, block.level ?? 2));
        return `<h${level}>${escapeHtml(block.text ?? "")}</h${level}>`;
      }
      return `<p>${escapeHtml(block.text ?? "")}</p>`;
    }).join("\n");

    return {
      id: `${bookId}-reflow-${chapterIndex}`,
      bookId,
      chapterIndex,
      title: chapter.title,
      startCfi: null,
      endCfi: null,
      characterCount: chapter.blocks.reduce((total, block) => total + (block.text?.length ?? 0), 0),
      html: `<body><article>${toc}${blocks}</article></body>`,
    };
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function getChapterHeadingKey(value: string): string | null {
  const normalized = normalizeChapterHeading(value);
  const match = normalized.match(/^(CAP[IÍ]TULO|CHAPTER)\s+([IVXLCDM]+|\d+)/i);
  if (!match) return null;
  const label = match[1].toLocaleUpperCase("pt-BR").replace("Í", "I");
  const ordinal = /^\d+$/.test(match[2]) ? Number(match[2]) : romanToNumber(match[2]);
  return Number.isFinite(ordinal) ? `${label}:${ordinal}` : null;
}

function romanToNumber(roman: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let index = 0; index < roman.length; index += 1) {
    const current = values[roman[index].toUpperCase()] ?? 0;
    const next = values[roman[index + 1]?.toUpperCase()] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}
