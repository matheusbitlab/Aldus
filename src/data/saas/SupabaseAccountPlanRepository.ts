import { supabase } from '@/src/data/remote/supabase';
import { libraryAccountScope } from '@/src/data/library/LibraryAccountScope';
import { throwIfAborted, withAbort } from '@/src/core/utils/cancellation';
import { AccountPlanResolution, parseAccountPlan } from '@/src/domain/saas/accountPlan';

/** Shared Web/Android consumption contract. No persistent entitlement cache, no setters.
 * Backend unavailable => unknown permission, never fabricated Pro/Free quotas.
 * The existing Sync engine remains independent and preserves its durable outbox. */
export class SupabaseAccountPlanRepository {
  async read(signal: AbortSignal): Promise<AccountPlanResolution> {
    const account = libraryAccountScope.capture();
    throwIfAborted(signal);
    if (!supabase || !account.userId) return { source: 'unavailable', snapshot: null };
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 30000);
    try {
      const { data, error } = await withAbort(supabase.auth.getSession(), controller.signal);
      account.check();
      if (error || data.session?.user.id !== account.userId) throw new Error('Sessão de plano indisponível.');
      const response = await withAbort(fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/saas_account_snapshot`, {
        method: 'POST', signal: controller.signal,
        headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!, Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      }), controller.signal);
      account.check();
      if (!response.ok) return { source: 'unavailable', snapshot: null };
      const snapshot = parseAccountPlan(await withAbort(response.json(), controller.signal), account.userId);
      account.check();
      return { source: 'server_database', snapshot };
    } catch {
      throwIfAborted(signal);
      account.check();
      return { source: 'unavailable', snapshot: null };
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }
  }
}
