import { useState } from "react";
import { router } from "expo-router";
import { AuthButton, AuthError, AuthForm, AuthInput } from "@/src/presentation/components/AuthForm";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { normalizeUsername, validUsername } from "@/src/domain/auth/authRules";
import { requireSupabase } from "@/src/data/remote/supabase";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!user) return;
    if (!validUsername(username)) { setError("Use 3 a 24 caracteres: letras, números ou _; comece por uma letra."); return; }
    if (!name.trim()) { setError("Informe seu nome."); return; }
    setBusy(true); setError(null);
    const result = await requireSupabase().from("profiles").update({ display_name: name.trim().slice(0, 120), username: normalizeUsername(username) }).eq("id", user.id).select("id").single();
    if (result.error) setError(result.error.code === "23505" ? "Este nome de usuário já está em uso." : "Não foi possível salvar o perfil.");
    else { await refreshProfile(); router.back(); }
    setBusy(false);
  };
  return <AuthGuard><AuthForm title="Editar perfil" subtitle="Seu nome e usuário aparecem na conta.">
    <AuthInput label="Nome" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
    <AuthInput label="Nome de usuário" value={username} onChangeText={setUsername} autoComplete="username" />
    <AuthError message={error} />
    <AuthButton title={busy ? "Aguarde…" : "Salvar perfil"} disabled={busy} onPress={() => void submit()} />
  </AuthForm></AuthGuard>;
}
