import { featureLabels } from '@/src/domain/saas/planPresentation';

/** Presentation only. Never translate IDs, persisted values or authorization decisions. */
export const numberLabel = (value: number) => value.toLocaleString('pt-BR');
export function planLabel(id: string, name?: string): string {
  return id === 'free' && (!name || name.toLowerCase() === 'free') ? 'Gratuito' : id === 'pro' && (!name || name.toLowerCase() === 'pro') ? 'Pro' : name || 'Plano adicional';
}
const terms: Record<string, string> = {
  OWNER: 'Proprietário', ADMIN: 'Administrador', active: 'Ativa', disabled: 'Desativada',
  trialing: 'Em avaliação concedida', expired: 'Expirada', revoked: 'Revogada',
  success: 'Concluída', denied: 'Negada', trusted_backend: 'Administração do Aldus',
  server_default: 'Atribuição automática', server_database: 'Servidor verificado',
  account_status: 'Situação da conta', benefit: 'Benefício Pro', entitlement: 'Permissão adicional',
  member: 'Associação administrativa', plan: 'Catálogo de planos', plan_proposal: 'Proposta de plano',
  setting: 'Configuração', setting_rollback: 'Restauração de configuração', bootstrap: 'Provisionamento inicial',
  'users.read': 'Consultar usuários', 'users.write': 'Gerenciar contas',
  'subscriptions.manage': 'Gerenciar benefícios e assinaturas', 'metrics.read': 'Consultar métricas',
  'audit.read': 'Consultar auditoria',
  'app.notice': 'Aviso do aplicativo', 'premium_future': 'Permissão premium futura',
  'app.public_name': 'Nome público do aplicativo', 'app.institutional_url': 'Endereço institucional',
  'app.policy_notice': 'Aviso de políticas', 'operation.maintenance_notice': 'Aviso de manutenção',
  'operation.supported_version': 'Versão compatível', 'features.community_enabled': 'Disponibilidade da comunidade',
  'features.battle_enabled': 'Disponibilidade das batalhas', 'features.premium_enabled': 'Recursos premium',
  'features.experimental_enabled': 'Recursos experimentais',
};
export function termLabel(value: string | null | undefined): string {
  if (!value) return 'Indisponível';
  return terms[value] || featureLabels[value] || 'Recurso adicional';
}
export function dayLabel(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Data indisponível';
}
export function dateInputToIsoDay(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
export function dateTimeInputFromIso(value:string):string {
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 const pad=(n:number)=>String(n).padStart(2,'0');
 return `${dayLabel(value)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
export function dateTimeInputToIso(value:string):string|null {
 const parts=/^(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2})$/.exec(value);
 if(!parts||Number(parts[2])>23||Number(parts[3])>59)return null;
 const day=dateInputToIsoDay(parts[1]);return day?`${day}T${parts[2]}:${parts[3]}:00.000Z`:null;
}
