import { AccountPlanSnapshot, CatalogPlan } from './accountPlan';
import { QuotaSnapshot } from './quota';

export const featureLabels: Record<string, string> = {
  local_reading: 'Leitura EPUB/PDF', book_import: 'Importação local de livros', library_sync: 'Biblioteca sincronizada',
  progress_sync: 'Progresso de leitura sincronizado', study_sync: 'Notas e grifos sincronizados',
  organization_sync: 'Organização sincronizada', private_storage: 'Armazenamento privado na nuvem', basic_study: 'Ferramentas básicas de estudo',
};
export function formatBytes(value: number | null, allowFraction = false): string {
  if (value === null || !Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER || (!allowFraction && !Number.isSafeInteger(value)) || value < 0) return 'Em verificação';
  const units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB']; let size = value, unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  if (unit === 0 && size > 0 && size < .01) return 'Menos de 0,01 byte';
  return `${size.toLocaleString('pt-BR', { maximumFractionDigits: unit || allowFraction ? 2 : 0 })} ${unit === 0 && size === 1 ? 'byte' : units[unit]}`;
}
export const progressPercent = (used: number | null, limit: number): number | null =>
  used === null || !Number.isFinite(used) || used < 0 || !Number.isFinite(limit) || limit <= 0 ? null : Math.min(100, Math.max(0, used / limit * 100));
export function catalogPrice(plan: CatalogPlan): string {
  return plan.priceBrlCentavos === null ? 'Preço ainda não disponível' :
    (plan.priceBrlCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function subscriptionLabel(plan: AccountPlanSnapshot, now = Date.now()): string {
  if (plan.subscription.status === 'revoked') return 'Revogada';
  if (plan.subscription.status === 'expired' || (plan.subscription.endsAt && Date.parse(plan.subscription.endsAt) <= now)) return 'Expirada';
  return plan.subscription.status === 'trialing' ? 'Em avaliação concedida' : 'Ativa';
}
export function assertPlanUsage(plan: AccountPlanSnapshot, quota: QuotaSnapshot, now = Date.now()) {
  if (plan.userId !== quota.userId || plan.effectivePlan !== quota.effectivePlan
    || plan.limits.syncedBooks <= 0 || plan.limits.storageBytes <= 0
    || plan.limits.syncedBooks !== quota.limits.syncedBooks || plan.limits.storageBytes !== quota.limits.storageBytes
    || (plan.effectivePlan !== 'free' && (plan.subscription.planId !== plan.effectivePlan
      || !['active', 'trialing'].includes(plan.subscription.status) || Date.parse(plan.subscription.startsAt) > now
      || (plan.subscription.endsAt !== null && Date.parse(plan.subscription.endsAt) <= now)))) throw new Error('Plano e franquia precisam ser atualizados.');
}
