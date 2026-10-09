import { useState } from "react";
import { AuthButton, AuthError, AuthForm, AuthInput, AuthLink } from "@/src/presentation/components/AuthForm";
import { sendRecoveryEmail } from "@/src/data/remote/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try { await sendRecoveryEmail(email); setSent(true); }
    catch (failure) {
      if (failure instanceof Error && failure.message === "Informe um email válido.") setError(failure.message);
      else setError("Não foi possível solicitar a recuperação agora. Verifique a conexão e tente novamente mais tarde.");
    } finally { setBusy(false); }
  };
  return <AuthForm title="Recuperar senha" subtitle={sent ? "Se existir uma conta correspondente, você receberá instruções." : "Informe seu email para receber um link de recuperação."}>
    {!sent ? <><AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" /><AuthError message={error} /><AuthButton title={busy ? "Aguarde…" : "Enviar link de recuperação"} disabled={busy} onPress={() => void submit()} /></> : null}
    <AuthLink title="Voltar para entrar" href="/auth/login" />
  </AuthForm>;
}
