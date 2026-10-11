import { UserSource } from "@/src/domain/types/sources";
import { ScrapedLink } from "@/src/domain/types/search";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { DriveAuthorization } from "./DriveAuthorization";
import { assertDriveResponse, DriveError } from "./DriveErrors";
import { parseDriveFolder } from "./driveFolder";

interface DriveFile {
  id: string; name: string; mimeType: string; size?: string; modifiedTime?: string;
  resourceKey?: string; driveId?: string; trashed?: boolean; capabilities?: { canDownload?: boolean };
}
interface DrivePage { files?: DriveFile[]; nextPageToken?: string; incompleteSearch?: boolean; }
interface Index { folderId: string; books: ScrapedLink[]; updatedAt: number; }
const FIELDS = "id,name,mimeType,size,modifiedTime,resourceKey,capabilities(canDownload)";
const API = "https://www.googleapis.com/drive/v3/files";

/** A light, session-only metadata index. No file bytes or credentials are cached here. */
export class GoogleDriveService {
  private readonly indexes = new Map<string, Index>();
  private readonly generations = new Map<string, number>();
  constructor(public readonly authorization: DriveAuthorization, private readonly request: typeof fetch = (...args) => fetch(...args)) {}
  async connect(source: UserSource, signal?: AbortSignal): Promise<void> {
    this.clearIndex(source.id);
    await this.authorization.connect(source.id, signal);
  }
  clearIndex(sourceId: string): void {
    this.indexes.delete(sourceId);
    this.generations.set(sourceId, (this.generations.get(sourceId) ?? 0) + 1);
  }
  async disconnect(sourceId: string): Promise<boolean> {
    this.clearIndex(sourceId);
    return this.authorization.disconnect(sourceId);
  }
  private folder(source: UserSource) {
    const parsed = parseDriveFolder(source.url);
    if (source.folderId && source.folderId !== parsed.folderId) throw new DriveError("invalid-folder");
    return { folderId: parsed.folderId, resourceKey: source.resourceKey ?? parsed.resourceKey };
  }
  async list(source: UserSource, signal?: AbortSignal, refresh = false): Promise<ScrapedLink[]> {
    throwIfAborted(signal);
    this.authorization.token(source.id); // Never serve a private index after disconnection/expiry.
    const folder = this.folder(source);
    const cached = this.indexes.get(source.id);
    if (!refresh && cached?.folderId === folder.folderId && Date.now() - cached.updatedAt < 300000) return cached.books;
    const generation = (this.generations.get(source.id) ?? 0) + 1;
    this.generations.set(source.id, generation);
    const headers = resourceHeaders(folder.folderId, folder.resourceKey);
    const metadata = await this.json<DriveFile>(source.id, `${API}/${encodeURIComponent(folder.folderId)}?fields=id,name,mimeType,driveId,trashed&supportsAllDrives=true`, headers, signal);
    if (metadata.trashed) throw new DriveError("not-found");
    if (metadata.mimeType !== "application/vnd.google-apps.folder") throw new DriveError("unsupported");
    const books = new Map<string, ScrapedLink>();
    const pages = new Set<string>();
    let pageToken: string | undefined;
    do {
      throwIfAborted(signal);
      const params = new URLSearchParams({ q: `'${folder.folderId}' in parents and trashed = false`,
        fields: `nextPageToken,incompleteSearch,files(${FIELDS})`, pageSize: "1000", orderBy: "name", supportsAllDrives: "true", includeItemsFromAllDrives: "true",
        corpora: metadata.driveId ? "drive" : "user", ...(metadata.driveId ? { driveId: metadata.driveId } : {}), ...(pageToken ? { pageToken } : {}),
      });
      const page = await this.json<DrivePage>(source.id, `${API}?${params}`, headers, signal);
      if (page.incompleteSearch || !Array.isArray(page.files)) throw new DriveError("api");
      for (const file of page.files) {
        // Explicit limitation: no shortcut resolution, recursion, Docs export or unsupported files.
        if (!file.id || !/^[\w-]+$/.test(file.id) || typeof file.name !== "string" || file.mimeType.startsWith("application/vnd.google-apps.")) continue;
        const format = file.mimeType === "application/pdf" ? "pdf" : file.mimeType === "application/epub+zip" || file.mimeType === "application/epub" ? "epub" : /\.pdf$/i.test(file.name) ? "pdf" : /\.epub$/i.test(file.name) ? "epub" : null;
        if (!format) continue;
        const size = Number(file.size);
        books.set(file.id, { url: `${API}/${encodeURIComponent(file.id)}?alt=media`, title: file.name,
          format, estimatedSize: Number.isFinite(size) && size > 0 ? size : null, sourceSite: source.name,
          sourceId: source.id, drive: { fileId: file.id, resourceKey: file.resourceKey, modifiedTime: file.modifiedTime, canDownload: file.capabilities?.canDownload },
        });
      }
      pageToken = page.nextPageToken;
      if (pageToken && (pages.has(pageToken) || pages.size >= 10000)) throw new DriveError("api");
      if (pageToken) pages.add(pageToken);
    } while (pageToken);
    throwIfAborted(signal);
    if (this.generations.get(source.id) !== generation) throw new DriveError("disconnected");
    this.authorization.token(source.id);
    const result = [...books.values()];
    this.indexes.set(source.id, { folderId: folder.folderId, books: result, updatedAt: Date.now() });
    return result;
  }
  async downloadRequest(source: UserSource, fileId: string, signal?: AbortSignal): Promise<{ url: string; headers: Record<string, string> }> {
    const books = await this.list(source, signal);
    const book = books.find(item => item.drive?.fileId === fileId);
    if (!book?.drive) throw new DriveError("not-found");
    const headers = resourceHeaders(fileId, book.drive.resourceKey);
    // Fresh metadata check distinguishes authorization/permission from an invalid book.
    const current = await this.json<DriveFile>(source.id, `${API}/${encodeURIComponent(fileId)}?fields=id,trashed,capabilities(canDownload)&supportsAllDrives=true`, headers, signal);
    if (current.trashed) throw new DriveError("not-found");
    if (current.capabilities?.canDownload === false) throw new DriveError("permission");
    return { url: book.url, headers: { ...headers, Authorization: `Bearer ${this.authorization.token(source.id)}` } };
  }
  checkDownloadStatus(sourceId: string, status: number): void {
    if (status === 401) { this.authorization.invalidate(sourceId); this.clearIndex(sourceId); }
    assertDriveResponse(status);
  }
  private async json<T>(sourceId: string, url: string, headers: Record<string, string>, signal?: AbortSignal): Promise<T> {
    const token = this.authorization.token(sourceId);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 20000);
    try {
      throwIfAborted(signal);
      const response = await withAbort(this.request(url, { headers: { ...headers, Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: controller.signal }), controller.signal);
      this.checkDownloadStatus(sourceId, response.status);
      try { return await withAbort(response.json(), controller.signal) as T; } catch { throw new DriveError("api"); }
    } catch (error) {
      throwIfAborted(signal);
      if (error instanceof DriveError) throw error;
      throw new DriveError("network");
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }
}
function resourceHeaders(id: string, key?: string): Record<string, string> {
  if (key && !/^[\w-]{1,200}$/.test(key)) throw new DriveError("invalid-folder");
  return key ? { "X-Goog-Drive-Resource-Keys": `${id}/${key}` } : {};
}
