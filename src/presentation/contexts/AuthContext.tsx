import AsyncStorage from "@react-native-async-storage/async-storage";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccountProfile, canUseFeature, FeatureKey, FeatureOverrides } from "@/src/domain/auth/authRules";
import { supabase } from "@/src/data/remote/supabase";
import { authFailureDetails } from "@/src/data/remote/authErrors";
import { authDiagnostic, correlatedAuthDiagnostic } from "@/src/utils/authDiagnostics";
import { nativeAuthCallbacks } from '@/src/data/remote/nativeAuthCallback';

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  overrides: FeatureOverrides;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  canUse: (feature: FeatureKey) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);
const cacheKey = (id: string) => `@kindle/auth-profile.v1:${id}`;

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [overrides, setOverrides] = useState<FeatureOverrides>({});
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const activeUserId = useRef<string | null>(null);

  const resolve = useCallback(async (next: Session | null) => {
    libraryAccountScope.set(next?.user.id ?? null);
    const run = ++revision.current;
    const operationId = correlatedAuthDiagnostic(next?.user.id);
    setSession(next);
    if (!next || !supabase) {
      activeUserId.current = null;
      setProfile(null); setOverrides({}); setError(supabase ? null : "Supabase não configurado."); setLoading(false);
      return;
    }
    if (activeUserId.current !== next.user.id) {
      activeUserId.current = next.user.id;
      setProfile(null); setOverrides({}); setLoading(true);
    }
    authDiagnostic("PROFILE_RESOLUTION", { operationId, correlation: "candidate", uuid: next.user.id, source: "remote", result: "started" });
    let stage: "profile" | "profile_cache_write" = "profile";
    try {
      const [profileResult, overrideResult] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,role,account_status").eq("id", next.user.id).single(),
        supabase.from("user_feature_overrides").select("feature_key,enabled").eq("user_id", next.user.id),
      ]);
      if (profileResult.error || !profileResult.data || overrideResult.error) {
        throw profileResult.error ?? overrideResult.error ?? new Error("Perfil indisponível.");
      }
      const found = profileResult.data as AccountProfile;
      if (found.id !== next.user.id) throw new Error("Perfil não corresponde à sessão.");
      const features: FeatureOverrides = {};
      for (const row of overrideResult.data ?? []) if (row.feature_key === "flashcards") features.flashcards = row.enabled;
      if (run !== revision.current) return;
      setProfile(found); setOverrides(features); setError(null);
      authDiagnostic("PROFILE_RESOLUTION", { operationId, correlation: "candidate", uuid: found.id, source: "remote", result: "success", username: !!found.username, accountStatus: found.account_status });
      stage = "profile_cache_write";
      await AsyncStorage.setItem(cacheKey(next.user.id), JSON.stringify({ profile: found, overrides: features, cachedAt: Date.now() }));
    } catch (failure) {
      authDiagnostic("PROFILE_RESOLUTION", { operationId, correlation: "candidate", uuid: next.user.id, source: stage === "profile" ? "remote" : "cache", result: "error", stage, ...authFailureDetails(failure) });
      authDiagnostic("PROFILE_RESOLUTION", { operationId, correlation: "candidate", uuid: next.user.id, source: "cache", result: "started" });
      const cached = await AsyncStorage.getItem(cacheKey(next.user.id)).catch(() => null);
      if (run !== revision.current) return;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { profile: AccountProfile; overrides: FeatureOverrides; cachedAt?: number };
          if (parsed.profile.id === next.user.id) {
            authDiagnostic("PROFILE_RESOLUTION", { operationId, correlation: "candidate", uuid: next.user.id, source: "cache", result: "success", username: !!parsed.profile.username, accountStatus: parsed.profile.account_status,
              cacheAgeMs: typeof parsed.cachedAt === "number" && parsed.cachedAt <= Date.now() ? Date.now() - parsed.cachedAt : null });
            setProfile(parsed.profile); setOverrides(parsed.overrides); setError(null); return;
          }
        } catch { /* corrupt cache is ignored */ }
      }
      authDiagnostic("PROFILE_RESOLUTION", { operationId, correlation: "candidate", uuid: next.user.id, source: "cache", result: "missing" });
      setProfile(null); setOverrides({}); setError("Não foi possível carregar o perfil. Verifique a conexão e a configuração da conta.");
    } finally {
      if (run === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setError("Supabase não configurado."); setLoading(false); return; }
    let alive = true;
    const client = supabase;
    let authEventRevision=0;
    const initialTicket=authEventRevision;
    const { data: listener } = client.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') nativeAuthCallbacks.reset();
      const ticket=++authEventRevision;
      revision.current++;
      libraryAccountScope.set(next?.user.id ?? null);
      if(alive && activeUserId.current!==(next?.user.id??null)) { setSession(next);setProfile(null);setOverrides({});setLoading(!!next); }
      authDiagnostic("AUTH_EVENT", { operationId: correlatedAuthDiagnostic(next?.user.id), correlation: "candidate", authEvent: event, uuid: next?.user.id, session: !!next });
      if (alive) setTimeout(() => { if (alive && ticket===authEventRevision) void resolve(next); }, 0);
    });
    void client.auth.getSession().then(({ data }) => { if (alive && initialTicket===authEventRevision) void resolve(data.session); })
      .catch(() => { if (alive && initialTicket===authEventRevision) { setError("Não foi possível recuperar a sessão."); setLoading(false); } });
    return () => { alive = false; revision.current++; listener.subscription.unsubscribe(); };
  }, [resolve]);

  const refreshProfile = useCallback(async () => { if (session && session.user.id===libraryAccountScope.userId) await resolve(session); }, [resolve, session]);
  const signOut = useCallback(async () => {
    if (!supabase) return;
    const formerUserId = session?.user.id;
    const result = await supabase.auth.signOut();
    if (result.error) {
      const localResult = await supabase.auth.signOut({ scope: "local" });
      if (localResult.error) throw new Error("Não foi possível sair. Tente novamente.");
    }
    if (formerUserId) await AsyncStorage.removeItem(cacheKey(formerUserId)).catch(() => undefined);
    if(libraryAccountScope.userId===null)await resolve(null);
  }, [resolve, session?.user.id]);
  const canUse = useCallback((feature: FeatureKey) => !!session && profile?.id === session.user.id
    && canUseFeature(profile, overrides, feature), [session, profile, overrides]);
  const value = useMemo<AuthState>(() => ({ loading, session, user: session?.user ?? null, profile, overrides, error, refreshProfile, signOut, canUse }), [loading, session, profile, overrides, error, refreshProfile, signOut, canUse]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("AuthProvider ausente.");
  return state;
}

export function useFeatureAccess(feature: FeatureKey) {
  const state = useAuth();
  return { loading: state.loading, allowed: state.canUse(feature) };
}
