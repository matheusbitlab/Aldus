import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export default function Index() {
  const { loading, session, profile, error, refreshProfile, signOut } = useAuth();
  const { palette } = useAppTheme();
  if (loading) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={palette.accent} /></View>;
  if (!session) return <Redirect href={"/auth/login" as never} />;
  if (error || !profile) return <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16, backgroundColor: palette.background }}><Text style={{ color: palette.text, fontSize: 20, fontWeight: "700" }}>Conta indisponível</Text><Text style={{ color: palette.secondaryText }}>{error ?? "Não foi possível carregar seu perfil."}</Text><Pressable onPress={() => void refreshProfile()}><Text style={{ color: palette.accent }}>Tentar novamente</Text></Pressable><Pressable onPress={() => void signOut()}><Text style={{ color: palette.accent }}>Sair</Text></Pressable></View>;
  if (profile.account_status === "disabled") return <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16, backgroundColor: palette.background }}><Text style={{ color: palette.text, fontSize: 20, fontWeight: "700" }}>Conta desativada</Text><Text style={{ color: palette.secondaryText }}>O acesso a esta conta está indisponível.</Text><Pressable onPress={() => void signOut()}><Text style={{ color: palette.accent }}>Sair</Text></Pressable></View>;
  if (!profile.username) return <Redirect href={"/auth/complete-profile" as never} />;
  return <Redirect href="/library" />;
}
