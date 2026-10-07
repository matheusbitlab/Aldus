import { PdfReflowDocument } from "@/src/domain/types/pdfReader";

export interface PdfReflowProgress {
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