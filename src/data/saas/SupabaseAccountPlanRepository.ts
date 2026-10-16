import { supabase } from '@/src/data/remote/supabase';
import { libraryAccountScope } from '@/src/data/library/LibraryAccountScope';
import { SupabaseLibraryAdapter } from '@/src/data/library/SupabaseLibraryAdapter';
import { throwIfAborted, withAbort } from '@/src/core/utils/cancellation';
import { AccountPlanResolution, AccountPlanView, CatalogPlan, parseAccountPlan, parsePlanCatalog, PlanReadError } from '@/src/domain/saas/accountPlan';
import { assertPlanUsage } from '@/src/domain/saas/planPresentation';

/** Authenticated reads only. No persisted entitlement cache or subscription setters. */
export class SupabaseAccountPlanRepository {
  private async request(resource: string, signal: AbortSignal, post = false): Promise<unknown> {
    const account = libraryAccountScope.capture(); throwIfAborted(signal);
    if (!supabase || !account.userId) throw new PlanReadError('unavailable');
    const controller = new AbortController(), abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 30000);
    try {
      const { data, error } = await withAbort(supabase.auth.getSession(), controller.signal); account.check();
      if (error || data.session?.user.id !== account.userId) throw new PlanReadError('session');
      const response = await withAbort(fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${resource}`, {
        method: post ? 'POST' : 'GET', signal: controller.signal,
        headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!, Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
        ...(post ? { body: '{}' } : {}),
      }), controller.signal); account.check();
      if (!response.ok) throw new PlanReadError(response.status === 401 ? 'session' : response.status === 403 ? 'authorization' : 'unavailable');
      const result = await withAbort(response.json(), controller.signal); account.check(); return result;
    } catch (error) {
      throwIfAborted(signal); account.check();
      throw error instanceof PlanReadError ? error : new PlanReadError('network');
    } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
  }
  private async snapshot(signal: AbortSignal) {
    const run = libraryAccountScope.capture(), value = await this.request('rpc/saas_account_snapshot', signal, true); run.check();
    try { return parseAccountPlan(value, run.userId!); } catch { throw new PlanReadError('contract'); }
  }
  async read(signal: AbortSignal): Promise<AccountPlanResolution> {
    const run = libraryAccountScope.capture();
    try { return { source: 'server_database', snapshot: await this.snapshot(signal) }; }
    catch { throwIfAborted(signal); run.check(); return { source: 'unavailable', snapshot: null }; }
  }
  async readCatalog(signal: AbortSignal): Promise<CatalogPlan[]> {
    const [plans, features] = await Promise.all([
      this.request('saas_plans?select=*&available=eq.true&order=id.asc&limit=100', signal),
      this.request('saas_plan_features?select=plan_id,feature,enabled&limit=10000', signal),
    ]);
    try { return parsePlanCatalog(plans, features); } catch { throw new PlanReadError('contract'); }
  }
  async readExperience(signal: AbortSignal): Promise<AccountPlanView> {
    const run = libraryAccountScope.capture();
    try {
      const [account, quota] = await Promise.all([
        this.snapshot(signal), new SupabaseLibraryAdapter().quota(run.userId!, signal),
      ]); run.check(); throwIfAborted(signal);
      try { assertPlanUsage(account, quota); } catch { throw new PlanReadError('contract'); }
      return { account, quota };
    } catch (error) {
      throwIfAborted(signal); run.check();
      if (error instanceof PlanReadError) throw error;
      const code = (error as { code?: string })?.code;
      throw new PlanReadError(code === 'session' || code === 'authorization' || code === 'network' ? code : 'contract');
    }
  }
}
