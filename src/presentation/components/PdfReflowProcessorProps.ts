import { PdfReflowDocument } from "@/src/domain/types/pdfReader";

export interface PdfReflowProgress {
  stage?: "opening" | "extracting" | "building" | "validating" | "finalizing";
  currentPage: number;
  totalPages: number;
  imageCount?: number;
}

export interface PdfReflowProcessorProps {
  uri: string;
  onProgress: (progress: PdfReflowProgress) => void;
  onComplete: (document: PdfReflowDocument) => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

export function reflowProgressLabel(progress: PdfReflowProgress) {
  if (progress.stage === "building") return "Montando documento...";
  if (progress.stage === "validating") return "Validando texto extraído...";
  if (progress.stage === "finalizing") return "Finalizando leitura livre...";
  return progress.totalPages > 0
    ? `Extraindo página ${progress.currentPage} de ${progress.totalPages} (${Math.min(99, Math.floor(progress.currentPage / progress.totalPages * 100))}%) · ${progress.imageCount ?? 0} ilustrações`
    : "Abrindo PDF para análise...";
}
