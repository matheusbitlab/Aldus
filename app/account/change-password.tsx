import { useState } from "react";
import { router } from "expo-router";
import { AuthButton, AuthError, AuthForm, AuthInput } from "@/src/presentation/components/AuthForm";
import { requireSupabase } from "@/src/data/remote/supabase";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";

export default function ChangePassword() {
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (password.length < 8) { setError("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (password !== confirmation) { setError("As senhas não coincidem."); return; }
    setBusy(true); setError(null);
    const result = await requireSupabase().auth.updateUser({ password });
    setBusy(false);
    if (result.error) { setError("Não foi possível alterar a senha. Tente novamente ou use a recuperação de senha."); return; }
    router.back();
  };
  return <AuthGuard><AuthForm title="Alterar senha" subtitle="Escolha uma senha com pelo menos 8 caracteres.">
    <AuthInput label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    <AuthInput label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" />
    <AuthError message={error} />
    <AuthButton title={busy ? "Aguarde…" : "Salvar senha"} disabled={busy} onPress={() => void submit()} />
  </AuthForm></AuthGuard>;
}
