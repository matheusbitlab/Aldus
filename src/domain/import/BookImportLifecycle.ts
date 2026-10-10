import {
  BookImportFormat,
  BookImportPhaseUpdate,
  BookImportSource,
  BookImportState,
  idleBookImportState,
  isBookImportTerminal,
} from "@/src/domain/types/bookImport";

let sequence = 0;

export interface StartedBookImport {
  operationId: string;
  signal: AbortSignal;
}

export class BookImportLifecycle {
  private state: BookImportState = idleBookImportState;
  private controller: AbortController | null = null;

  constructor(private readonly publish: (state: BookImportState) => void, private readonly now = () => Date.now()) {}

  current(): BookImportState {
    return this.state;
  }

  start(input: { source: BookImportSource; fileName: string; format?: BookImportFormat; fileSize?: number }): StartedBookImport {
    if (this.controller && !isBookImportTerminal(this.state.phase)) this.controller.abort();
    const operationId = `${this.now().toString(36)}-${(++sequence).toString(36)}`;
    this.controller = new AbortController();
    this.update({
      ...idleBookImportState,
      operationId,
      source: input.source,
      format: input.format ?? null,
      phase: "preparing",
      fileName: input.fileName,
      fileSize: input.fileSize ?? null,
      cancellable: true,
      startedAt: this.now(),
    });
    return { operationId, signal: this.controller.signal };
  }

  transition(operationId: string, update: BookImportPhaseUpdate): boolean {
    if (!this.accepts(operationId)) return false;
    this.update({
      ...this.state,
      ...update,
      format: update.format ?? this.state.format,
      fileSize: update.fileSize ?? this.state.fileSize,
      progress: update.progress === undefined ? this.state.progress : update.progress,
      error: null,
    });
    return true;
  }

  succeed(operationId: string, bookId: string): boolean {
    if (!this.accepts(operationId)) return false;
    this.update({ ...this.state, phase: "success", cancellable: false, progress: null, error: null, bookId, endedAt: this.now() });
    this.controller = null;
    return true;
  }

  fail(operationId: string, error: string): boolean {
    if (!this.accepts(operationId)) return false;
    this.update({ ...this.state, phase: "error", cancellable: false, progress: null, error, endedAt: this.now() });
    this.controller = null;
    return true;
  }

  cancel(): boolean {
    if (!this.controller || !this.state.operationId || isBookImportTerminal(this.state.phase) || !this.state.cancellable) return false;
    this.controller.abort();
    this.update({ ...this.state, phase: "cancelled", cancellable: false, progress: null, error: null, endedAt: this.now() });
    this.controller = null;
    return true;
  }

  reset(): void {
    if (this.controller) this.controller.abort();
    this.controller = null;
    this.update(idleBookImportState);
  }

  isCurrent(operationId: string): boolean {
    return this.state.operationId === operationId;
  }

  private accepts(operationId: string): boolean {
    return this.state.operationId === operationId && !isBookImportTerminal(this.state.phase);
  }

  private update(state: BookImportState): void {
    this.state = state;
    this.publish(state);
  }
}
