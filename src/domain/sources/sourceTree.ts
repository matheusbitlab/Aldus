import { createCatalogSearchIndex } from "@/src/domain/search/catalogRanking";
import { SourceCatalog, SourceCatalogItem, SourceFolder } from "@/src/domain/types/sourceCatalog";
import { measureSource } from "@/src/utils/sourcePerformance";

const cache = new WeakMap<SourceCatalog, ReturnType<typeof buildTreeIndex>>();
const folderCollator = new Intl.Collator('pt');
function buildTreeIndex(catalog: SourceCatalog) {
  const byId = new Map((catalog.folders ?? []).map(folder => [folder.id, folder]));
  const foldersByParent = new Map<string, SourceFolder[]>(), booksByParent = new Map<string, SourceCatalogItem[]>();
  for (const folder of byId.values()) {
    if (folder.parentFolderId == null) continue;
    const siblings = foldersByParent.get(folder.parentFolderId) ?? [];
    siblings.push(folder); foldersByParent.set(folder.parentFolderId, siblings);
  }
  for (const siblings of foldersByParent.values()) siblings.sort((a, b) => folderCollator.compare(a.name, b.name));
  for (const book of catalog.items) {
    const parent = book.parentFolderId ?? catalog.rootFolderId;
    if (!parent) continue;
    const siblings = booksByParent.get(parent) ?? [];
    siblings.push(book); booksByParent.set(parent, siblings);
  }
  const folderSearch = createCatalogSearchIndex([...byId.values()].filter(folder => folder.id !== catalog.rootFolderId)
    .map(folder => ({ folder, title: folder.name, url: "", format: "unknown" as const, estimatedSize: null, sourceSite: catalog.sourceName })));
  return { byId, foldersByParent, booksByParent, searchFolders: (query: string) => folderSearch.search(query).map(row => row.folder) };
}
export function sourceTreeIndex(catalog: SourceCatalog) {
  let index = cache.get(catalog);
  if (!index) { index = measureSource('tree', catalog.items.length, () => buildTreeIndex(catalog)); cache.set(catalog, index); }
  return index;
}
/** Revalidates IDs after refresh; removed/moved ancestors return to the last known parent. */
export function sourceFolderTrail(catalog: SourceCatalog, folderIds: string[]): SourceFolder[] {
  const { byId } = sourceTreeIndex(catalog), root = byId.get(catalog.rootFolderId ?? "");
  if (!root) return [];
  const trail = [root];
  for (const id of folderIds) {
    const folder = byId.get(id);
    if (!folder || folder.parentFolderId !== trail.at(-1)!.remoteFolderId || trail.some(parent => parent.remoteFolderId === folder.remoteFolderId)) break;
    trail.push(folder);
  }
  return trail;
}
/** A shortcut back to an ancestor opens that ancestor rather than growing a cyclic breadcrumb. */
export function enterSourceFolder(trail: SourceFolder[], folder: SourceFolder): string[] {
  const ancestor = trail.findIndex(parent => parent.remoteFolderId === folder.remoteFolderId);
  return ancestor >= 0 ? trail.slice(1, ancestor + 1).map(parent => parent.id) : [...trail.slice(1).map(parent => parent.id), folder.id];
}
export function sourceFolderContents(catalog: SourceCatalog, folderId?: string) {
  const index = sourceTreeIndex(catalog);
  if (!catalog.rootFolderId) return { folders: [] as SourceFolder[], books: catalog.items };
  return { folders: index.foldersByParent.get(folderId ?? catalog.rootFolderId) ?? [], books: index.booksByParent.get(folderId ?? catalog.rootFolderId) ?? [] };
}
/** Finds a route by IDs, including legitimate shortcut edges, without using names as identity. */
export function sourceFolderRoute(catalog: SourceCatalog, folderId: string): string[] {
  const { foldersByParent } = sourceTreeIndex(catalog);
  if (!catalog.rootFolderId || folderId === catalog.rootFolderId) return [];
  const visited = new Set([catalog.rootFolderId]), queue = [{ contentId: catalog.rootFolderId, ids: [] as string[] }];
  for (let i = 0; i < queue.length; i++) for (const folder of foldersByParent.get(queue[i].contentId) ?? []) {
    const ids = [...queue[i].ids, folder.id];
    if (folder.id === folderId) return enterSourceFolder(sourceFolderTrail(catalog, queue[i].ids), folder);
    if (!visited.has(folder.remoteFolderId)) { visited.add(folder.remoteFolderId); queue.push({ contentId: folder.remoteFolderId, ids }); }
  }
  return [];
}
