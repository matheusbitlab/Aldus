import { useState } from "react";
import { Redirect, router } from "expo-router";
import { AuthButton, AuthError, AuthForm, AuthInput } from "@/src/presentation/components/AuthForm";
import { normalizeUsername, validUsername } from "@/src/domain/auth/authRules";
import { requireSupabase } from "@/src/data/remote/supabase";
import { useAuth } from "@/src/presentation/contexts/AuthContext";

export default function CompleteProfile() {
  const { session, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(""); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!session) return <Redirect href={"/auth/login" as never} />;
  if (profile?.username) return <Redirect href="/" />;
  const submit = async () => {
    if (!validUsername(username)) { setError("Use 3 a 24 caracteres: letras, números ou _; comece por uma letra."); return; }
    setBusy(true); setError(null);
    const result = await requireSupabase().from("profiles").update({ username: normalizeUsername(username) }).eq("id", session.user.id).select("id").single();
    if (result.error) { setError(result.error.code === "23505" ? "Este nome de usuário já está em uso." : "Não foi possível salvar o usuário."); setBusy(false); return; }
    await refreshProfile(); setBusy(false); router.replace("/");
  };
  return <AuthForm title="Escolha seu nome de usuário" subtitle="Ele será usado para entrar e identificar seu perfil.">
    <AuthInput label="Nome de usuário" value={username} onChangeText={setUsername} autoComplete="username-new" />
    <AuthError message={error} />
    <AuthButton title={busy ? "Aguarde…" : "Continuar"} disabled={busy} onPress={() => void submit()} />
  </AuthForm>;
}
