import { createContext, useContext, useMemo, useRef, useState, useCallback, type PropsWithChildren } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { CallbackIdentityProvider, identityFromAccount } from "../adapters/identity";
import { createCommunityService } from "../adapters/runtime";
import type { CommunityService, CommunityView } from "../application/CommunityService";

interface CommunityContextValue {
  service: CommunityService | null; view: CommunityView | null;
  loading: boolean; error: string | null; refresh(): Promise<void>;
}
const Context = createContext<CommunityContextValue | null>(null);
export function CommunityProvider({ children }: PropsWithChildren) {
  const { user, profile } = useAuth();
  const identity = identityFromAccount(user?.id ?? null, profile);
  const identityRef = useRef(identity); identityRef.current = identity;
  const service = useMemo(() => identity?.userId ? createCommunityService(identity.userId, new CallbackIdentityProvider(() => identityRef.current)) : null, [identity?.userId]);
  const [result, setResult] = useState<{ service: CommunityService; view: CommunityView } | null>(null);
  const [error, setError] = useState<{ service: CommunityService | null; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const run = ++generation.current;
    setLoading(true); setError(null);
    if (!service) { setResult(null); setError({ service, message: "Entre na sua conta para abrir a comunidade." }); setLoading(false); return; }
    try {
      const view = await service.refresh();
      if (generation.current === run) setResult({ service, view });
    } catch (failure) {
      if (generation.current === run) setError({ service, message: failure instanceof Error ? failure.message : "Não foi possível carregar a comunidade." });
    } finally { if (generation.current === run) setLoading(false); }
  }, [service]);
  const value: CommunityContextValue = { service, view: result?.service === service ? result.view : null,
    error: error?.service === service ? error.message : null, loading, refresh };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCommunity() {
  const value = useContext(Context); if (!value) throw Error("CommunityProvider ausente."); return value;
}
export function useCommunityFocus() {
  const { refresh } = useCommunity();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
}
