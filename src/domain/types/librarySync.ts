export const libraryEntityKinds = ['book','progress','bookmark','highlight','organization','pdf_position'] as const;
export type LibraryEntityKind = typeof libraryEntityKinds[number];
export interface RemoteLibraryRow {
  user_id: string; kind: LibraryEntityKind; id: string; book_id: string;
  payload: Record<string, any>; revision: number; updated_at: string; deleted_at: string | null;
}
export interface LibrarySyncEntry {
  key: string; kind: LibraryEntityKind; id: string; bookId: string;
  payload: Record<string, any>; deleted: boolean; dirty: boolean; ready: boolean;
  operationId: string; baseRevision: number;
  shadow?: RemoteLibraryRow;
  /** Preserve rejected local intent; never silently destroy concurrent edits. */
  conflict?: { payload: Record<string, any>; deleted: boolean };
}
export interface LibrarySyncState { id: string; entries: Record<string, LibrarySyncEntry>; lastSync: number | null; }
export interface LibrarySyncPersistence {
  read(owner: string): Promise<LibrarySyncState>;
  mutate(owner: string, change: (state: LibrarySyncState) => void): Promise<void>;
}
export interface LibraryRemoteAdapter {
  pull(owner: string, signal: AbortSignal): Promise<RemoteLibraryRow[]>;
  apply(owner: string, entry: LibrarySyncEntry, signal: AbortSignal): Promise<{ accepted: boolean; row: RemoteLibraryRow }>;
}
export const syncKey = (kind: LibraryEntityKind, id: string) => `${kind}:${id}`;
export function equalSyncPayload(a: Record<string, any>, b: Record<string, any>) {
  const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
export function emptySyncState(owner: string): LibrarySyncState { return { id: owner, entries: {}, lastSync: null }; }
export function validateRemoteRow(row: RemoteLibraryRow, owner: string): void {
  const validId=(value:unknown)=>typeof value==='string' && value.length>0 && value.length<=200 && !/[\\/\u0000-\u001f]/.test(value) && !['.','..','__proto__','constructor','prototype'].includes(value);
  if (!row || row.user_id !== owner || !libraryEntityKinds.includes(row.kind) || !validId(row.id) || !validId(row.book_id)
    || !Number.isSafeInteger(row.revision) || row.revision < 1 || !row.payload || typeof row.payload !== 'object'
    || Array.isArray(row.payload) || (row.kind === 'book' && row.id !== row.book_id)
    || typeof row.updated_at!=='string' || !Number.isFinite(Date.parse(row.updated_at))
    || (row.deleted_at!==null && (typeof row.deleted_at!=='string' || !Number.isFinite(Date.parse(row.deleted_at))))) throw new Error('Resposta de sincronização inválida.');
  const inspect=(value:any,depth=0):void=>{if(depth>20)throw new Error('Resposta de sincronização inválida.');if(value && typeof value==='object')for(const key of Object.keys(value)){if(['__proto__','constructor','prototype'].includes(key))throw new Error('Resposta de sincronização inválida.');inspect(value[key],depth+1);}};
  if(JSON.stringify(row.payload).length>256*1024)throw new Error('Resposta de sincronização inválida.');inspect(row.payload);
}
