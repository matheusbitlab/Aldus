import { useEffect, type PropsWithChildren } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { authDiagnostic, correlatedAuthDiagnostic } from "@/src/utils/authDiagnostics";

export function AuthGuard({ children }: PropsWithChildren) {
  const { loading, session, profile } = useAuth();
  const { palette } = useAppTheme();
  useEffect(() => {
    const appReady = !loading && !!session && profile?.id === session.user.id && !!profile?.username && profile.account_status === "active";
    authDiagnostic("AUTH_GUARD_DECISION", { operationId: correlatedAuthDiagnostic(session?.user.id), correlation: "candidate", guard: "route", decision: appReady ? "allowed" : "blocked",
      uuid: session?.user.id, session: !!session, profile: !!profile, username: !!profile?.username, accountStatus: profile?.account_status, loading, appReady });
  }, [loading, session, profile]);
  if (loading) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: palette.background }}><ActivityIndicator color={palette.accent} /></View>;
  if (!session || profile?.id !== session.user.id || !profile?.username || profile.account_status !== "active") return <Redirect href="/" />;
  return children;
}
