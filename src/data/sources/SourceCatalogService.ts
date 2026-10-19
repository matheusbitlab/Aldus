import { SourceCatalogRepository } from "@/src/domain/repositories/SourceCatalogRepository";
import { ScrapedLink } from "@/src/domain/types/search";
import { UserSource } from "@/src/domain/types/sources";
import { SourceCatalog, SourceCatalogItem, SourceCatalogListing, SourceCatalogView, SourceFolder, SourceImportLink, SourceOperationContext, SourceOperationProgress, sourceCapabilities, sourceIdentity } from "@/src/domain/types/sourceCatalog";
import { createCatalogSearchIndex, createCatalogSearchIndexAsync, normalizeCatalogText } from "@/src/domain/search/catalogRanking";
import { DriveError } from "@/src/data/drive/DriveErrors";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { sourceOperationContext, sourceOperationErrorCode, sourceProgress } from "@/src/utils/sourceDiagnostics";
import { measureSource } from "@/src/utils/sourcePerformance";

export interface SourceCatalogAdapter {
  list(source: UserSource, signal: AbortSignal, context?: SourceOperationContext): Promise<ScrapedLink[]>;
  catalog?(source: UserSource, signal: AbortSignal, context?: SourceOperationContext): Promise<SourceCatalogListing>;
  authorizationRequired(source: UserSource): boolean;
}
const initial = (): SourceCatalogView => ({ catalog: null, status: "loading", error: null });
interface CatalogRun {
  sourceId: string;
  generation: number;
  session: number;
  controller: AbortController;
  context: SourceOperationContext;
  observer?: SourceOperationContext["onProgress"];
  previous: SourceCatalogView;
  last?: SourceOperationProgress;
  prepared: boolean;
  closed: boolean;
  detach(): void;
  detachExternal(): void;
}
/** Coordinates full snapshots, not pages. All writes/removals for a source are serialized. */
export class SourceCatalogService {
  private views = new Map<string, SourceCatalogView>();
  private generations = new Map<string, number>();
  private controllers = new Map<string, AbortController>();
  private writes = new Map<string, Promise<unknown>>();
  private listeners = new Set<() => void>();
  private removed = new Set<string>();
  private session = 0;
  private operations = new Map<string, CatalogRun>();
  private prepared = new WeakMap<SourceCatalog, CatalogRun>();
  constructor(readonly repository: SourceCatalogRepository, private adapter: SourceCatalogAdapter, private findSource: (id: string) => Promise<UserSource | undefined>) {}
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  view = (id: string): SourceCatalogView => this.views.get(id) ?? EMPTY_VIEW;
  private publish(id: string, value: SourceCatalogView): void { this.views.set(id, value); for (const listener of this.listeners) listener(); }
  private generation(id: string): number { return this.generations.get(id) ?? 0; }
  private invalidate(id: string): number {
    const generation = this.generation(id) + 1; this.generations.set(id, generation);
    this.controllers.get(id)?.abort(); this.controllers.delete(id);
    return generation;
  }
  /** Drops presentation state synchronously; existing writes remain serialized until they settle. */
  clearSession(): void {
    this.session++;
    for (const [id, run] of this.operations) { run.controller.abort(); this.release(id, run); }
    this.controllers.clear(); this.generations.clear(); this.views.clear(); this.removed.clear(); this.prepared = new WeakMap();
    for (const listener of this.listeners) listener();
  }
  private current(id: string, run: CatalogRun): boolean { return id === run.sourceId && !run.closed && run.session === this.session && run.generation === this.generation(id) && !this.removed.has(id); }
  private check(source: UserSource, run: CatalogRun): void {
    throwIfAborted(run.controller.signal);
    if (!this.current(source.id, run)) { const error = new Error("A operação desta biblioteca foi substituída ou cancelada."); error.name = "AbortError"; throw error; }
    this.checkOwner(source);
  }
  private checkOwner(source: UserSource): void {
    if (typeof source.ownerId === "string" && source.ownerId !== libraryAccountScope.userId) throw new Error("Esta biblioteca não pertence à conta atual.");
  }
  private release(id: string, run: CatalogRun): void {
    run.closed = true; run.detach();
    if (this.controllers.get(id) === run.controller) this.controllers.delete(id);
    if (this.operations.get(id) === run) this.operations.delete(id);
  }
  private begin(source: UserSource, signal?: AbortSignal, context?: SourceOperationContext): CatalogRun {
    const previous = this.view(source.id), generation = this.invalidate(source.id), controller = new AbortController(), provided = sourceOperationContext(context);
    const run: CatalogRun = { sourceId: source.id, generation, session: this.session, controller, previous, context: provided, observer: provided.onProgress, prepared: false, closed: false, detach: () => {}, detachExternal: () => {} };
    run.context = { operationId: provided.operationId, onProgress: progress => {
      if (!this.current(source.id, run) || controller.signal.aborted && progress.phase !== "cancelled") return;
      run.last = { ...run.last, ...progress };
      this.publish(source.id, { ...this.view(source.id), operation: run.last });
      try { run.observer?.({ ...run.last }); } catch { /* A progress observer cannot change the operation. */ }
    } };
    const abort = () => controller.abort();
    const aborted = () => { if (run.prepared) { this.failure(source, run, abortError()); this.release(source.id, run); } };
    signal?.addEventListener("abort", abort, { once: true }); controller.signal.addEventListener("abort", aborted, { once: true });
    run.detachExternal = () => signal?.removeEventListener("abort", abort);
    run.detach = () => { run.detachExternal(); controller.signal.removeEventListener("abort", aborted); };
    this.operations.set(source.id, run); this.controllers.set(source.id, controller);
    this.publish(source.id, { ...previous, status: previous.catalog ? "refreshing" : "loading", error: null });
    sourceProgress(run.context, "preparing", { booksFound: 0, foldersScanned: 0, foldersDiscovered: 0 });
    if (signal?.aborted) abort();
    return run;
  }
  private failure(source: UserSource, run: CatalogRun, error: unknown): void {
    if (!this.current(source.id, run)) return;
    const cancelled = run.controller.signal.aborted || (error as Error)?.name === "AbortError";
    const code = sourceOperationErrorCode(error), auth = code === "expired" || code === "disconnected" || this.adapter.authorizationRequired(source);
    const offline = code === "network" || (typeof navigator !== "undefined" && navigator.onLine === false);
    // Aborted runs still report their own terminal progress, never a newer run's data.
    const operation: SourceOperationProgress = { ...run.last, operationId: run.context.operationId, phase: cancelled ? "cancelled" : "error" };
    run.last = operation;
    sourceProgress(run.context, cancelled ? "cancelled" : "error", operation, code);
    this.publish(source.id, { catalog: run.previous.catalog, status: cancelled ? run.previous.catalog ? "stale" : "empty" : auth ? "auth_required" : offline ? "offline" : run.previous.catalog ? "stale" : "error",
      error: cancelled ? null : error instanceof DriveError ? error.message : auth ? "Reconecte o Google Drive para atualizar esta fonte." : "Não foi possível atualizar. Exibindo a última atualização disponível, quando houver. Confira rede e permissões; aguarde se o limite de consultas foi atingido.", operation });
  }
  private write<T>(id: string, action: () => Promise<T>): Promise<T> {
    const next = (this.writes.get(id) ?? Promise.resolve()).catch(() => undefined).then(action);
    this.writes.set(id, next);
    void next.finally(() => { if (this.writes.get(id) === next) this.writes.delete(id); }).catch(() => undefined);
    return next;
  }
  async load(source: UserSource, signal?: AbortSignal): Promise<void> {
    if (this.removed.has(source.id) || this.controllers.has(source.id)) return;
    const generation = this.generation(source.id), session = this.session;
    try {
      this.checkOwner(source);
      const current = await withAbort(this.findSource(source.id), signal);
      if (session !== this.session || generation !== this.generation(source.id)) return;
      if (!current || sourceIdentity(current) !== sourceIdentity(source)) throw new Error("Esta biblioteca não está disponível para a conta atual.");
      this.checkOwner(current);
      const previous = this.view(source.id);
      if (previous.catalog?.sourceIdentity === sourceIdentity(source)) {
        // A mounted summary and its library share one immutable snapshot. Reopening
        // must not parse, tokenize and sort the same persisted collection again.
        const catalog = previous.catalog.sourceName === source.name ? previous.catalog : { ...previous.catalog, sourceName: source.name };
        const status = this.adapter.authorizationRequired(source) ? 'auth_required' : typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline'
          : previous.status === 'auth_required' || previous.status === 'offline' ? 'stale' : previous.status;
        if (catalog !== previous.catalog || status !== previous.status) this.publish(source.id, { ...previous, catalog, status });
        return;
      }
      const stored = await withAbort(this.repository.get(source.id), signal);
      if (session !== this.session || generation !== this.generation(source.id)) return;
      const catalog = stored?.sourceIdentity === sourceIdentity(source) ? { ...stored, sourceName: source.name } : null;
      if (catalog) querySourceCatalog(catalog.items, "", "az");
      if (this.controllers.has(source.id)) return;
      this.publish(source.id, { catalog, status: this.adapter.authorizationRequired(source) ? "auth_required" : typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : catalog ? "stale" : "empty", error: null });
    } catch {
      if (session !== this.session || generation !== this.generation(source.id) || this.controllers.has(source.id)) return;
      if (signal?.aborted) {
        const previous = this.view(source.id);
        this.publish(source.id, { ...previous, status: previous.catalog ? "stale" : "empty", error: null });
      } else this.publish(source.id, { ...initial(), status: "error", error: "Não foi possível ler o catálogo persistido desta fonte." });
    }
  }
  /** Fetches and validates one complete snapshot in memory. No source or catalog is saved here. */
  async prepare(source: UserSource, signal?: AbortSignal, context?: SourceOperationContext): Promise<SourceCatalog> {
    if (this.removed.has(source.id)) throw new Error("Esta biblioteca foi removida.");
    if (!sourceCapabilities(source).supportsCatalog) throw new Error("Esta fonte oferece somente pesquisa.");
    const run = this.begin(source, signal, context), active = run.controller.signal;
    try {
      this.check(source, run);
      if (!source.enabled) throw new Error("Ative ou reconecte esta fonte em Gerenciar fontes.");
      sourceProgress(run.context, "indexing");
      const listing = this.adapter.catalog ? await withAbort(this.adapter.catalog(source, active, run.context), active) : { items: await withAbort(this.adapter.list(source, active, run.context), active) };
      this.check(source, run);
      sourceProgress(run.context, "organizing", { booksFound: listing.items.length, ...(listing.folders ? { foldersDiscovered: listing.folders.length } : {}) });
      const tree = catalogFolders(source, listing);
      const catalog: SourceCatalog = { sourceId: source.id, sourceName: source.name, sourceType: source.kind, sourceIdentity: sourceIdentity(source), items: catalogItems(source, listing.items), ...tree, lastUpdated: Date.now() };
      const parentIds = new Set(tree.folders.map(folder => folder.remoteFolderId));
      if (tree.rootFolderId && catalog.items.some(item => !item.parentFolderId || !parentIds.has(item.parentFolderId))) throw new Error("Pasta de livro fora da árvore.");
      querySourceCatalog(catalog.items, "", "az");
      this.check(source, run);
      this.prepared.set(catalog, run); run.prepared = true;
      this.publish(source.id, { catalog: run.previous.catalog, status: run.previous.catalog ? "stale" : "empty", error: null, operation: run.last });
      return catalog;
    } catch (error) { this.failure(source, run, error); this.release(source.id, run); throw error; }
  }
  /** Commits the prepared object once, after the source has been persisted by the caller. */
  async commitPrepared(source: UserSource, catalog: SourceCatalog, signal?: AbortSignal, context?: SourceOperationContext): Promise<void> {
    const run = this.prepared.get(catalog);
    if (!run || context && context.operationId !== run.context.operationId) throw new Error("Busque os livros novamente antes de salvar esta biblioteca.");
    run.detachExternal();
    if (context) run.observer = context.onProgress;
    let saveFailed = false, keepPrepared = false;
    const abort = () => run.controller.abort();
    signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) abort();
    try {
      this.check(source, run);
      if (catalog.sourceId !== source.id || catalog.sourceType !== source.kind || catalog.sourceIdentity !== sourceIdentity(source)) throw new Error("A biblioteca mudou após a busca. Busque os livros novamente.");
      const tree = catalogFolders(source, catalog), items = catalogItems(source, catalog.items), parentIds = new Set(tree.folders.map(folder => folder.remoteFolderId));
      if (tree.rootFolderId && items.some(item => !item.parentFolderId || !parentIds.has(item.parentFolderId))) throw new Error("Pasta de livro fora da árvore.");
      const snapshot: SourceCatalog = { ...catalog, sourceName: source.name, items, ...tree };
      sourceProgress(run.context, "saving", run.last);
      await withAbort(this.write(source.id, async () => {
        this.check(source, run);
        const current = await withAbort(this.findSource(source.id), run.controller.signal);
        this.check(source, run);
        if (!current || !current.enabled || sourceIdentity(current) !== catalog.sourceIdentity) throw new Error("A fonte mudou durante a atualização.");
        this.checkOwner(current);
        // Keep the underlying write in the queue even if the caller cancels.
        // A newer snapshot must never be overtaken by a late native save.
        try { await this.repository.save(snapshot, run.controller.signal); }
        catch (error) { saveFailed = true; throw error; }
        this.check(source, run);
      }), run.controller.signal);
      this.check(source, run);
      sourceProgress(run.context, "success", run.last);
      this.publish(source.id, { catalog: snapshot, status: snapshot.items.length || (snapshot.folders?.length ?? 0) > 1 ? "ready" : "empty", error: null, operation: run.last });
    } catch (error) {
      this.failure(source, run, error);
      if (saveFailed && this.current(source.id, run) && !run.controller.signal.aborted && catalog.sourceIdentity === sourceIdentity(source)) {
        try {
          const current = await withAbort(this.findSource(source.id), run.controller.signal);
          this.check(source, run);
          if (current?.enabled && sourceIdentity(current) === catalog.sourceIdentity) { this.checkOwner(current); keepPrepared = true; }
        } catch { /* A changed/unknown scope cannot retain a writable draft. */ }
      }
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      if (!keepPrepared) { this.prepared.delete(catalog); this.release(source.id, run); }
    }
  }
  async refresh(source: UserSource, signal?: AbortSignal, context?: SourceOperationContext): Promise<void> {
    if (this.removed.has(source.id)) return;
    let catalog: SourceCatalog | undefined;
    try { catalog = await this.prepare(source, signal, context); await this.commitPrepared(source, catalog, signal, context); }
    catch {
      // A direct refresh has no review screen that could reuse a prepared handle.
      const run = catalog && this.prepared.get(catalog);
      if (catalog && run) { this.prepared.delete(catalog); this.release(source.id, run); }
      // prepare/commit already preserved the snapshot and published a safe terminal state.
    }
  }
  async remove(id: string): Promise<void> {
    const session = this.session, accessible = await this.findSource(id);
    if (session !== this.session) throw abortError();
    if (!accessible) throw new Error("Esta biblioteca não está disponível para a conta atual.");
    this.checkOwner(accessible);
    const identity = sourceIdentity(accessible);
    this.removed.add(id);
    const generation = this.invalidate(id), previous = this.view(id);
    try {
      await this.write(id, async () => {
        if (session !== this.session) throw abortError();
        const current = await this.findSource(id);
        if (session !== this.session) throw abortError();
        if (!current || sourceIdentity(current) !== identity) throw new Error("A biblioteca mudou durante a remoção.");
        this.checkOwner(current);
        await this.repository.remove(id);
      });
      if (session === this.session && generation === this.generation(id)) this.publish(id, { catalog: null, status: "empty", error: null });
    } catch (error) {
      if (session === this.session && generation === this.generation(id)) {
        this.removed.delete(id);
        this.publish(id, { ...previous, status: previous.catalog ? "stale" : "error", error: "Não foi possível remover o catálogo. A fonte foi preservada; tente novamente." });
      }
      throw error;
    }
  }
  async reset(id: string): Promise<void> { const session = this.session; await this.remove(id); if (session === this.session) this.removed.delete(id); }
  cancel(sourceId: string): void {
    const run = this.operations.get(sourceId);
    if (run && this.current(sourceId, run)) sourceProgress(run.context, "cancelled", run.last, "cancelled");
    this.invalidate(sourceId);
    const previous = this.view(sourceId);
    this.publish(sourceId, { ...previous, status: previous.catalog ? "stale" : "empty", error: null });
  }
  async recordImport(sourceId: string, remoteBookId: string, bookId: string, identity?: string): Promise<void> {
    const session = this.session, generation = this.generation(sourceId);
    await this.write(sourceId, async () => {
      if (session !== this.session || generation !== this.generation(sourceId) || this.removed.has(sourceId)) return;
      const source = await this.findSource(sourceId);
      if (!source || session !== this.session || generation !== this.generation(sourceId) || this.removed.has(sourceId) || identity && sourceIdentity(source) !== identity) return;
      this.checkOwner(source);
      await this.repository.link({ sourceId, remoteBookId, bookId });
    });
  }
  async links(sourceId: string): Promise<SourceImportLink[]> {
    const session = this.session, generation = this.generation(sourceId), source = await this.findSource(sourceId);
    if (!source || session !== this.session || generation !== this.generation(sourceId)) return [];
    this.checkOwner(source);
    const catalog = this.view(sourceId).catalog ?? await this.repository.get(sourceId);
    if (session !== this.session || generation !== this.generation(sourceId) || !catalog || catalog.sourceIdentity !== sourceIdentity(source)) return [];
    const links = await this.repository.links(sourceId);
    return session === this.session && generation === this.generation(sourceId) ? links : [];
  }
}
function abortError(): Error { const error = new Error("Operação cancelada."); error.name = "AbortError"; return error; }
const EMPTY_VIEW = initial();
function safeUrl(value: string): string {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || /(?:access_token|authorization|token|signature)=/i.test(url.hash) || [...url.searchParams.keys()].some(key => /^(access_token|token|authorization|signature|x-amz-signature|x-goog-signature)$/i.test(key))) throw new Error("URL não segura para persistência do catálogo.");
  return url.href;
}
export function catalogItems(source: UserSource, links: ScrapedLink[]): SourceCatalogItem[] {
  if (source.kind === "json") safeUrl(source.url);
  const items = new Map<string, SourceCatalogItem>();
  for (const link of links) {
    if (!link.title?.trim() || (link.format !== "epub" && link.format !== "pdf")) throw new Error("Metadados inválidos na fonte.");
    if (link.estimatedSize !== null && (!Number.isFinite(link.estimatedSize) || link.estimatedSize < 0)) throw new Error("Tamanho inválido na fonte.");
    if (link.parentFolderId != null && (typeof link.parentFolderId !== "string" || !/^[\w-]+$/.test(link.parentFolderId)) || link.relativeFolderPath != null && typeof link.relativeFolderPath !== "string") throw new Error("Localização inválida na fonte.");
    const url = safeUrl(link.url), remoteBookId = link.drive?.fileId ?? link.remoteBookId ?? url;
    if (!remoteBookId || items.has(remoteBookId)) throw new Error("Identidade remota duplicada ou inválida.");
    // Explicit allowlist: arbitrary adapter fields, headers and credentials never reach disk.
    items.set(remoteBookId, {
      sourceId: source.id, remoteBookId, url, title: link.title, author: link.author,
      parentFolderId: link.parentFolderId, relativeFolderPath: link.relativeFolderPath,
      normalizedTitle: normalizeCatalogText(link.title), normalizedAuthor: link.author ? normalizeCatalogText(link.author) : undefined,
      sourceSite: source.name, format: link.format, estimatedSize: link.estimatedSize,
      coverUrl: link.coverUrl ? safeUrl(link.coverUrl) : undefined, language: link.language,
      subjects: link.subjects, description: link.description,
      modifiedAt: link.drive?.modifiedTime ?? link.modifiedAt,
      availability: link.drive?.canDownload === false ? "unavailable" : "available",
      drive: link.drive ? { fileId: link.drive.fileId, resourceKey: link.drive.resourceKey, modifiedTime: link.drive.modifiedTime, canDownload: link.drive.canDownload } : undefined,
    });
  }
  return [...items.values()];
}
export type SourceCatalogSort = "az" | "za" | "recent";
const queryIndexes = new WeakMap<SourceCatalogItem[], { index?: ReturnType<typeof createCatalogSearchIndex<SourceCatalogItem>>; sorted: Partial<Record<SourceCatalogSort, SourceCatalogItem[]>> }>();
// Reuse one ICU collator. Constructing it inside every localeCompare is costly on Native.
const titleCollator = new Intl.Collator('pt');
const compareItems = (sort: SourceCatalogSort) => (a: SourceCatalogItem, b: SourceCatalogItem) => sort === "recent" ? (Date.parse(b.modifiedAt ?? "") || 0) - (Date.parse(a.modifiedAt ?? "") || 0) || titleCollator.compare(a.title, b.title) : titleCollator.compare(a.title, b.title) * (sort === "za" ? -1 : 1);
export function querySourceCatalog(items: SourceCatalogItem[], query: string, sort: SourceCatalogSort): SourceCatalogItem[] {
  let cached = queryIndexes.get(items);
  if (!cached) {
    cached = { sorted: {} };
    queryIndexes.set(items, cached);
  }
  if (query.trim()) {
    cached.index ??= measureSource('search_index', items.length, () => createCatalogSearchIndex(items));
    return measureSource('search', items.length, () => cached.index!.search(query, compareItems(sort)));
  }
  return cached.sorted[sort] ??= measureSource('sort', items.length, () => [...items].sort(compareItems(sort)));
}
/** Same ranking rules/cache; large Native searches yield between batches and reject obsolete input. */
export async function querySourceCatalogAsync(items: SourceCatalogItem[], query: string, sort: SourceCatalogSort, signal?: AbortSignal): Promise<SourceCatalogItem[]> {
  throwIfAborted(signal);
  if (!query.trim()) return querySourceCatalog(items, query, sort);
  let cached = queryIndexes.get(items);
  if (!cached) { cached = { sorted: {} }; queryIndexes.set(items, cached); }
  if (!cached.index) {
    const prepared = await createCatalogSearchIndexAsync(items, signal);
    throwIfAborted(signal); cached.index ??= prepared;
  }
  return cached.index.searchAsync(query, compareItems(sort), signal);
}

function catalogFolders(source: UserSource, listing: SourceCatalogListing): { schemaVersion?: 2; rootFolderId?: string; folders: SourceFolder[] } {
  if (!listing.rootFolderId && !listing.folders?.length) return { folders: [] };
  const folders = (listing.folders ?? []).map(folder => ({ id: folder.id, sourceId: source.id, remoteFolderId: folder.remoteFolderId,
    parentFolderId: folder.parentFolderId, name: folder.name, relativePath: folder.relativePath, isShortcut: folder.isShortcut,
    shortcutTargetId: folder.isShortcut ? folder.shortcutTargetId : undefined, updatedAt: folder.updatedAt }));
  const ids = new Set<string>(), containers = new Set(folders.map(folder => folder.remoteFolderId));
  for (const folder of folders) {
    if (!/^[\w-]+$/.test(folder.id) || !/^[\w-]+$/.test(folder.remoteFolderId) || ids.has(folder.id) || typeof folder.name !== "string" || typeof folder.relativePath !== "string" || typeof folder.isShortcut !== "boolean"
      || folder.isShortcut && folder.shortcutTargetId !== folder.remoteFolderId || !folder.isShortcut && folder.remoteFolderId !== folder.id || folder.parentFolderId !== null && !containers.has(folder.parentFolderId)) throw new Error("Estrutura de pastas inválida.");
    ids.add(folder.id);
  }
  const root = folders.find(folder => folder.id === listing.rootFolderId);
  if (!root || source.folderId && source.folderId !== root.id || root.parentFolderId !== null || root.isShortcut || root.remoteFolderId !== root.id || folders.some(folder => folder.id !== root.id && folder.parentFolderId === null)) throw new Error("Raiz da fonte inválida.");
  const reachable = new Set([root.remoteFolderId]);
  const children = new Map<string, SourceFolder[]>();
  for (const folder of folders) if (folder.parentFolderId) { const siblings = children.get(folder.parentFolderId) ?? []; siblings.push(folder); children.set(folder.parentFolderId, siblings); }
  const queue = [root.remoteFolderId];
  for (let i = 0; i < queue.length; i++) for (const child of children.get(queue[i]) ?? []) if (!reachable.has(child.remoteFolderId)) { reachable.add(child.remoteFolderId); queue.push(child.remoteFolderId); }
  if (folders.some(folder => !reachable.has(folder.remoteFolderId) || folder.parentFolderId && !reachable.has(folder.parentFolderId))) throw new Error("Pasta fora da raiz da fonte.");
  return { schemaVersion: 2, rootFolderId: root.id, folders };
}
