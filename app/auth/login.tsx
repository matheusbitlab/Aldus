import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { AuthButton, AuthError, AuthForm, AuthInput, AuthLink } from "@/src/presentation/components/AuthForm";
import { loginWithGoogle, loginWithIdentifier } from "@/src/data/remote/authService";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export default function Login() {
  const { session, profile } = useAuth();
  const { palette } = useAppTheme();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (session && profile) return <Redirect href="/" />;
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await operation(); router.replace("/"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível entrar."); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setBusy(true); setError(null);
    try { await loginWithGoogle(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Google indisponível."); }
    finally { setBusy(false); }
  };
  return <AuthForm title="Bem-vindo" subtitle="Entre para continuar sua leitura.">
    <AuthInput label="Email ou nome de usuário" icon="person-outline" value={identifier} onChangeText={setIdentifier} autoComplete="username" />
    <AuthInput label="Senha" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
    <AuthError message={error} />
    <AuthButton title={busy ? "Aguarde…" : "Entrar"} disabled={busy} onPress={() => void run(() => loginWithIdentifier(identifier, password))} />
    <AuthLink title="Esqueceu sua senha?" href="/auth/forgot-password" />
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1, height: 1, backgroundColor: palette.border }} /><Text style={{ color: palette.secondaryText }}>ou</Text><View style={{ flex: 1, height: 1, backgroundColor: palette.border }} /></View>
    <AuthButton title="Continuar com Google" icon="logo-google" secondary disabled={busy} onPress={() => void google()} />
    <AuthLink title="Não tem conta? Criar conta" href="/auth/signup" />
  </AuthForm>;
}
