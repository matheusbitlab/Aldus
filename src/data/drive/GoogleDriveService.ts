import { UserSource } from "@/src/domain/types/sources";
import { ScrapedLink } from "@/src/domain/types/search";
import { SourceCatalogListing, SourceFolder, SourceOperationContext } from "@/src/domain/types/sourceCatalog";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { DriveAuthorization } from "./DriveAuthorization";
import { assertDriveResponse, DriveError } from "./DriveErrors";
import { parseDriveFolder } from "./driveFolder";
import { sourceOperationContext, sourceOperationErrorCode, sourceProgress } from "@/src/utils/sourceDiagnostics";

interface DriveFile {
  id: string; name: string; mimeType: string; size?: string; modifiedTime?: string;
  resourceKey?: string; driveId?: string; trashed?: boolean; capabilities?: { canDownload?: boolean };
  parents?: string[];
  shortcutDetails?: { targetId?: string; targetMimeType?: string; targetResourceKey?: string };
}
interface DrivePage { files?: DriveFile[]; nextPageToken?: string; incompleteSearch?: boolean; }
interface Index extends SourceCatalogListing { rootFolderId: string; folders: SourceFolder[]; updatedAt: number; }
const FOLDER_MIME = "application/vnd.google-apps.folder", SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
const FIELDS = "id,name,mimeType,size,modifiedTime,resourceKey,driveId,trashed,shortcutDetails(targetId,targetMimeType,targetResourceKey),capabilities(canDownload)";
const API = "https://www.googleapis.com/drive/v3/files";

/** A light, session-only metadata index. No file bytes or credentials are cached here. */
export class GoogleDriveService {
  private readonly indexes = new Map<string, Index>();
  private readonly generations = new Map<string, number>();
  constructor(public readonly authorization: DriveAuthorization, private readonly request: typeof fetch = (...args) => fetch(...args)) {}
  async connect(source: UserSource, signal?: AbortSignal, context?: SourceOperationContext): Promise<void> {
    const operation = sourceOperationContext(context);
    this.clearIndex(source.id);
    sourceProgress(operation, "authorizing");
    try { await this.authorization.connect(source.id, signal, operation.operationId); }
    catch (error) { sourceProgress(operation, signal?.aborted || (error as Error)?.name === "AbortError" ? "cancelled" : "error", {}, sourceOperationErrorCode(error)); throw error; }
  }
  clearIndex(sourceId: string): void {
    this.indexes.delete(sourceId);
    this.generations.set(sourceId, (this.generations.get(sourceId) ?? 0) + 1);
  }
  clearSession(): void {
    for (const sourceId of new Set([...this.generations.keys(), ...this.indexes.keys()])) this.clearIndex(sourceId);
    this.authorization.clearSession();
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
  /** Connection probe validates only the root; the explicit refresh performs one full traversal. */
  async validateRoot(source: UserSource, signal?: AbortSignal, context?: SourceOperationContext): Promise<void> {
    throwIfAborted(signal);
    sourceProgress(context, "verifying");
    const folder = this.folder(source);
    await this.folderMetadata(source.id, folder.folderId, folder.resourceKey, signal);
  }
  async describeRoot(source: UserSource, signal?: AbortSignal, context?: SourceOperationContext): Promise<{ name: string }> {
    const operation = sourceOperationContext(context);
    sourceProgress(operation, "verifying");
    try {
      throwIfAborted(signal);
      const folder = this.folder(source), metadata = await this.folderMetadata(source.id, folder.folderId, folder.resourceKey, signal);
      throwIfAborted(signal);
      if (typeof metadata.name !== "string" || !metadata.name.trim()) throw new DriveError("api");
      return { name: metadata.name };
    } catch (error) { sourceProgress(operation, signal?.aborted || (error as Error)?.name === "AbortError" ? "cancelled" : "error", {}, sourceOperationErrorCode(error)); throw error; }
  }
  private async folderMetadata(sourceId: string, id: string, key?: string, signal?: AbortSignal): Promise<DriveFile> {
    const metadata = await this.json<DriveFile>(sourceId, `${API}/${encodeURIComponent(id)}?fields=id,name,mimeType,driveId,trashed,modifiedTime&supportsAllDrives=true`, resourceHeaders(id, key), signal);
    if (metadata.trashed) throw new DriveError("not-found");
    if (metadata.mimeType !== FOLDER_MIME) throw new DriveError("unsupported");
    if (metadata.id && metadata.id !== id) throw new DriveError("api");
    return metadata;
  }
  async list(source: UserSource, signal?: AbortSignal, refresh = false): Promise<ScrapedLink[]> {
    return (await this.listCatalog(source, signal, refresh)).items;
  }
  async listCatalog(source: UserSource, signal?: AbortSignal, refresh = false, context?: SourceOperationContext): Promise<SourceCatalogListing> {
    const operation = sourceOperationContext(context);
    try { return await this.indexCatalog(source, signal, refresh, operation); }
    catch (error) { sourceProgress(operation, signal?.aborted || (error as Error)?.name === "AbortError" ? "cancelled" : "error", {}, sourceOperationErrorCode(error)); throw error; }
  }
  private async indexCatalog(source: UserSource, signal: AbortSignal | undefined, refresh: boolean, context: SourceOperationContext): Promise<SourceCatalogListing> {
    throwIfAborted(signal);
    this.authorization.token(source.id); // Never serve a private index after disconnection/expiry.
    const folder = this.folder(source);
    const cached = this.indexes.get(source.id);
    if (!refresh && cached?.rootFolderId === folder.folderId && Date.now() - cached.updatedAt < 300000) {
      sourceProgress(context, "indexing", { booksFound: cached.items.length, foldersScanned: cached.folders.length, foldersDiscovered: cached.folders.length });
      return cached;
    }
    const generation = (this.generations.get(source.id) ?? 0) + 1;
    this.generations.set(source.id, generation);
    const books = new Map<string, ScrapedLink>();
    const folders = new Map<string, SourceFolder>();
    // Queue only children and explicit folder-shortcut targets; never enumerate all Drive.
    const queue = [{ id: folder.folderId, resourceKey: folder.resourceKey, relativePath: "" }];
    const scheduledFolderIds = new Set([folder.folderId]), visitedFolderIds = new Set<string>();
    let foldersScanned = 0;
    const progress = () => sourceProgress(context, "indexing", { booksFound: books.size, foldersScanned, foldersDiscovered: scheduledFolderIds.size });
    sourceProgress(context, "verifying", { booksFound: 0, foldersScanned: 0, foldersDiscovered: 1 });
    for (let cursor = 0; cursor < queue.length; cursor++) {
      throwIfAborted(signal);
      if (this.generations.get(source.id) !== generation) throw new DriveError("disconnected");
      const current = queue[cursor];
      if (visitedFolderIds.has(current.id)) continue;
      visitedFolderIds.add(current.id);
      const headers = resourceHeaders(current.id, current.resourceKey);
      const metadata = await this.folderMetadata(source.id, current.id, current.resourceKey, signal);
      progress();
      if (cursor === 0) folders.set(current.id, { id: current.id, sourceId: source.id, remoteFolderId: current.id, parentFolderId: null, name: metadata.name ?? source.name, relativePath: "", isShortcut: false, updatedAt: metadata.modifiedTime });
      const pages = new Set<string>();
      let pageToken: string | undefined;
      do {
        throwIfAborted(signal);
        const params = new URLSearchParams({ q: `'${current.id}' in parents and trashed = false`,
          fields: `nextPageToken,incompleteSearch,files(${FIELDS})`, pageSize: "1000", orderBy: "name", supportsAllDrives: "true", includeItemsFromAllDrives: "true",
          corpora: metadata.driveId ? "drive" : "user", ...(metadata.driveId ? { driveId: metadata.driveId } : {}), ...(pageToken ? { pageToken } : {}),
        });
        const page = await this.json<DrivePage>(source.id, `${API}?${params}`, headers, signal);
        if (page.incompleteSearch || !Array.isArray(page.files)) throw new DriveError("api");
        for (const file of page.files) {
          if (!file.id || !/^[\w-]+$/.test(file.id) || typeof file.name !== "string" || typeof file.mimeType !== "string") throw new DriveError("api");
          if (file.trashed) continue;
          const shortcut = file.mimeType === SHORTCUT_MIME && file.shortcutDetails?.targetMimeType === FOLDER_MIME;
          if (file.mimeType === FOLDER_MIME || shortcut) {
            const targetId = shortcut ? file.shortcutDetails?.targetId : file.id;
            if (!targetId || !/^[\w-]+$/.test(targetId)) throw new DriveError("api");
            const relativePath = current.relativePath ? `${current.relativePath} › ${file.name}` : file.name;
            const existing = folders.get(file.id);
            if (existing && existing.parentFolderId !== current.id) throw new DriveError("api");
            if (!existing && folders.size >= 50000) throw new DriveError("api");
            folders.set(file.id, { id: file.id, sourceId: source.id, remoteFolderId: targetId, parentFolderId: current.id, name: file.name, relativePath, isShortcut: shortcut, shortcutTargetId: shortcut ? targetId : undefined, updatedAt: file.modifiedTime });
            if (!scheduledFolderIds.has(targetId)) {
              if (scheduledFolderIds.size >= 20000) throw new DriveError("api");
              scheduledFolderIds.add(targetId);
              queue.push({ id: targetId, resourceKey: shortcut ? file.shortcutDetails?.targetResourceKey : file.resourceKey, relativePath });
            }
            continue;
          }
          if (file.mimeType.startsWith("application/vnd.google-apps.")) continue;
          const format = file.mimeType === "application/pdf" ? "pdf" : file.mimeType === "application/epub+zip" || file.mimeType === "application/epub" ? "epub" : /\.pdf$/i.test(file.name) ? "pdf" : /\.epub$/i.test(file.name) ? "epub" : null;
          if (!format || books.has(file.id)) continue;
          if (books.size >= 200000) throw new DriveError("api");
          const size = Number(file.size);
          books.set(file.id, { url: `${API}/${encodeURIComponent(file.id)}?alt=media`, title: file.name,
            format, estimatedSize: Number.isFinite(size) && size > 0 ? size : null, sourceSite: source.name,
            sourceId: source.id, parentFolderId: current.id, relativeFolderPath: current.relativePath,
            drive: { fileId: file.id, resourceKey: file.resourceKey, modifiedTime: file.modifiedTime, canDownload: file.capabilities?.canDownload },
          });
        }
        pageToken = page.nextPageToken;
        if (pageToken && (pages.has(pageToken) || pages.size >= 10000)) throw new DriveError("api");
        if (pageToken) pages.add(pageToken);
        progress();
      } while (pageToken);
      foldersScanned++;
      progress();
    }
    throwIfAborted(signal);
    if (this.generations.get(source.id) !== generation) throw new DriveError("disconnected");
    this.authorization.token(source.id);
    const result: Index = { rootFolderId: folder.folderId, folders: [...folders.values()], items: [...books.values()], updatedAt: Date.now() };
    this.indexes.set(source.id, result);
    return result;
  }
  async downloadRequest(source: UserSource, fileId: string, signal?: AbortSignal): Promise<{ url: string; headers: Record<string, string> }> {
    const books = await this.list(source, signal);
    const book = books.find(item => item.drive?.fileId === fileId);
    if (!book?.drive) throw new DriveError("not-found");
    const headers = resourceHeaders(fileId, book.drive.resourceKey);
    // Fresh metadata check distinguishes authorization/permission from an invalid book.
    const current = await this.json<DriveFile>(source.id, `${API}/${encodeURIComponent(fileId)}?fields=id,trashed,parents,capabilities(canDownload)&supportsAllDrives=true`, headers, signal);
    if (current.trashed) throw new DriveError("not-found");
    if (current.parents && book.parentFolderId && !current.parents.includes(book.parentFolderId)) throw new DriveError("not-found");
    if (current.capabilities?.canDownload === false) throw new DriveError("permission");
    return { url: book.url, headers: { ...headers, Authorization: `Bearer ${this.authorization.token(source.id)}` } };
  }
  checkDownloadStatus(sourceId: string, status: number, expectedToken?: string, body?: unknown): void {
    if (expectedToken && this.authorization.token(sourceId) !== expectedToken) throw new DriveError("disconnected");
    if (status === 401) { this.authorization.invalidate(sourceId); this.clearIndex(sourceId); }
    try { assertDriveResponse(status, body); } catch (error) {
      if (error instanceof DriveError && error.code === "auth-denied") { this.authorization.invalidate(sourceId); this.clearIndex(sourceId); }
      throw error;
    }
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
      let errorBody: unknown;
      if (!response.ok) {
        try { errorBody = await withAbort(response.json(), controller.signal); } catch { /* Some failures have no JSON body. */ }
      }
      this.checkDownloadStatus(sourceId, response.status, token, errorBody);
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
