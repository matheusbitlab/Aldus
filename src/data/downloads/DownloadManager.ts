import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { DownloadError } from "@/src/core/errors/DownloadErrors";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { DownloadJob, DownloadPhase } from "@/src/domain/types/download";
import { EpubFileImporter } from "@/src/data/epub/EpubFileImporter";
import { assertStorageAvailable } from "@/src/data/downloads/StorageValidator";
import { NetworkStatusService } from "@/src/data/downloads/NetworkStatusService";
import { importDiagnostic } from "@/src/utils/importDiagnostics";

interface ActiveDownload {
  operationId: string;
  controller: AbortController;
  nativeTask: FileSystem.DownloadResumable | null;
  cancellable: boolean;
}

export class DownloadManager {
  private readonly active = new Map<string, ActiveDownload>();

  constructor(private readonly epubImporter: EpubFileImporter, private readonly network = new NetworkStatusService()) {}

  async download(job: DownloadJob, onUpdate: (job: DownloadJob) => void): Promise<DownloadJob> {
    const operationId = job.operationId ?? `download-${Date.now().toString(36)}`;
    this.active.get(job.id)?.controller.abort();
    const controller = new AbortController();
    const active: ActiveDownload = { operationId, controller, nativeTask: null, cancellable: true };
    this.active.set(job.id, active);
    const initial: DownloadJob = {
      ...job,
      operationId,
      status: "queued",
      phase: "preparing",
      progress: 0,
      progressKnown: false,
      cancellable: true,
      error: null,
    };
    const startedAt = Date.now();
    let latest = initial;
    let diagnosticKey = "";
    const publishUpdate = (updated: DownloadJob) => {
      latest = updated;
      onUpdate(updated);
      const terminalPhase = updated.status === "completed" ? "success" : updated.status === "failed" ? "error" : updated.status === "cancelled" ? "cancelled" : null;
      const phase = terminalPhase ?? updated.phase ?? "preparing";
      const key = `${updated.status}:${phase}`;
      if (key !== diagnosticKey) {
        diagnosticKey = key;
        importDiagnostic({
          operationId,
          source: "remote",
          format: "epub",
          phase,
          event: terminalPhase === "success" ? "success" : terminalPhase === "error" ? "error" : terminalPhase === "cancelled" ? "cancel" : phase === "preparing" ? "start" : "phase",
          startedAt,
          uri: job.url,
        });
      }
    };
    this.publish(initial, publishUpdate);

    try {
      return Platform.OS === "web"
        ? await this.downloadWeb(initial, publishUpdate, controller.signal)
        : await this.downloadNative(initial, publishUpdate, controller.signal, active);
    } catch (error) {
      const cancelled = controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
      const terminal: DownloadJob = {
        ...latest,
        status: cancelled ? "cancelled" : "failed",
        progressKnown: false,
        cancellable: false,
        error: cancelled ? null : friendlyDownloadError(error),
      };
      this.publish(terminal, publishUpdate);
      throw error;
    } finally {
      if (this.active.get(job.id)?.operationId === operationId) this.active.delete(job.id);
    }
  }

  async cancel(jobId: string): Promise<boolean> {
    const active = this.active.get(jobId);
    if (!active || !active.cancellable) return false;
    active.controller.abort();
    if (active.nativeTask) void active.nativeTask.cancelAsync().catch(() => undefined);
    return true;
  }

  private async downloadWeb(job: DownloadJob, onUpdate: (job: DownloadJob) => void, signal: AbortSignal): Promise<DownloadJob> {
    const requestController = new AbortController();
    const forwardAbort = () => requestController.abort();
    signal.addEventListener("abort", forwardAbort, { once: true });
    const timeout = setTimeout(() => requestController.abort(), 60000);
    let current = this.phase(job, "downloading", true, onUpdate, { status: "downloading", attempts: job.attempts + 1 });

    try {
      const response = await fetch(job.url, {
        signal: requestController.signal,
        headers: { Accept: "application/epub+zip,application/octet-stream" },
      });
      throwIfAborted(signal);
      if (!response.ok) throw new DownloadError(`Download falhou (HTTP ${response.status}).`);

      const totalBytes = Number(response.headers.get("content-length")) || 0;
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await withAbort(reader.read(), signal);
          if (done) break;
          if (!value) continue;
          chunks.push(value);
          receivedBytes += value.byteLength;
          if (totalBytes > 0) {
            current = { ...current, progress: Math.min(1, receivedBytes / totalBytes), progressKnown: true };
            this.publish(current, onUpdate);
          }
        }
      } else {
        chunks.push(new Uint8Array(await withAbort(response.arrayBuffer(), signal)));
      }
      const file = new Blob(chunks.map(chunk => Uint8Array.from(chunk).buffer), { type: "application/epub+zip" });
      if (!file.size) throw new DownloadError("Arquivo baixado vazio.");
      const fileName = safeFileName(job.fileName);
      current = this.phase(current, "validating", true, onUpdate, { progressKnown: false });
      const imported = await this.epubImporter.importFromUri(job.url, fileName, file, job.operationId, {
        signal,
        onPhase: update => {
          const phase = remotePhase(update.phase);
          current = this.phase(current, phase, update.cancellable, onUpdate, { progressKnown: false });
        },
      });
      throwIfAborted(signal);
      current = this.phase(current, "finalizing", false, onUpdate, { progressKnown: false });
      const completed: DownloadJob = { ...current, status: "completed", progress: 1, progressKnown: true, cancellable: false, localUri: imported.filePath, error: null };
      this.publish(completed, onUpdate);
      return completed;
    } catch (error) {
      if (!signal.aborted && requestController.signal.aborted) throw new DownloadError("O download excedeu o tempo de resposta.", error);
      throw error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", forwardAbort);
    }
  }

  private async downloadNative(job: DownloadJob, onUpdate: (job: DownloadJob) => void, signal: AbortSignal, active: ActiveDownload): Promise<DownloadJob> {
    const root = FileSystem.documentDirectory;
    if (!root) throw new DownloadError("Diretório local indisponível.");
    await withAbort(this.network.assertConnected(), signal);
    await withAbort(assertStorageAvailable(), signal);
    const tempDirectory = `${root}books/temp/`;
    const importedDirectory = `${root}books/imported/`;
    await withAbort(Promise.all([
      FileSystem.makeDirectoryAsync(tempDirectory, { intermediates: true }),
      FileSystem.makeDirectoryAsync(importedDirectory, { intermediates: true }),
    ]).then(() => undefined), signal);
    const safeName = safeFileName(job.fileName);
    const uniqueName = `${downloadFileKey(job.id)}-${safeFileName(job.operationId ?? "download")}-${safeName}`;
    const tempUri = `${tempDirectory}${uniqueName}`;
    const importedUri = `${importedDirectory}${uniqueName}`;
    let current = this.phase(job, "downloading", true, onUpdate, { status: "downloading", attempts: job.attempts + 1, localUri: tempUri });

    try {
      const task = FileSystem.createDownloadResumable(job.url, tempUri, {}, data => {
        if (signal.aborted) return;
        const known = data.totalBytesExpectedToWrite > 0;
        current = {
          ...current,
          progress: known ? Math.min(1, data.totalBytesWritten / data.totalBytesExpectedToWrite) : 0,
          progressKnown: known,
        };
        this.publish(current, onUpdate);
      });
      active.nativeTask = task;
      const result = await withAbort(task.downloadAsync(), signal);
      if (!result) throw new DownloadError("Download cancelado.");
      const info = await withAbort(FileSystem.getInfoAsync(result.uri), signal);
      if (!info.exists || !info.size) throw new DownloadError("Arquivo baixado vazio.");
      throwIfAborted(signal);
      const move = FileSystem.moveAsync({ from: result.uri, to: importedUri });
      try {
        await withAbort(move, signal);
      } catch (error) {
        if (signal.aborted) void move.then(() => this.cleanupNativeFiles(tempUri, importedUri)).catch(() => undefined);
        throw error;
      }
      current = this.phase(current, "validating", true, onUpdate, { progressKnown: false, localUri: importedUri });
      const imported = await this.epubImporter.importFromUri(importedUri, safeName, undefined, job.operationId, {
        signal,
        onPhase: update => {
          const phase = remotePhase(update.phase);
          current = this.phase(current, phase, update.cancellable, onUpdate, { progressKnown: false });
        },
      });
      throwIfAborted(signal);
      current = this.phase(current, "finalizing", false, onUpdate, { progressKnown: false });
      const completed: DownloadJob = { ...current, status: "completed", progress: 1, progressKnown: true, cancellable: false, localUri: imported.filePath, error: null };
      this.publish(completed, onUpdate);
      return completed;
    } catch (error) {
      void this.cleanupNativeFiles(tempUri, importedUri);
      throw error;
    } finally {
      active.nativeTask = null;
    }
  }

  private async cleanupNativeFiles(tempUri: string, importedUri?: string): Promise<void> {
    await Promise.all([
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => undefined),
      importedUri ? FileSystem.deleteAsync(importedUri, { idempotent: true }).catch(() => undefined) : Promise.resolve(),
    ]);
  }

  private phase(job: DownloadJob, phase: DownloadPhase, cancellable: boolean, onUpdate: (job: DownloadJob) => void, patch: Partial<DownloadJob> = {}): DownloadJob {
    const next = { ...job, ...patch, phase, cancellable };
    const active = this.active.get(job.id);
    if (active && active.operationId === job.operationId) active.cancellable = cancellable;
    this.publish(next, onUpdate);
    return next;
  }

  private publish(job: DownloadJob, onUpdate: (job: DownloadJob) => void): void {
    if (this.active.get(job.id)?.operationId === job.operationId) onUpdate(job);
  }
}

function remotePhase(phase: string): DownloadPhase {
  if (phase === "persisting") return "persisting";
  if (phase === "reading_metadata") return "reading_metadata";
  if (phase === "validating") return "validating";
  if (phase === "finalizing") return "finalizing";
  return "validating";
}

function friendlyDownloadError(error: unknown): string {
  if (!(error instanceof Error) || !error.message) return "Não foi possível baixar e importar o EPUB.";
  if (/HTTP|download|tempo de resposta|rede|conex/i.test(error.message)) return `Erro de download: ${error.message}`;
  if (/não (é|possui).*válid|inválid|corrompid|ZIP EPUB|META-INF|OPF|capítulos legíveis/i.test(error.message)) return `Arquivo inválido: ${error.message}`;
  if (/armazenamento|biblioteca local|SQLite|IndexedDB|quota|espaço/i.test(error.message)) return `Erro de armazenamento: ${error.message}`;
  if (/não encontrado|não foi possível ler|identificar|acess/i.test(error.message)) return `Arquivo inacessível: ${error.message}`;
  return "Não foi possível importar o EPUB baixado.";
}

function safeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "livro.epub";
}

function downloadFileKey(id: string): string {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
