import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";
import { AuthButton, AuthForm } from "@/src/presentation/components/AuthForm";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { router } from "expo-router";
import { useState } from "react";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";

export default function Account() {
  const { user, profile, signOut } = useAuth();
  const { palette } = useAppTheme();
  const [error, setError] = useState<string | null>(null);
  return <AuthGuard><AuthForm title="Conta" subtitle="Seu perfil no Kindle Reader">
    <View style={{ alignItems: "center", paddingVertical: 12, gap: 8 }}>
      {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.surfaceSecondary, alignItems: "center", justifyContent: "center" }}><Ionicons name="person-outline" color={palette.accent} size={30} /></View>}
      <Text style={{ color: palette.text, fontSize: 19, fontWeight: "700" }}>{profile?.display_name || user?.email || "Leitor"}</Text>
      <Text style={{ color: palette.secondaryText }}>{profile?.username ? `@${profile.username}` : "Sem nome de usuário"}</Text>
      <Text style={{ color: palette.secondaryText }}>{user?.email}</Text>
    </View>
    <AuthButton title="Editar perfil" icon="create-outline" onPress={() => router.push("/account/edit-profile" as never)} />
    <AuthButton title="Alterar senha" icon="lock-closed-outline" secondary onPress={() => router.push("/account/change-password" as never)} />
    <AuthButton title="Sair" icon="log-out-outline" secondary onPress={() => void signOut().then(() => router.replace("/auth/login" as never)).catch(failure => setError(failure instanceof Error ? failure.message : "Não foi possível sair."))} />
    {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
  </AuthForm></AuthGuard>;
}
