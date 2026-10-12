import { ScrapedLink } from "./search";
import { SourceKind, UserSource } from "./sources";

/** Metadata only. Acquisition state is independent from personal reading progress. */
export interface SourceCatalogItem extends ScrapedLink {
  sourceId: string;
  remoteBookId: string;
  modifiedAt?: string;
  availability: "available" | "unavailable";
  parentFolderId?: string;
  relativeFolderPath?: string;
  normalizedTitle?: string;
  normalizedAuthor?: string;
}
/** IDs come from Drive. A shortcut has its own id and exposes its target's contents. */
export interface SourceFolder {
  id: string;
  sourceId: string;
  remoteFolderId: string;
  parentFolderId: string | null;
  name: string;
  relativePath: string;
  isShortcut: boolean;
  shortcutTargetId?: string;
  updatedAt?: string;
}
export interface SourceCatalogListing { items: ScrapedLink[]; rootFolderId?: string; folders?: SourceFolder[]; }
export type SourceCatalogStatus = "loading" | "empty" | "ready" | "refreshing" | "stale" | "offline" | "error" | "auth_required";
export interface SourceCatalog {
  sourceId: string;
  sourceName: string;
  sourceType: SourceKind;
  /** Prevents rendering a snapshot from a previous folder/endpoint after an edit. */
  sourceIdentity: string;
  items: SourceCatalogItem[];
  /** Optional for snapshots written before hierarchical catalogs existed. */
  schemaVersion?: 2;
  rootFolderId?: string;
  folders?: SourceFolder[];
  lastUpdated: number;
}
export interface SourceCatalogView {
  catalog: SourceCatalog | null;
  status: SourceCatalogStatus;
  error: string | null;
}
export interface SourceImportLink { sourceId: string; remoteBookId: string; bookId: string; }
export type SourceAcquisitionState = "remote_only" | "downloading" | "imported" | "unavailable";
export interface SourceCapabilities {
  supportsCatalog: boolean;
  supportsSearch: boolean;
  supportsDownload: boolean;
  supportsRefresh: boolean;
  requiresAuthorization: boolean;
}
export function sourceCapabilities(source: UserSource): SourceCapabilities {
  const supportsCatalog = source.kind === "google-drive" || (source.kind === "json" && !source.url.includes("{query}"));
  return { supportsCatalog, supportsSearch: source.kind !== "webview", supportsDownload: source.kind !== "webview", supportsRefresh: supportsCatalog, requiresAuthorization: source.kind === "google-drive" };
}
export function sourceIdentity(source: UserSource): string {
  return JSON.stringify([source.kind, source.kind === "google-drive" ? source.folderId ?? source.url : source.url, source.kind === "google-drive" ? source.resourceKey ?? null : null]);
}
export function sourceTypeLabel(kind: SourceKind): string {
  return ({ "google-drive": "Google Drive", json: "Catálogo JSON", opds: "OPDS", html: "HTML", bndigital: "BNDigital", gutenberg: "Gutenberg", webview: "Serviço Web" } satisfies Record<SourceKind, string>)[kind];
}
