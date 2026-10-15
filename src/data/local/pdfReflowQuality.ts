import type { PdfReflowDocument, PdfReflowPageData, PdfReflowQuality } from "@/src/domain/types/pdfReader";
import { runCooperatively } from "@/src/core/utils/cooperativeWork";

export const PDF_REFLOW_QUALITY_VERSION = 1;
export const PDF_OCR_VALIDATION_VERSION = 1;
export const CORRUPT_PDF_TEXT = "A extração de texto deste PDF está corrompida. O PDF Original continua disponível.";

export function assessTextExtractionQuality(items: Iterable<{ text: string }>): PdfReflowQuality {
  const steps = assessTextQualitySteps(items);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

export function* assessTextQualitySteps(items: Iterable<{ text: string }>): Generator<void, PdfReflowQuality> {
  let totalChars = 0, controlChars = 0, letterChars = 0, replacementChars = 0;
  let slice = 0;
  for (const { text } of items) {
    totalChars += text.length;
    for (const char of text) {
      if (char === "\uFFFD") replacementChars++;
      if (/^[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]$/u.test(char)) controlChars++;
      if (/\p{L}/u.test(char)) letterChars++;
      if (++slice >= 4096) { slice = 0; yield; }
    }
  }
  return { version: PDF_REFLOW_QUALITY_VERSION, totalChars, controlChars, letterChars, replacementChars };
}

// Same conservative rule previously used on Web. Numeric/PUA glyphs alone
// are not evidence of corrupt prose; never attempt to reconstruct encoding.
export function isClearlyCorruptedTextExtraction(q: PdfReflowQuality): boolean {
  if (q.totalChars <= 0 || q.controlChars < 100) return false;
  const controls = q.controlChars / q.totalChars, letters = q.letterChars / q.totalChars;
  return controls >= 0.2 && (letters < 0.35 || (controls > 0.6 && letters < 0.5));
}

export function validateReflowPages(pages: PdfReflowPageData[], count: number): PdfReflowQuality {
  const steps = validateReflowPagesSteps(pages, count);
  let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}

export function* validateReflowPagesSteps(pages: PdfReflowPageData[], count: number): Generator<void, PdfReflowQuality> {
  if (!Number.isInteger(count) || count < 1 || pages.length !== count || pages.some((p, i) => p.pageNumber !== i + 1)) {
    throw new Error("A extração do PDF não foi concluída. O arquivo original continua disponível.");
  }
  const quality = assessTextExtractionQuality([]);
  for (const page of pages) {
    const part = yield* assessTextQualitySteps(page.textItems);
    quality.totalChars += part.totalChars;
    quality.controlChars += part.controlChars;
    quality.letterChars += part.letterChars;
    quality.replacementChars += part.replacementChars;
    yield;
  }
  if (isClearlyCorruptedTextExtraction(quality)) throw new Error(CORRUPT_PDF_TEXT);
  return quality;
}

export function isValidatedReflowDocument(document: PdfReflowDocument | null | undefined): document is PdfReflowDocument {
  const steps = validateDocumentSteps(document);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

export function isValidatedReflowDocumentAsync(document: PdfReflowDocument | null | undefined, signal?: AbortSignal): Promise<boolean> {
  return runCooperatively(validateDocumentSteps(document), signal);
}

function* validateDocumentSteps(document: PdfReflowDocument | null | undefined): Generator<void, boolean> {
  try {
    const q = document?.extractionQuality;
    const derivation = document?.derivation;
    if (!q || q.version !== PDF_REFLOW_QUALITY_VERSION || !Number.isInteger(document?.pageCount) || document.pageCount < 1) return false;
    if (!derivation || derivation.version !== 1 || derivation.validationVersion !== PDF_OCR_VALIDATION_VERSION) return false;
    if (!Number.isInteger(derivation.ocrPageCount) || derivation.ocrPageCount < 0 || derivation.ocrPageCount !== derivation.ocrPages.length) return false;
    if (!['text-extraction','ocr','hybrid'].includes(derivation.source)) return false;
    if (new Set(derivation.ocrPages).size !== derivation.ocrPages.length || derivation.ocrPages.some(page => !Number.isInteger(page) || page < 1 || page > document.pageCount)) return false;
    if (derivation.source === "text-extraction" && derivation.ocrPageCount !== 0) return false;
    if (derivation.source === "ocr" && derivation.ocrPageCount !== document.pageCount) return false;
    if (derivation.source === "hybrid" && (derivation.ocrPageCount < 1 || derivation.ocrPageCount >= document.pageCount)) return false;
    if (derivation.source !== "text-extraction" && (!derivation.ocrEngine || !derivation.ocrEngineVersion || derivation.ocrPageCount < 1)) return false;
    if (![q.totalChars, q.controlChars, q.letterChars, q.replacementChars].every(n => Number.isFinite(n) && n >= 0) || isClearlyCorruptedTextExtraction(q)) return false;
    // Recheck the actual derivative too: matching version/metadata cannot bless bad text.
    const derived = yield* assessTextQualitySteps((function* () { for (const chapter of document.chapters) for (const block of chapter.blocks) if (block.text) yield { text: block.text }; })());
    return !isClearlyCorruptedTextExtraction(derived) && ['image-based','text-based','mixed'].includes(document.classification);
  } catch { return false; }
}
