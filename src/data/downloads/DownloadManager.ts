import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { DownloadError } from "@/src/core/errors/DownloadErrors";
import { DownloadJob } from "@/src/domain/types/download";
import { EpubFileImporter } from "@/src/data/epub/EpubFileImporter";
import { assertStorageAvailable } from "@/src/data/downloads/StorageValidator";
import { withExponentialBackoff } from "@/src/core/utils/retry";
import { NetworkStatusService } from "@/src/data/downloads/NetworkStatusService";

export class DownloadManager {
  private readonly tasks = new Map<string, FileSystem.DownloadResumable>();
  private readonly webTasks = new Map<string, AbortController>();
  constructor(private readonly epubImporter: EpubFileImporter, private readonly network = new NetworkStatusService()) {}
  async download(job: DownloadJob, onUpdate: (job: DownloadJob) => void): Promise<DownloadJob> {
    try {
      if (Platform.OS === "web") {
        return await withExponentialBackoff(() => this.downloadWeb(job, onUpdate), 3, 1000);
      }
      return await withExponentialBackoff(() => this.downloadOnce(job, onUpdate), 3, 1000);
    } catch (error) {
      onUpdate({ ...job, status: "failed", error: error instanceof Error ? error.message : "Não foi possível baixar o EPUB." });
      throw error;
    }
  }

  private async downloadWeb(job: DownloadJob, onUpdate: (job: DownloadJob) => void): Promise<DownloadJob> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    this.webTasks.set(job.id, controller);
    const fileName = job.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    let current: DownloadJob = {
      ...job,
      status: "downloading",
      attempts: job.attempts + 1,
      localUri: null,
      error: null,
    };
    onUpdate(current);

    try {
      const response = await fetch(job.url, {
        signal: controller.signal,
        headers: { Accept: "application/epub+zip,application/octet-stream" },
      });
      if (!response.ok) throw new DownloadError(`Download falhou (HTTP ${response.status}).`);

      const totalBytes = Number(response.headers.get("content-length")) || 0;
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          chunks.push(value);
          receivedBytes += value.byteLength;
          if (totalBytes > 0) {
            onUpdate({ ...current, progress: Math.min(0.99, receivedBytes / totalBytes) });
          }
        }
      } else {
        chunks.push(new Uint8Array(await response.arrayBuffer()));
      }
      const file = new Blob(chunks.map((chunk) => Uint8Array.from(chunk).buffer), { type: "application/epub+zip" });
      if (!file.size) throw new DownloadError("Arquivo baixado vazio.");

      const imported = await this.epubImporter.importFromUri(job.url, fileName, file);
      current = { ...current, status: "completed", progress: 1, localUri: imported.filePath };
      onUpdate(current);
      return current;
    } catch (error) {
      current = {
        ...current,
        status: controller.signal.aborted ? "cancelled" : "failed",
        error: error instanceof Error ? error.message : "Arquivo inválido ou corrompido.",
      };
      onUpdate(current);
      throw error;
    } finally {
      clearTimeout(timeout);
      this.webTasks.delete(job.id);
    }
  }

  private async downloadOnce(job: DownloadJob, onUpdate: (job: DownloadJob) => void): Promise<DownloadJob> { const root = FileSystem.documentDirectory; if (!root) throw new DownloadError("Diretório local indisponível."); await this.network.assertConnected(); await assertStorageAvailable(); const directory = `${root}books/`; const tempDirectory = `${directory}temp/`; const importedDirectory = `${directory}imported/`; await FileSystem.makeDirectoryAsync(tempDirectory, { intermediates: true }); await FileSystem.makeDirectoryAsync(importedDirectory, { intermediates: true }); const safeName = job.fileName.replace(/[^a-zA-Z0-9._-]/g, "_"); const uniqueName = `${downloadFileKey(job.id)}-${safeName}`; const tempUri = `${tempDirectory}${uniqueName}`; const importedUri = `${importedDirectory}${uniqueName}`; let current: DownloadJob = { ...job, status: "downloading", attempts: job.attempts + 1, localUri: tempUri, error: null }; onUpdate(current); try { const task = FileSystem.createDownloadResumable(job.url, tempUri, {}, (data) => { const progress = data.totalBytesExpectedToWrite > 0 ? data.totalBytesWritten / data.totalBytesExpectedToWrite : 0; onUpdate({ ...current, progress: Math.min(1, progress) }); }); this.tasks.set(job.id, task); const result = await task.downloadAsync(); if (!result) throw new DownloadError("Download cancelado."); const info = await FileSystem.getInfoAsync(result.uri); if (!info.exists || !info.size) throw new DownloadError("Arquivo baixado vazio."); await this.epubImporter.validateUri(result.uri); await FileSystem.moveAsync({ from: result.uri, to: importedUri }); const imported = await this.epubImporter.importFromUri(importedUri, safeName); current = { ...current, status: "completed", progress: 1, localUri: imported.filePath }; onUpdate(current); return current; } catch (error) { try { await FileSystem.deleteAsync(tempUri, { idempotent: true }); } catch { /* cleanup best effort */ } current = { ...current, status: "failed", error: error instanceof Error ? error.message : "Arquivo inválido ou corrompido." }; onUpdate(current); throw error; } finally { this.tasks.delete(job.id); } }
  async cancel(jobId: string): Promise<void> {
    const webTask = this.webTasks.get(jobId);
    if (webTask) webTask.abort();
    const task = this.tasks.get(jobId);
    if (task) await task.cancelAsync();
  }
}

function downloadFileKey(id: string): string {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
