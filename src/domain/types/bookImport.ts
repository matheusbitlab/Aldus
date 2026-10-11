export type BookImportFormat = "epub" | "pdf";
export type BookImportSource = "local" | "remote";
export type BookImportPhase =
  | "idle"
  | "selecting"
  | "preparing"
  | "downloading"
  | "copying"
  | "reading"
  | "validating"
  | "reading_metadata"
  | "persisting"
  | "finalizing"
  | "success"
  | "error"
  | "cancelled";

export interface BookImportProgress {
  completed: number;
  total: number;
  unit: "bytes" | "items";
}

export interface BookImportState {
  operationId: string | null;
  source: BookImportSource | null;
  format: BookImportFormat | null;
  phase: BookImportPhase;
  fileName: string | null;
  fileSize: number | null;
  progress: BookImportProgress | null;
  cancellable: boolean;
  error: string | null;
  bookId: string | null;
  startedAt: number | null;
  endedAt: number | null;
}

export interface BookImportPhaseUpdate {
  phase: Exclude<BookImportPhase, "idle" | "selecting" | "success" | "error" | "cancelled">;
  cancellable: boolean;
  format?: BookImportFormat;
  fileSize?: number;
  progress?: BookImportProgress | null;
}

export const idleBookImportState: BookImportState = {
  operationId: null,
  source: null,
  format: null,
  phase: "idle",
  fileName: null,
  fileSize: null,
  progress: null,
  cancellable: false,
  error: null,
  bookId: null,
  startedAt: null,
  endedAt: null,
};

export function isBookImportTerminal(phase: BookImportPhase): boolean {
  return phase === "success" || phase === "error" || phase === "cancelled";
}

export function bookImportPhaseLabel(phase: BookImportPhase): string {
  const labels: Record<BookImportPhase, string> = {
    idle: "Pronto para importar",
    selecting: "Escolhendo arquivo…",
    preparing: "Preparando importação…",
    downloading: "Baixando arquivo…",
    copying: "Copiando para a biblioteca…",
    reading: "Lendo arquivo…",
    validating: "Validando arquivo…",
    reading_metadata: "Lendo título e capítulos…",
    persisting: "Salvando na biblioteca…",
    finalizing: "Atualizando a biblioteca…",
    success: "Livro importado com sucesso.",
    error: "Não foi possível importar o livro.",
    cancelled: "Importação cancelada.",
  };
  return labels[phase];
}

export function uriKind(uri: string): "content" | "file" | "blob" | "http" | "data" | "other" {
  const scheme = uri.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme === "content") return "content";
  if (scheme === "file") return "file";
  if (scheme === "blob") return "blob";
  if (scheme === "http" || scheme === "https") return "http";
  if (scheme === "data") return "data";
  return "other";
}
