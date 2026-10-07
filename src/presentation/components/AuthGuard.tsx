import type { PropsWithChildren } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export function AuthGuard({ children }: PropsWithChildren) {
  const { loading, session, profile } = useAuth();
  const { palette } = useAppTheme();
  if (loading) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: palette.background }}><ActivityIndicator color={palette.accent} /></View>;
  if (!session || !profile?.username || profile.account_status !== "active") return <Redirect href="/" />;
  return children;
}
