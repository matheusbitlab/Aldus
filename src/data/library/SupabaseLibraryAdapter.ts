import { supabase } from '@/src/data/remote/supabase';
import { LibraryRemoteAdapter, LibrarySyncEntry, RemoteLibraryRow, validateRemoteRow } from '@/src/domain/types/librarySync';
import { throwIfAborted, withAbort } from '@/src/core/utils/cancellation';

export class LibraryRemoteError extends Error {
  constructor(readonly code: 'contract'|'authorization'|'session'|'network', message: string) { super(message); }
}

/** Freeze the JWT per request: an account switch cannot send A's mutation as B. */
export class SupabaseLibraryAdapter implements LibraryRemoteAdapter {
  private async headers(owner: string, signal: AbortSignal): Promise<Record<string,string>> {
    throwIfAborted(signal);
    if(!supabase)throw new Error('Sincronização não configurada.');
    const {data,error}=await withAbort(supabase.auth.getSession(),signal);
    throwIfAborted(signal);
    if(error||data.session?.user.id!==owner)throw new Error('Sessão indisponível para sincronização.');
    return {apikey:process.env.EXPO_PUBLIC_SUPABASE_KEY!,Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'};
  }
  private async request(url: string, headers: Record<string,string>, signal: AbortSignal, body?: object): Promise<any> {
    const controller=new AbortController(), abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(abort,30000);if(signal.aborted)abort();
    try {
      throwIfAborted(controller.signal);
      const response=await withAbort(fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${url}`,{headers,signal:controller.signal,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})}),controller.signal);
      if(!response.ok) {
        let code: unknown;
        try { code=(await withAbort(response.json(),controller.signal))?.code; } catch { throwIfAborted(controller.signal); }
        if(response.status===404 || code==='PGRST205' || code==='PGRST202')throw new LibraryRemoteError('contract','A sincronização da biblioteca ainda não está disponível no servidor.');
        if(response.status===403 || code==='42501')throw new LibraryRemoteError('authorization','O servidor negou acesso à sincronização. As permissões da conta precisam ser verificadas.');
        if(response.status===401)throw new LibraryRemoteError('session','Entre novamente para sincronizar.');
        throw new LibraryRemoteError('network','Não foi possível sincronizar a biblioteca. Tente novamente.');
      }
      return await withAbort(response.json(),controller.signal);
    } catch(error) {
      throwIfAborted(signal);
      if(error instanceof LibraryRemoteError)throw error;
      throw new LibraryRemoteError('network',controller.signal.aborted?'O servidor não respondeu no prazo. A fila foi preservada; tente novamente.':'Não foi possível acessar o servidor de sincronização. A fila foi preservada.');
    } finally {clearTimeout(timeout);signal.removeEventListener('abort',abort);}
  }
  async pull(owner: string, signal: AbortSignal): Promise<RemoteLibraryRow[]> {
    const headers=await this.headers(owner,signal), rows:RemoteLibraryRow[]=[];let cursor=0;
    for(let page=0;page<100;page++) {
      const next:RemoteLibraryRow[]=await this.request(`user_library_items?user_id=eq.${encodeURIComponent(owner)}&revision=gt.${cursor}&order=revision.asc&limit=500`,headers,signal);
      if(!Array.isArray(next))throw new Error('Resposta de sincronização inválida.');
      for(const row of next){validateRemoteRow(row,owner);if(row.revision<=cursor)throw new Error('Ordem remota inválida.');cursor=row.revision;rows.push(row);}
      if(next.length<500)return rows;
    }
    throw new Error('A biblioteca excedeu o limite de metadados desta sincronização.');
  }
  async apply(owner: string, entry: LibrarySyncEntry, signal: AbortSignal) {
    const headers=await this.headers(owner,signal);
    const result=await this.request('rpc/library_apply',headers,signal,{p_operation_id:entry.operationId,p_book_id:entry.bookId,p_kind:entry.kind,p_entity_id:entry.id,p_expected_revision:entry.baseRevision,p_payload:entry.payload,p_deleted:entry.deleted});
    if(typeof result?.accepted!=='boolean')throw new Error('Resposta de sincronização inválida.');
    validateRemoteRow(result.row,owner);return result as {accepted:boolean;row:RemoteLibraryRow};
  }
}
