import { SourceCatalogRepository } from "@/src/domain/repositories/SourceCatalogRepository";
import { ScrapedLink } from "@/src/domain/types/search";
import { UserSource } from "@/src/domain/types/sources";
import { SourceCatalog, SourceCatalogItem, SourceCatalogView, SourceImportLink, sourceCapabilities, sourceIdentity } from "@/src/domain/types/sourceCatalog";
import { rankCatalogBooks } from "@/src/domain/search/catalogRanking";

export interface SourceCatalogAdapter {
  list(source: UserSource, signal: AbortSignal): Promise<ScrapedLink[]>;
  authorizationRequired(source: UserSource): boolean;
}
const initial = (): SourceCatalogView => ({ catalog: null, status: "loading", error: null });
/** Coordinates full snapshots, not pages. All writes/removals for a source are serialized. */
export class SourceCatalogService {
  private views = new Map<string, SourceCatalogView>();
  private generations = new Map<string, number>();
  private controllers = new Map<string, AbortController>();
  private writes = new Map<string, Promise<unknown>>();
  private listeners = new Set<() => void>();
  private removed = new Set<string>();
  constructor(readonly repository: SourceCatalogRepository, private adapter: SourceCatalogAdapter, private findSource: (id: string) => Promise<UserSource | undefined>) {}
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  view = (id: string): SourceCatalogView => this.views.get(id) ?? EMPTY_VIEW;
  private publish(id: string, value: SourceCatalogView): void { this.views.set(id, value); for (const listener of this.listeners) listener(); }
  private generation(id: string): number { return this.generations.get(id) ?? 0; }
  private invalidate(id: string): number {
    this.controllers.get(id)?.abort(); this.controllers.delete(id);
    const generation = this.generation(id) + 1; this.generations.set(id, generation); return generation;
  }
  private write<T>(id: string, action: () => Promise<T>): Promise<T> {
    const next = (this.writes.get(id) ?? Promise.resolve()).catch(() => undefined).then(action);
    this.writes.set(id, next);
    void next.finally(() => { if (this.writes.get(id) === next) this.writes.delete(id); }).catch(() => undefined);
    return next;
  }
  async load(source: UserSource): Promise<void> {
    if (this.removed.has(source.id) || this.controllers.has(source.id)) return;
    const generation = this.generation(source.id);
    try {
      const stored = await this.repository.get(source.id);
      if (generation !== this.generation(source.id)) return;
      const catalog = stored?.sourceIdentity === sourceIdentity(source) ? { ...stored, sourceName: source.name } : null;
      if (this.controllers.has(source.id)) return;
      this.publish(source.id, { catalog, status: this.adapter.authorizationRequired(source) ? "auth_required" : typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : catalog ? "stale" : "empty", error: null });
    } catch { if (generation === this.generation(source.id)) this.publish(source.id, { ...initial(), status: "error", error: "Não foi possível ler o catálogo persistido desta fonte." }); }
  }
  async refresh(source: UserSource): Promise<void> {
    if (this.removed.has(source.id)) return;
    if (!sourceCapabilities(source).supportsCatalog) throw new Error("Esta fonte oferece somente pesquisa.");
    const generation = this.invalidate(source.id), controller = new AbortController();
    this.controllers.set(source.id, controller);
    const previous = this.view(source.id);
    this.publish(source.id, { ...previous, status: previous.catalog ? "refreshing" : "loading", error: null });
    try {
      if (!source.enabled) throw new Error("Ative ou reconecte esta fonte em Gerenciar fontes.");
      const links = await this.adapter.list(source, controller.signal);
      const catalog: SourceCatalog = { sourceId: source.id, sourceName: source.name, sourceType: source.kind, sourceIdentity: sourceIdentity(source), items: catalogItems(source, links), lastUpdated: Date.now() };
      await this.write(source.id, async () => {
        if (generation !== this.generation(source.id) || controller.signal.aborted) return;
        const current = await this.findSource(source.id);
        if (!current || !current.enabled || sourceIdentity(current) !== catalog.sourceIdentity || generation !== this.generation(source.id)) return;
        await this.repository.save(catalog);
        if (generation === this.generation(source.id)) this.publish(source.id, { catalog, status: catalog.items.length ? "ready" : "empty", error: null });
      });
    } catch (error) {
      if (generation !== this.generation(source.id)) return;
      const code = (error as { code?: string })?.code;
      const auth = code === "expired" || code === "disconnected" || this.adapter.authorizationRequired(source);
      const offline = code === "network" || (typeof navigator !== "undefined" && navigator.onLine === false);
      // No raw provider/URL errors persisted or exposed (may contain credentials).
      this.publish(source.id, { catalog: previous.catalog, status: auth ? "auth_required" : offline ? "offline" : previous.catalog ? "stale" : "error", error: auth ? "Reconecte o Google Drive para atualizar esta fonte." : "Não foi possível atualizar. Exibindo a última atualização disponível, quando houver. Confira rede e permissões; aguarde se o limite de consultas foi atingido." });
    } finally { if (this.controllers.get(source.id) === controller) this.controllers.delete(source.id); }
  }
  async remove(id: string): Promise<void> {
    this.removed.add(id);
    const generation = this.invalidate(id), previous = this.view(id);
    try {
      await this.write(id, () => this.repository.remove(id));
      if (generation === this.generation(id)) this.publish(id, { catalog: null, status: "empty", error: null });
    } catch (error) {
      if (generation === this.generation(id)) {
        this.removed.delete(id);
        this.publish(id, { ...previous, status: previous.catalog ? "stale" : "error", error: "Não foi possível remover o catálogo. A fonte foi preservada; tente novamente." });
      }
      throw error;
    }
  }
  async reset(id: string): Promise<void> { await this.remove(id); this.removed.delete(id); }
  cancel(sourceId: string): void {
    this.invalidate(sourceId);
    const previous = this.view(sourceId);
    this.publish(sourceId, { ...previous, status: previous.catalog ? "stale" : "empty", error: null });
  }
  async recordImport(sourceId: string, remoteBookId: string, bookId: string, identity?: string): Promise<void> {
    await this.write(sourceId, async () => {
      if (this.removed.has(sourceId)) return;
      const source = await this.findSource(sourceId);
      if (!source || this.removed.has(sourceId) || identity && sourceIdentity(source) !== identity) return;
      await this.repository.link({ sourceId, remoteBookId, bookId });
    });
  }
  links(sourceId: string): Promise<SourceImportLink[]> { return this.repository.links(sourceId); }
}
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
    const url = safeUrl(link.url), remoteBookId = link.drive?.fileId ?? link.remoteBookId ?? url;
    if (!remoteBookId || items.has(remoteBookId)) throw new Error("Identidade remota duplicada ou inválida.");
    // Explicit allowlist: arbitrary adapter fields, headers and credentials never reach disk.
    items.set(remoteBookId, {
      sourceId: source.id, remoteBookId, url, title: link.title, author: link.author,
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
export function querySourceCatalog(items: SourceCatalogItem[], query: string, sort: SourceCatalogSort): SourceCatalogItem[] {
  const sorted = [...items].sort((a, b) => sort === "recent" ? (Date.parse(b.modifiedAt ?? "") || 0) - (Date.parse(a.modifiedAt ?? "") || 0) || a.title.localeCompare(b.title, "pt") : a.title.localeCompare(b.title, "pt") * (sort === "za" ? -1 : 1));
  // Existing ranker orders relevance first, retaining chosen order for ties.
  return query.trim() ? rankCatalogBooks(sorted, query) : sorted;
}
