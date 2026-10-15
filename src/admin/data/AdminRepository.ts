import { supabase } from '@/src/data/remote/supabase';
import { libraryAccountScope } from '@/src/data/library/LibraryAccountScope';
import { throwIfAborted,withAbort } from '@/src/core/utils/cancellation';
import { AdminChangeResult,AdminCommand,AdminFilters,AdminResults,parseAdminSession } from '../domain/contracts';

export class AdminError extends Error {
 constructor(readonly code:'denied'|'unavailable'|'invalid',message:string){super(message);}
}
/** No role/email decisions, persistent permissions cache, service key or cross-user token.
 * Identity/JWT frozen per request; every RPC independently checks current server grants. */
export class AdminRepository {
 async appNotice(signal:AbortSignal):Promise<string>{const value=await this.rpc('aldus_app_notice',{},signal);return typeof value==='string'?value:'';}
 private async rpc(name:string,args:object,signal:AbortSignal):Promise<unknown>{
  const run=libraryAccountScope.capture();throwIfAborted(signal);
  if(!supabase||!run.userId)throw new AdminError('unavailable','Administração indisponível.');
  const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
  const timeout=setTimeout(abort,30000);
  try{
   const {data,error}=await withAbort(supabase.auth.getSession(),controller.signal);run.check();
   if(error||data.session?.user.id!==run.userId)throw new AdminError('denied','Acesso administrativo negado.');
   const response=await withAbort(fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`,{
    method:'POST',headers:{apikey:process.env.EXPO_PUBLIC_SUPABASE_KEY!,Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},
    body:JSON.stringify(args),signal:controller.signal,
   }),controller.signal);run.check();
   if(!response.ok)throw new AdminError(response.status===401||response.status===403?'denied':'unavailable',response.status===401||response.status===403?'Acesso administrativo negado.':'Contrato administrativo indisponível no servidor.');
   const result:unknown=await withAbort(response.json(),controller.signal);run.check();return result;
  }catch(error){throwIfAborted(signal);run.check();if(error instanceof AdminError)throw error;throw new AdminError('unavailable','Não foi possível consultar a administração.');}
  finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}
 }
 async session(signal:AbortSignal){const owner=libraryAccountScope.userId;return parseAdminSession(await this.rpc('aldus_admin_session',{},signal),owner??'');}
 async read<K extends keyof AdminResults>(section:K,filters:AdminFilters,signal:AbortSignal):Promise<AdminResults[K]>{
  const result=await this.rpc('aldus_admin_read',{p_section:section,p_filters:filters},signal) as {version?:number;section?:string;source?:string;data?:unknown}|null;
  if(!result||result.version!==1||result.section!==section||result.source!=='server_database'||!('data' in result))throw new AdminError('invalid','Resposta administrativa inválida.');
  return result.data as AdminResults[K];
 }
 async change(requestId:string,target:string,revision:number,command:AdminCommand,reason:string,confirmation:string,signal:AbortSignal):Promise<AdminChangeResult>{
  const result=await this.rpc('aldus_admin_change',{p_request_id:requestId,p_action:command.action,p_target:target,p_expected_revision:revision,p_payload:command.payload,p_reason:reason,p_confirmation:confirmation},signal) as AdminChangeResult;
  if(!result||typeof result.ok!=='boolean'||(result.ok?!Number.isSafeInteger(result.revision):!['conflict','forbidden_or_mfa','invalid','rate_limit'].includes(result.code)))throw new AdminError('invalid','Resposta de alteração inválida.');
  return result;
 }
}
export const adminRepository=new AdminRepository();
