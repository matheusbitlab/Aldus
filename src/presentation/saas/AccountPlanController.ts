import { libraryAccountScope, LibraryAccountScope } from '@/src/data/library/LibraryAccountScope';
import { AccountPlanView, PlanFailure, PlanReadError } from '@/src/domain/saas/accountPlan';

export interface PlanViewState<T = AccountPlanView> { owner: string | null; generation: number; loading: boolean; data: T | null; error: PlanFailure | null; updatedAt: number | null; }
/** Memory-only view state. Never authorizes uploads or changes subscriptions. */
export class AccountPlanController<T = AccountPlanView> {
  private listeners = new Set<() => void>(); private ticket = 0; private pending: AbortController | null = null;
  state: PlanViewState<T> = { owner: null, generation: -1, loading: false, data: null, error: null, updatedAt: null };
  constructor(private load: (signal: AbortSignal) => Promise<T>, private scope: LibraryAccountScope = libraryAccountScope) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  snapshot = () => this.state;
  private emit(state: PlanViewState<T>) { this.state = state; for (const fn of this.listeners) fn(); }
  cancel = () => { this.ticket++; this.pending?.abort(); this.pending = null; this.emit({ owner: null, generation: -1, loading: false, data: null, error: null, updatedAt: null }); };
  unavailable = (error: PlanFailure) => {
    this.cancel(); this.emit({ ...this.state, owner: this.scope.userId, generation: this.scope.generation, error });
  };
  async refresh() {
    this.cancel(); const ticket = this.ticket, run = this.scope.capture(), controller = new AbortController(); this.pending = controller;
    if (!run.userId) return;
    this.emit({ owner: run.userId, generation: this.scope.generation, loading: true, data: null, error: null, updatedAt: null });
    try {
      const data = await this.load(controller.signal); run.check();
      if (controller.signal.aborted || ticket !== this.ticket) return;
      this.emit({ ...this.state, loading: false, data, updatedAt: Date.now() });
    } catch (error) {
      if (controller.signal.aborted || ticket !== this.ticket || this.scope.generation !== this.state.generation) return;
      this.emit({ ...this.state, loading: false, data: null, error: error instanceof PlanReadError ? error.code : 'unavailable' });
    }
  }
}
