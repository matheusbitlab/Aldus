import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text } from "react-native";
import { AuthButton, AuthError, AuthForm, AuthInput, AuthLegalNotice, AuthLink } from "@/src/presentation/components/AuthForm";
import { loginWithGoogle, registerAccount } from "@/src/data/remote/authService";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { validUsername } from "@/src/domain/auth/authRules";
import { authDiagnostic, beginAuthDiagnostic, finishAuthDiagnostic } from "@/src/utils/authDiagnostics";

export default function Signup() {
  const { session, profile } = useAuth();
  const { palette } = useAppTheme();
  const [name, setName] = useState(""); const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState<string | null>(null);
  if (session && profile) return <Redirect href="/" />;
  const submit = async () => {
    const operationId = beginAuthDiagnostic();
    authDiagnostic("SIGNUP_STARTED", { operationId, result: "started", passwordLength: password.length,
      confirmationSameLength: password.length === confirmation.length, confirmationMatches: password === confirmation,
      usernameValid: validUsername(username), emailValid: /^\S+@\S+\.\S+$/.test(email.trim()) });
    if (!name.trim() || password !== confirmation) {
      setError(!name.trim() ? "Informe seu nome." : "As senhas não coincidem.");
      authDiagnostic("SIGNUP_UI_RESULT", { operationId, result: "error", stage: "validation", errorShown: true, navigationExecuted: false });
      finishAuthDiagnostic(operationId); return;
    }
    setBusy(true); setError(null);
    try {
      const result = await registerAccount(name, username, email, password, operationId);
      if (result.needsEmailConfirmation) setSent(true); else router.replace("/");
      authDiagnostic("SIGNUP_UI_RESULT", { operationId, result: "success", stage: result.needsEmailConfirmation ? "confirmation" : "navigation", errorShown: false, navigationExecuted: !result.needsEmailConfirmation });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível criar a conta.");
      authDiagnostic("SIGNUP_UI_RESULT", { operationId, result: "error", errorShown: true, navigationExecuted: false });
      finishAuthDiagnostic(operationId);
    }
    finally { setBusy(false); }
  };
  const google = async () => {
    setBusy(true); setError(null);
    try { await loginWithGoogle(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Google indisponível."); }
    finally { setBusy(false); }
  };
  if (sent) return <AuthForm title="Verifique seu email" subtitle="Enviamos um link para confirmar sua conta. Depois, volte ao aplicativo."><AuthLink title="Voltar para entrar" href="/auth/login" /></AuthForm>;
  return <AuthForm title="Criar conta" subtitle="Sua biblioteca local continuará neste dispositivo.">
    <AuthInput label="Nome" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
    <AuthInput label="Nome de usuário" value={username} onChangeText={setUsername} autoComplete="username-new" />
    <Text style={{ color: palette.secondaryText, fontSize: 12 }}>3 a 24 caracteres, começando por letra. Use letras, números e _.</Text>
    <AuthInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
    <AuthInput label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
    <AuthInput label="Confirmar senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" />
    <AuthError message={error} />
    <AuthLegalNotice intro="Ao criar uma conta, você declara que leu" />
    <AuthButton title={busy ? "Aguarde…" : "Criar conta"} disabled={busy} onPress={() => void submit()} />
    <AuthButton title="Continuar com Google" icon="logo-google" secondary disabled={busy} onPress={() => void google()} />
    <AuthLink title="Já tem conta? Entrar" href="/auth/login" />
  </AuthForm>;
}
