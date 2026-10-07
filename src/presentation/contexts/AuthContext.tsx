import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccountProfile, canUseFeature, FeatureKey, FeatureOverrides } from "@/src/domain/auth/authRules";
import { supabase } from "@/src/data/remote/supabase";

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
    const run = ++revision.current;
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
    try {
      const [profileResult, overrideResult] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,role,account_status").eq("id", next.user.id).single(),
        supabase.from("user_feature_overrides").select("feature_key,enabled").eq("user_id", next.user.id),
      ]);
      if (profileResult.error || !profileResult.data || overrideResult.error) throw new Error("Perfil indisponível.");
      const found = profileResult.data as AccountProfile;
      const features: FeatureOverrides = {};
      for (const row of overrideResult.data ?? []) if (row.feature_key === "flashcards") features.flashcards = row.enabled;
      if (run !== revision.current) return;
      setProfile(found); setOverrides(features); setError(null);
      await AsyncStorage.setItem(cacheKey(next.user.id), JSON.stringify({ profile: found, overrides: features }));
    } catch {
      const cached = await AsyncStorage.getItem(cacheKey(next.user.id)).catch(() => null);
      if (run !== revision.current) return;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { profile: AccountProfile; overrides: FeatureOverrides };
          if (parsed.profile.id === next.user.id) {
            setProfile(parsed.profile); setOverrides(parsed.overrides); setError(null); return;
          }
        } catch { /* corrupt cache is ignored */ }
      }
      setProfile(null); setOverrides({}); setError("Não foi possível carregar o perfil. Verifique a conexão e a configuração da conta.");
    } finally {
      if (run === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setError("Supabase não configurado."); setLoading(false); return; }
    let alive = true;
    const client = supabase;
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      if (alive) setTimeout(() => { if (alive) void resolve(next); }, 0);
    });
    void client.auth.getSession().then(({ data }) => { if (alive) void resolve(data.session); })
      .catch(() => { if (alive) { setError("Não foi possível recuperar a sessão."); setLoading(false); } });
    return () => { alive = false; revision.current++; listener.subscription.unsubscribe(); };
  }, [resolve]);

  const refreshProfile = useCallback(async () => { if (session) await resolve(session); }, [resolve, session]);
  const signOut = useCallback(async () => {
    if (!supabase) return;
    const formerUserId = session?.user.id;
    const result = await supabase.auth.signOut();
    if (result.error) {
      const localResult = await supabase.auth.signOut({ scope: "local" });
      if (localResult.error) throw new Error("Não foi possível sair. Tente novamente.");
    }
    if (formerUserId) await AsyncStorage.removeItem(cacheKey(formerUserId)).catch(() => undefined);
    await resolve(null);
  }, [resolve, session?.user.id]);
  const canUse = useCallback((feature: FeatureKey) => canUseFeature(profile, overrides, feature), [profile, overrides]);
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
