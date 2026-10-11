import { ReaderFont, ReaderTheme } from "@/src/domain/types/reader";

export type PdfReadingMode = "original" | "reflow";
export type PdfLayout = "single" | "double";
export type PdfClassification = "text-based" | "image-based" | "mixed";
export type PdfFitMode = "page" | "width";
export type PdfTextAlignment = "left" | "justify";
export type PdfReaderTheme = ReaderTheme | "black";

export interface PdfReflowTextItem {
  text: string;
  direction: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

export interface PdfReflowImage {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfReflowBlock {
  type: "heading" | "paragraph" | "image";
  text?: string;
  level?: number;
  src?: string;
  alt?: string;
  presentation?: "drop-cap";
  pageNumber: number;
}

export interface PdfReflowChapter {
  id: string;
  title: string;
  blocks: PdfReflowBlock[];
}

export interface PdfReflowTocEntry {
  title: string;
  pageNumber: number | null;
}

export interface PdfReflowPageData {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  textItems: PdfReflowTextItem[];
  images: PdfReflowImage[];
}

export interface PdfReflowDocument {
  extractionQuality?: PdfReflowQuality;
  derivation?: PdfReflowDerivation;
  classification: PdfClassification;
  pageCount: number;
  textPageCount: number;
  imagePageCount: number;
  characterCount: number;
  chapters: PdfReflowChapter[];
  toc: PdfReflowTocEntry[];
}

export type PdfTextProcessingState =
  | "TEXT_VALID"
  | "OCR_REQUIRED"
  | "OCR_PROCESSING"
  | "OCR_VALID"
  | "OCR_INSUFFICIENT"
  | "PROCESSING_ERROR";

export interface PdfReflowDerivation {
  version: number;
  source: "text-extraction" | "ocr" | "hybrid";
  validationVersion: number;
  ocrEngine?: string;
  ocrEngineVersion?: string;
  ocrPageCount: number;
  ocrPages: number[];
}

export interface PdfReflowQuality {
  version: number;
  totalChars: number;
  controlChars: number;
  letterChars: number;
  replacementChars: number;
}

export interface PdfReflowCacheRecord {
  id: string;
  sourceSignature: string;
  processorVersion: number;
  document: PdfReflowDocument;
  updatedAt: number;
}

export interface PdfReaderSettings {
  mode: PdfReadingMode;
  layout: PdfLayout;
  fitMode: PdfFitMode;
  zoom: number;
  rotation: number;
  theme: PdfReaderTheme;
  font: ReaderFont;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  margin: number;
  maxWidth: number;
  alignment: PdfTextAlignment;
  originalProgress: number | null;
  reflowProgress: number | null;
}

export const PDF_REFLOW_PROCESSOR_VERSION = 12;

export const defaultPdfReaderSettings: PdfReaderSettings = {
  mode: "original",
  layout: "single",
  fitMode: "page",
  zoom: 1,
  rotation: 0,
  theme: "sepia",
  font: "serif",
  fontSize: 18,
  lineHeight: 1.6,
  paragraphSpacing: 1,
  margin: 24,
  maxWidth: 760,
  alignment: "left",
  originalProgress: null,
  reflowProgress: null,
};
