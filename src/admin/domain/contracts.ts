export const ADMIN_PERMISSIONS = ['users.read','users.write','subscriptions.manage','metrics.read','audit.read'] as const;
export type AdminPermission = typeof ADMIN_PERMISSIONS[number];
export type AdminSection = 'overview'|'users'|'subscriptions'|'plans'|'storage'|'metrics'|'settings'|'members'|'audit'|'health';
export interface AdminSession { version:1; userId:string; role:'OWNER'|'ADMIN'; permissions:AdminPermission[]; recentMfa:boolean; source:'server_database' }
export interface AdminUsage { books:number; storageBytes:number|null; objects:number; unknownSizeObjects:number }
export interface AdminMetrics {
 registeredUsers:number; newUsers:number; recentSignIns:number; activeUsers:null;
 freeAccounts:number; proAccounts:number; activeSubscriptions:number; expiredSubscriptions:number;
 manualProGrants:number; syncOperations:number; syncFailures:null; authFailures:null; processingFailures:null; freeToProConversion:null;
 averageStorageBytes:number|null; usage:AdminUsage;
 payments:{status:'not_integrated';mrr:null;arr:null;totalRevenue:null;cancellations:null;churn:null;transactions:null;events:null;refunds:null};
 health:Record<string,string>;registrationsByDay:{day:string;count:number}[];from:string;until:string;observedAt:string;
}
export interface AdminUserRow { id:string;display_name:string;username:string|null;email:string;account_status:'active'|'disabled';created_at:string;last_sign_in_at:string|null;effective_plan:string;revision:number }
export interface AdminUserDetail {
 account:{id:string;displayName:string;username:string|null;email:string;emailVerified:boolean;status:'active'|'disabled';createdAt:string;lastSignInAt:string|null};
 subscription:{plan_id:string;status:string;ends_at:string|null;grant_source:string}|null;
 effectivePlan:{id:string;name:string;synced_books:number;storage_bytes:number};
 entitlements:{feature:string;enabled:boolean;endsAt:string|null}[];features:Record<string,boolean>;usage:AdminUsage;revision:number;
 sync:{receipts:number;lastAcceptedAt:string|null;failures:null};history:AdminAudit[];
}
export interface AdminPlan {id:string;name:string;commercial_description:string;price_brl_centavos:number|null;annual_brl_centavos:number|null;synced_books:number;storage_bytes:number;available:boolean;features:Record<string,boolean>;revision:number}
export interface PriceHistory {id:number;plan_id:string;monthly_brl_centavos:number|null;annual_brl_centavos:number|null;effective_from:string;charged_price_source:'not_integrated'}
export interface AdminSetting {key:string;value:string|boolean;requires_deploy:boolean;revision:number;updated_at:string}
export interface AdminMember {user_id:string;role:'OWNER'|'ADMIN';permissions:AdminPermission[];active:boolean;revision:number}
export interface AdminAudit {id?:number;actor:string|null;resource?:string;action:string;occurred_at:string;outcome:'success'|'denied';reason:string|null;changes?:Record<string,unknown>}
export interface AdminResults {
 overview:AdminMetrics;subscriptions:AdminMetrics;storage:AdminMetrics;metrics:AdminMetrics;health:AdminMetrics;
 users:{rows:AdminUserRow[];page:number;pageSize:number};user:AdminUserDetail|null;
 plans:{rows:AdminPlan[];priceHistory:PriceHistory[];proposals:{id:string;proposal:{id:string;name:string;description:string};status:'proposed'}[];chargedPriceSource:'not_integrated'};
 settings:{rows:AdminSetting[];history:{id:number;key:string;value:string|boolean;revision:number;created_at:string}[]};
 members:{rows:AdminMember[]};audit:{rows:AdminAudit[];page:number};
}
export type AdminFilters = {page?:number;search?:string;plan?:string;status?:string;from?:string;until?:string;id?:string};
export type AdminCommand =
 | {action:'account_status';payload:{status:'active'|'disabled'}}
 | {action:'benefit';payload:{mode:'grant'|'revoke';endsAt?:string}}
 | {action:'entitlement';payload:{feature:string;enabled:boolean;endsAt:string}}
 | {action:'member';payload:{role:'OWNER'|'ADMIN';active:boolean;permissions:AdminPermission[]}}
 | {action:'plan';payload:{name:string;description:string;books:number;storageBytes:number;monthlyCentavos:number|null;annualCentavos:number|null;available:boolean;features:Record<string,boolean>}}
 | {action:'plan_proposal';payload:{name:string;description:string}}
 | {action:'setting';payload:{value:string|boolean}}
 | {action:'setting_rollback';payload:{revision:number}};
export type AdminChangeResult = {ok:true;revision:number}|{ok:false;code:'conflict'|'forbidden_or_mfa'|'invalid'|'rate_limit'};
export const SECTION_PERMISSION:Record<AdminSection,AdminPermission|'owner'>={overview:'metrics.read',users:'users.read',subscriptions:'metrics.read',plans:'owner',storage:'metrics.read',metrics:'metrics.read',settings:'owner',members:'owner',audit:'audit.read',health:'metrics.read'};
export function canAdmin(session:AdminSession|null,permission:AdminPermission|'owner'):boolean {
 return !!session && (session.role==='OWNER'||(permission!=='owner'&&session.permissions.includes(permission)));
}
export function parseAdminSession(value:unknown,owner:string):AdminSession {
 const s=value as Partial<AdminSession>|null;
 if(!s||s.version!==1||s.userId!==owner||s.source!=='server_database'||!['OWNER','ADMIN'].includes(s.role??'')
  ||typeof s.recentMfa!=='boolean'||!Array.isArray(s.permissions)||s.permissions.some(p=>!ADMIN_PERMISSIONS.includes(p)))throw new Error('Contrato administrativo inválido.');
 return s as AdminSession;
}
