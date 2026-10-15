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
