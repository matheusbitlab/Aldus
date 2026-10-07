import { useState } from "react";
import { router } from "expo-router";
import { AuthButton, AuthError, AuthForm, AuthInput } from "@/src/presentation/components/AuthForm";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { requireSupabase } from "@/src/data/remote/supabase";

export default function ResetPassword() {
  const { session } = useAuth();
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!session) { setError("Abra um link de recuperação válido antes de redefinir a senha."); return; }
    if (password.length < 8) { setError("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (password !== confirmation) { setError("As senhas não coincidem."); return; }
    setBusy(true); setError(null);
    const { error: failure } = await requireSupabase().auth.updateUser({ password });
    setBusy(false);
    if (failure) { setError("Não foi possível atualizar a senha. Solicite um novo link."); return; }
    router.replace("/");
  };
  return <AuthForm title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta.">
    <AuthInput label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    <AuthInput label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" />
    <AuthError message={error} />
    <AuthButton title={busy ? "Aguarde…" : "Salvar nova senha"} disabled={busy} onPress={() => void submit()} />
  </AuthForm>;
}
