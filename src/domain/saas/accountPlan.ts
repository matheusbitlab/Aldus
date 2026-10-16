import type { QuotaSnapshot } from './quota';
/** Server-owned quotas. No local catalog, subscription writes or JWT plan claims. */
export const BASE_FEATURES = [
  'local_reading', 'book_import', 'library_sync', 'progress_sync',
  'study_sync', 'organization_sync', 'private_storage', 'basic_study',
] as const;
export type SubscriptionStatus = 'active' | 'trialing' | 'expired' | 'revoked';
export interface AccountPlanSnapshot {
  version: 1;
  userId: string;
  source: 'server_database';
  effectivePlan: string;
  plan: { id: string; name: string; priceBrlCentavos: number | null };
  limits: { syncedBooks: number; storageBytes: number };
  usage: { syncedBooks: number; storageBytes: number | null };
  remaining: { syncedBooks: number; storageBytes: number | null };
  features: Record<string, boolean>;
  subscription: {
    planId: string; status: SubscriptionStatus; startsAt: string;
    endsAt: string | null; grantSource: 'server_default' | 'trusted_backend';
  };
}
export type AccountPlanResolution =
  | { source: 'server_database'; snapshot: AccountPlanSnapshot }
  | { source: 'unavailable'; snapshot: null };

/** Read-only projection of the existing server catalog, shared with Aldus Admin. */
export interface CatalogPlan {
  id: string; name: string; priceBrlCentavos: number | null; annualBrlCentavos: number | null;
  limits: AccountPlanSnapshot['limits']; features: AccountPlanSnapshot['features'];
}
export type PlanFailure = 'session' | 'authorization' | 'unavailable' | 'network' | 'contract';
export class PlanReadError extends Error { constructor(readonly code: PlanFailure) { super(code); } }
export interface AccountPlanView { account: AccountPlanSnapshot; quota: QuotaSnapshot; }
export function parsePlanCatalog(rows: unknown, featureRows: unknown): CatalogPlan[] {
  if (!Array.isArray(rows) || !Array.isArray(featureRows) || !rows.length) throw new Error('Catálogo indisponível.');
  if (rows.some(row => !record(row) || typeof row.available !== 'boolean') || rows.length >= 100 || featureRows.length >= 10000) throw new Error('Catálogo incompleto.');
  const ids = new Set<string>();
  const plans = rows.filter(row => record(row) && row.available === true).map(row => {
    if (!record(row) || typeof row.id !== 'string' || !/^[a-z][a-z0-9_]{1,63}$/.test(row.id)
      || ids.has(row.id) || typeof row.name !== 'string' || !row.name.trim()
      || !(row.price_brl_centavos === null || count(row.price_brl_centavos))
      || !(row.annual_brl_centavos == null || count(row.annual_brl_centavos))
      || !count(row.synced_books) || !count(row.storage_bytes) || !row.synced_books || !row.storage_bytes
      || (row.id === 'free' && row.price_brl_centavos !== 0)) throw new Error('Catálogo inválido.');
    ids.add(row.id);
    const features: Record<string, boolean> = {};
    for (const item of featureRows) {
      if (!record(item) || typeof item.plan_id !== 'string' || typeof item.feature !== 'string'
        || !/^[a-z][a-z0-9_]{1,63}$/.test(item.feature) || ['__proto__', 'constructor', 'prototype'].includes(item.feature)
        || typeof item.enabled !== 'boolean') throw new Error('Recursos inválidos.');
      if (item.plan_id === row.id) {
        if (Object.prototype.hasOwnProperty.call(features, item.feature)) throw new Error('Recurso duplicado.');
        features[item.feature] = item.enabled;
      }
    }
    if (BASE_FEATURES.some(feature => features[feature] !== true)) throw new Error('Recursos essenciais indisponíveis.');
    return { id: row.id, name: row.name, priceBrlCentavos: row.price_brl_centavos, annualBrlCentavos: row.annual_brl_centavos ?? null,
      limits: { syncedBooks: row.synced_books, storageBytes: row.storage_bytes }, features } as CatalogPlan;
  });
  if (!plans.length) throw new Error('Catálogo indisponível.');
  return plans.sort((a, b) => a.id === 'free' ? -1 : b.id === 'free' ? 1 : a.limits.syncedBooks - b.limits.syncedBooks);
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Shape/identity validation only; authority comes from authenticated server transport.
 * Never call this on AsyncStorage/cache/imported JSON to establish permissions. */
export function parseAccountPlan(value: unknown, owner: string): AccountPlanSnapshot {
  if (!record(value) || value.version !== 1 || value.userId !== owner || value.source !== 'server_database'
    || typeof value.effectivePlan !== 'string' || !record(value.plan) || value.plan.id !== value.effectivePlan
    || typeof value.plan.name !== 'string' || !(value.plan.priceBrlCentavos === null || count(value.plan.priceBrlCentavos))
    || !record(value.limits) || !count(value.limits.syncedBooks) || !count(value.limits.storageBytes)
    || !record(value.usage) || !count(value.usage.syncedBooks) || !(value.usage.storageBytes === null || count(value.usage.storageBytes))
    || !record(value.remaining) || !count(value.remaining.syncedBooks) || !(value.remaining.storageBytes === null || count(value.remaining.storageBytes))
    || !record(value.features) || Object.values(value.features).some(item => typeof item !== 'boolean')
    || BASE_FEATURES.some(feature => value.features && (value.features as Record<string, unknown>)[feature] !== true)
    || !record(value.subscription) || typeof value.subscription.planId !== 'string'
    || !['active', 'trialing', 'expired', 'revoked'].includes(String(value.subscription.status))
    || !date(value.subscription.startsAt) || !(value.subscription.endsAt === null || date(value.subscription.endsAt))
    || !['server_default', 'trusted_backend'].includes(String(value.subscription.grantSource))) {
    throw new Error('Contrato de plano inválido.');
  }
  if (value.remaining.syncedBooks !== Math.max(0, value.limits.syncedBooks - value.usage.syncedBooks)
    || value.remaining.storageBytes !== (value.usage.storageBytes === null ? null : Math.max(0, value.limits.storageBytes - value.usage.storageBytes))) {
    throw new Error('Franquia remanescente inválida.');
  }
  return value as unknown as AccountPlanSnapshot;
}

/** Advisory UI only. Every remote mutation is independently authorized by PostgreSQL.
 * Local reading/import are never gated by a SaaS lookup or quota. Existing Auth applies. */
export function resolvePlanFeature(plan: AccountPlanResolution, feature: string): boolean {
  if (feature === 'local_reading' || feature === 'book_import' || feature === 'basic_study') return true;
  return plan.source === 'server_database' && plan.snapshot.features[feature] === true;
}
