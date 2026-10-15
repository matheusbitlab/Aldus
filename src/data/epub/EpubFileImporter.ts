import * as FileSystem from "expo-file-system/legacy";
import { File } from "expo-file-system";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { newLibraryId } from "@/src/domain/entities/libraryId";
import { Platform } from "react-native";
import { ImportEpubUseCase } from "@/src/domain/usecases/ImportEpubUseCase";
import { WebBookFileStore } from "@/src/data/database/connection/WebBookFileStore";
import {
  hasActiveEpubOpenTrace,
  markEpubOpenEvent,
  markEpubOpenSpanEnd,
  markEpubOpenSpanStart,
} from "@/src/utils/epubOpenMetrics";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { BookImportPhaseUpdate } from "@/src/domain/types/bookImport";

export class EpubFileImporter {
  constructor(
    private readonly importEpub: ImportEpubUseCase,
    private readonly webFiles?: WebBookFileStore
  ) {}
  async validateUri(uri: string, signal?: AbortSignal): Promise<void> { const bytes = await this.readBytes(encodeFileUri(uri), undefined, signal); await this.importEpub.validateBytes(bytes, signal); }
  async importFromUri(
    uri: string,
    fileName: string,
    pickedFile?: Blob,
    stableId?: string,
    options: { signal?: AbortSignal; onPhase?: (update: BookImportPhaseUpdate) => void } = {}
  ) {
    const accountRun = libraryAccountScope.capture();
    throwIfAborted(options.signal);
    const isWeb = Platform.OS === "web";
    const fileUri = isWeb ? uri : encodeFileUri(uri);
    options.onPhase?.({ phase: "reading", cancellable: true });
    const info = isWeb ? null : await withAbort(FileSystem.getInfoAsync(fileUri), options.signal);
    if (!isWeb && (!info?.exists || info.isDirectory)) throw new Error("Arquivo EPUB não encontrado.");
    const readStartedAt = markEpubOpenSpanStart("bytes_read", {
      source: pickedFile ? "picked_blob" : isWeb ? "web_fetch" : "native_filesystem",
    });
    const bytes = await this.readBytes(fileUri, pickedFile, options.signal);
    markEpubOpenSpanEnd("bytes_read", readStartedAt, {
      fileSizeBytes: bytes.byteLength,
    });
    const webBookId = isWeb ? stableId ?? newLibraryId() : stableId;
    const fileSize = pickedFile?.size ?? (info?.exists ? info.size ?? bytes.byteLength : bytes.byteLength);
    let savedWebFile = false;
    try {
      if (isWeb) {
        if (!this.webFiles) throw new Error("O armazenamento local de EPUB não está disponível neste navegador.");
        const file = pickedFile ?? new Blob([Uint8Array.from(bytes).buffer], { type: "application/epub+zip" });
        await withAbort(this.webFiles.save(webBookId!, fileName, file), options.signal);
        savedWebFile = true;
      }
      const storedPath = isWeb ? `web-epub://${webBookId}` : fileUri;
      accountRun.check();
      return await this.importEpub.execute({ bytes, fileName, filePath: storedPath, fileSize, bookId: webBookId }, options);
    } catch (error) {
      if (savedWebFile && webBookId && this.webFiles) await this.webFiles.delete(webBookId).catch(() => undefined);
      throw error;
    }
  }
  private async readBytes(uri: string, pickedFile?: Blob, signal?: AbortSignal): Promise<Uint8Array> {
    throwIfAborted(signal);
    if (Platform.OS === "web") {
      if (pickedFile) {
        const bodyStartedAt = markEpubOpenSpanStart("blob_array_buffer_read");
        const buffer = await withAbort(pickedFile.arrayBuffer(), signal);
        const bytes = new Uint8Array(buffer);
        markEpubOpenSpanEnd("blob_array_buffer_read", bodyStartedAt, {
          fileSizeBytes: bytes.byteLength,
        });
        return bytes;
      }
      const fetchStartedAt = performance.now();
      const fetchSpanStartedAt = markEpubOpenSpanStart("fetch", { uri });
      const response = await fetch(uri, { signal });
      markEpubOpenEvent("fetch_response_received", {
        status: response.status,
        ok: response.ok,
        responseType: response.type,
      }, performance.now() - fetchStartedAt);
      if (!response.ok) throw new Error("Não foi possível ler o arquivo EPUB no navegador.");
      const bodyStartedAt = markEpubOpenSpanStart("fetch_body_read");
      const buffer = await withAbort(response.arrayBuffer(), signal);
      markEpubOpenSpanEnd("fetch_body_read", bodyStartedAt, {
        fileSizeBytes: buffer.byteLength,
      });
      const viewStartedAt = performance.now();
      const bytes = new Uint8Array(buffer);
      markEpubOpenEvent("byte_view_created", {
        fileSizeBytes: bytes.byteLength,
        copiesArrayBuffer: false,
      }, performance.now() - viewStartedAt);
      markEpubOpenSpanEnd("fetch", fetchSpanStartedAt, {
        fileSizeBytes: bytes.byteLength,
        resourceTiming: JSON.stringify(getResourceTiming(uri)),
      });
      return bytes;
    }
    // The installed Expo filesystem exposes async native bytes. Base64 + atob +
    // Uint8Array.from used to retain two full JS strings and decode on the input thread.
    // The Native read itself cannot be interrupted; never parse a late cancelled result.
    const bytes = await withAbort(new File(uri).bytes(), signal);
    throwIfAborted(signal);
    return bytes;
  }
}

function getResourceTiming(uri: string): Record<string, number | string | boolean> | null {
  if (!hasActiveEpubOpenTrace() || typeof performance === "undefined" || typeof window === "undefined") return null;
  const absoluteUri = new URL(uri, window.location.href).href;
  const entries = performance.getEntriesByName(absoluteUri, "resource");
  const entry = entries[entries.length - 1] as PerformanceResourceTiming | undefined;
  if (!entry) return null;
  return {
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
    cacheHint: entry.transferSize === 0,
    durationMs: entry.duration,
  };
}

function encodeFileUri(uri: string): string { return uri.replace(/ /g, "%20").replace(/#/g, "%23"); }
