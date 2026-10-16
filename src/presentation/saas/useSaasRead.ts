import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { addNetworkStateListener } from 'expo-network';
import { libraryAccountScope } from '@/src/data/library/LibraryAccountScope';
import { useAuth } from '@/src/presentation/contexts/AuthContext';
import { AccountPlanController } from './AccountPlanController';

export function useSaasRead<T>(load: (signal: AbortSignal) => Promise<T>) {
  const { user, profile } = useAuth();
  const controller = useMemo(() => new AccountPlanController(load), [load]);
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  const eligible = !!user && profile?.id === user.id && profile.account_status === 'active';
  const generation = libraryAccountScope.generation;
  const refresh = useCallback(() => eligible ? controller.refresh() : Promise.resolve(), [controller, eligible]);
  useFocusEffect(useCallback(() => {
    const revoke = libraryAccountScope.subscribe(controller.cancel);
    void refresh();
    const app = AppState.addEventListener('change', next => { if (next === 'active') void refresh(); else controller.cancel(); });
    const network = addNetworkStateListener(next => {
      if (next.isConnected === false || next.isInternetReachable === false) controller.unavailable('network');
      else if (next.isConnected) void refresh();
    });
    return () => { revoke(); app.remove(); network.remove(); controller.cancel(); };
  }, [controller, refresh, user?.id, generation]));
  const valid = eligible && state.owner === user?.id && state.generation === libraryAccountScope.generation;
  return { ...state, loading: state.loading || (eligible && state.owner === null && state.error === null), data: valid ? state.data : null, refresh, controller };
}
