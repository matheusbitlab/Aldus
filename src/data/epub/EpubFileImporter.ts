import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { ImportEpubUseCase } from "@/src/domain/usecases/ImportEpubUseCase";
import { WebBookFileStore } from "@/src/data/database/connection/WebBookFileStore";
import {
  hasActiveEpubOpenTrace,
  markEpubOpenEvent,
  markEpubOpenSpanEnd,
  markEpubOpenSpanStart,
} from "@/src/utils/epubOpenMetrics";

export class EpubFileImporter {
  constructor(
    private readonly importEpub: ImportEpubUseCase,
    private readonly webFiles?: WebBookFileStore
  ) {}
  async validateUri(uri: string): Promise<void> { const bytes = await this.readBytes(encodeFileUri(uri)); await this.importEpub.validateBytes(bytes); }
  async importFromUri(uri: string, fileName: string, pickedFile?: Blob, stableId?: string) {
    const isWeb = Platform.OS === "web";
    const fileUri = isWeb ? uri : encodeFileUri(uri);
    const info = isWeb ? null : await FileSystem.getInfoAsync(fileUri);
    if (!isWeb && (!info?.exists || info.isDirectory)) throw new Error("Arquivo EPUB não encontrado.");
    const readStartedAt = markEpubOpenSpanStart("bytes_read", {
      source: pickedFile ? "picked_blob" : isWeb ? "web_fetch" : "native_filesystem",
    });
    const bytes = await this.readBytes(fileUri, pickedFile);
    markEpubOpenSpanEnd("bytes_read", readStartedAt, {
      fileSizeBytes: bytes.byteLength,
    });
    const webBookId = isWeb ? stableId ?? `web-epub-${Date.now()}` : stableId;
    if (isWeb) {
      if (!this.webFiles) throw new Error("O armazenamento local de EPUB não está disponível neste navegador.");
      const file = pickedFile ?? new Blob([Uint8Array.from(bytes).buffer], { type: "application/epub+zip" });
      await this.webFiles.save(webBookId!, fileName, file);
    }
    const storedPath = isWeb ? `web-epub://${webBookId}` : fileUri;
    return this.importEpub.execute({
      bytes,
      fileName,
      filePath: storedPath,
      fileSize: pickedFile?.size ?? (info?.exists ? info.size ?? bytes.byteLength : bytes.byteLength),
      bookId: webBookId,
    });
  }
  private async readBytes(uri: string, pickedFile?: Blob): Promise<Uint8Array> {
    if (Platform.OS === "web") {
      if (pickedFile) {
        const bodyStartedAt = markEpubOpenSpanStart("blob_array_buffer_read");
        const buffer = await pickedFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        markEpubOpenSpanEnd("blob_array_buffer_read", bodyStartedAt, {
          fileSizeBytes: bytes.byteLength,
        });
        return bytes;
      }
      const fetchStartedAt = performance.now();
      const fetchSpanStartedAt = markEpubOpenSpanStart("fetch", { uri });
      const response = await fetch(uri);
      markEpubOpenEvent("fetch_response_received", {
        status: response.status,
        ok: response.ok,
        responseType: response.type,
      }, performance.now() - fetchStartedAt);
      if (!response.ok) throw new Error("Não foi possível ler o arquivo EPUB no navegador.");
      const bodyStartedAt = markEpubOpenSpanStart("fetch_body_read");
      const buffer = await response.arrayBuffer();
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
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" } as never);
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
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
