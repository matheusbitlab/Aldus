import { PdfFitMode } from "@/src/domain/types/pdfReader";

export type PdfPageMode = "single" | "double";

export function getPdfPageMode(fileName: string): PdfPageMode {
  return fileName.toLowerCase() === "weber-etica.pdf" ? "double" : "single";
}

export interface PdfPageViewerProps {
  uri: string;
  pageNumber: number;
  pageMode: PdfPageMode;
  fitMode: PdfFitMode;
  zoom: number;
  rotation: number;
  onTotalPages: (totalPages: number) => void;
}