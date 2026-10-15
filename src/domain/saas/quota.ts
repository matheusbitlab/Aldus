/** Advisory client snapshot; PostgreSQL repeats every capacity decision. */
export interface QuotaSnapshot {
  version: 1; userId: string; source: 'server_database'; effectivePlan: string;
  limits: { syncedBooks: number; storageBytes: number };
  usage: { syncedBooks: number; storageBytes: number | null; reservedBytes: number; reservedUploads: number; objects: number };
  remaining: { syncedBooks: number; storageBytes: number | null }; overLimit: boolean;
}
export interface QuotaBlock { signature: string; message: string }
export class QuotaError extends Error {
  readonly code = 'quota';
  constructor(readonly resource: 'books' | 'storage') {
    super(resource === 'books' ? 'Franquia de livros sincronizados atingida. Livros locais e alterações de livros existentes foram preservados.'
      : 'Franquia de armazenamento atingida ou uso ainda não reconciliado. Leitura, downloads e dados de livros existentes continuam disponíveis.');
  }
}
export const isQuotaError = (error: unknown): error is Error & { code: 'quota' } => error instanceof Error && (error as { code?: string }).code === 'quota';
export function parseQuota(value: any, owner: string): QuotaSnapshot {
  const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
  if (!value || value.version !== 1 || value.userId !== owner || value.source !== 'server_database'
    || typeof value.effectivePlan !== 'string' || !value.limits || !value.usage || !value.remaining
    || ![value.limits.syncedBooks,value.limits.storageBytes,value.usage.syncedBooks,value.usage.reservedBytes,value.usage.reservedUploads,value.usage.objects,value.remaining.syncedBooks].every(count)
    || !(value.usage.storageBytes === null || count(value.usage.storageBytes))
    || value.remaining.syncedBooks !== Math.max(0,value.limits.syncedBooks-value.usage.syncedBooks)
    || value.remaining.storageBytes !== (value.usage.storageBytes === null ? null : Math.max(0,value.limits.storageBytes-value.usage.storageBytes-value.usage.reservedBytes))
    || value.overLimit !== (value.usage.syncedBooks>value.limits.syncedBooks || (value.usage.storageBytes!==null && value.usage.storageBytes+value.usage.reservedBytes>value.limits.storageBytes))) throw new Error('Contrato de cotas inválido.');
  return value;
}
export const quotaSignature = (quota: QuotaSnapshot) => JSON.stringify([quota.limits,quota.usage]);
