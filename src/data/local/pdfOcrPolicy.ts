import type {
  PdfReflowDerivation,
  PdfReflowPageData,
  PdfReflowTextItem,
  PdfTextProcessingState,
} from "@/src/domain/types/pdfReader";
import {
  assessTextExtractionQuality,
  assessTextQualitySteps,
  isClearlyCorruptedTextExtraction,
  PDF_OCR_VALIDATION_VERSION,
} from "./pdfReflowQuality";
import { runCooperatively } from "@/src/core/utils/cooperativeWork";

export const PDF_OCR_ENGINE = "ML Kit Text Recognition v2 (Latin, bundled)";
export const PDF_OCR_ENGINE_VERSION = "16.0.1";

export interface PdfOcrPlan {
  state: PdfTextProcessingState;
  pageNumbers: number[];
  totalPages: number;
}

export function createPdfOcrPlan(pages: PdfReflowPageData[]): PdfOcrPlan {
  const steps = ocrPlanSteps(pages);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

export function createPdfOcrPlanAsync(pages: PdfReflowPageData[], signal?: AbortSignal): Promise<PdfOcrPlan> {
  return runCooperatively(ocrPlanSteps(pages), signal);
}

function* ocrPlanSteps(pages: PdfReflowPageData[]): Generator<void, PdfOcrPlan> {
  const qualities: Array<ReturnType<typeof assessTextExtractionQuality>> = [];
  const overall = assessTextExtractionQuality([]);
  for (const page of pages) {
    const part = yield* assessTextQualitySteps(page.textItems);
    qualities.push(part);
    overall.totalChars += part.totalChars; overall.controlChars += part.controlChars;
    overall.letterChars += part.letterChars; overall.replacementChars += part.replacementChars;
    yield;
  }
  const minimumLetters = Math.max(80, pages.length * 8);
  const globallyInsufficient = overall.letterChars < minimumLetters;
  const globallyCorrupted = isClearlyCorruptedTextExtraction(overall);
  const pageNumbers = pages.filter((page, index) => {
    const pageQuality = qualities[index];
    if (needsOcrWithQuality(page, pageQuality)) return true;
    if (globallyCorrupted && pageQuality.controlChars > 0 && pageQuality.controlChars / Math.max(1, pageQuality.totalChars) >= 0.2) return true;
    if (!globallyInsufficient) return false;
    return pageQuality.letterChars < 12;
  }).map(page => page.pageNumber);
  return {
    state: pageNumbers.length > 0 ? "OCR_REQUIRED" : "TEXT_VALID",
    pageNumbers,
    totalPages: pages.length,
  };
}

export function pageNeedsOcr(page: PdfReflowPageData): boolean {
  const quality = assessTextExtractionQuality(page.textItems);
  return needsOcrWithQuality(page, quality);
}

function needsOcrWithQuality(page: PdfReflowPageData, quality: ReturnType<typeof assessTextExtractionQuality>): boolean {
  if (isClearlyCorruptedTextExtraction(quality)) return true;
  if (quality.totalChars >= 24 || quality.letterChars >= 12) return false;
  return page.images.some(image => {
    const pageArea = page.pageWidth * page.pageHeight;
    return pageArea > 0 && image.width * image.height / pageArea >= 0.35;
  });
}

export function isSufficientOcrText(items: PdfReflowTextItem[]): boolean {
  const quality = assessTextExtractionQuality(items);
  if (isClearlyCorruptedTextExtraction(quality) || quality.replacementChars > Math.max(2, quality.totalChars * 0.02)) return false;
  const text = items.map(item => item.text).join(" ").normalize("NFC");
  const words = text.match(/\p{L}[\p{L}\p{M}'’\-]+/gu) ?? [];
  return quality.totalChars >= 8 && quality.letterChars >= 4 && words.length >= 2;
}

export function replacePageWithOcr(page: PdfReflowPageData, textItems: PdfReflowTextItem[]): PdfReflowPageData {
  const pageArea = page.pageWidth * page.pageHeight;
  return {
    ...page,
    textItems,
    images: page.images.filter(image => pageArea <= 0 || image.width * image.height / pageArea < 0.35),
  };
}

export function createReflowDerivation(totalPages: number, ocrPages: number[]): PdfReflowDerivation {
  const sorted = [...new Set(ocrPages)].sort((a, b) => a - b);
  return {
    version: 1,
    source: sorted.length === 0 ? "text-extraction" : sorted.length === totalPages ? "ocr" : "hybrid",
    validationVersion: PDF_OCR_VALIDATION_VERSION,
    ocrEngine: sorted.length > 0 ? PDF_OCR_ENGINE : undefined,
    ocrEngineVersion: sorted.length > 0 ? PDF_OCR_ENGINE_VERSION : undefined,
    ocrPageCount: sorted.length,
    ocrPages: sorted,
  };
}
