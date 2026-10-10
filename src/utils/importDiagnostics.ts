import { BookImportFormat, BookImportPhase, BookImportSource, uriKind } from "@/src/domain/types/bookImport";

const enabled = process.env.EXPO_PUBLIC_IMPORT_DIAGNOSTICS === "1";

interface ImportDiagnosticInput {
  operationId: string;
  source: BookImportSource;
  format?: BookImportFormat | null;
  phase: BookImportPhase;
  event: "start" | "phase" | "success" | "error" | "cancel";
  startedAt: number;
  fileSize?: number | null;
  uri?: string;
}

export function importDiagnostic(input: ImportDiagnosticInput): void {
  if (!enabled) return;
  const durationMs = Math.max(0, Date.now() - input.startedAt);
  console.info("[ImportDiagnostic]", JSON.stringify({
    operationId: input.operationId,
    source: input.source,
    format: input.format ?? null,
    phase: input.phase,
    event: input.event,
    durationMs,
    fileSize: typeof input.fileSize === "number" ? input.fileSize : null,
    uriType: input.uri ? uriKind(input.uri) : null,
    terminal: ["success", "error", "cancelled"].includes(input.phase),
  }));
}
