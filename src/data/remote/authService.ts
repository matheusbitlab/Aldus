import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { requireSupabase } from "./supabase";
import { normalizeUsername, validUsername } from "@/src/domain/auth/authRules";

export function authCallbackUrl(next?: "reset-password") {
  const base = Platform.OS === "web"
    ? `${typeof window === "undefined" ? "http://localhost:8081" : window.location.origin}/auth/callback`
    : "kindlereader://auth/callback";
  return next ? `${base}?next=${next}` : base;
}

export async function loginWithIdentifier(identifier: string, password: string) {
  const client = requireSupabase();
  const name = identifier.trim();
  if (!name || !password) throw new Error("Informe usuário ou email e senha.");
  if (name.includes("@")) {
    const { error } = await client.auth.signInWithPassword({ email: name.toLowerCase(), password });
    if (error) throw new Error("Não foi possível entrar. Confira os dados e tente novamente.");
    return;
  }
  if (!validUsername(name)) throw new Error("Não foi possível entrar. Confira os dados e tente novamente.");
  const { data, error } = await client.functions.invoke("username-login", {
    body: { username: normalizeUsername(name), password },
  });
  if (error || !data?.access_token || !data?.refresh_token) {
    throw new Error("Não foi possível entrar. Confira os dados e tente novamente.");
  }
  const result = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  if (result.error) throw new Error("Não foi possível iniciar a sessão. Tente novamente.");
}

export async function registerAccount(name: string, username: string, email: string, password: string) {
  const client = requireSupabase();
  if (!validUsername(username)) throw new Error("Use 3 a 24 caracteres: letras, números ou _; comece por uma letra.");
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Informe um email válido.");
  if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(), password,
    options: { emailRedirectTo: authCallbackUrl(), data: { username: normalizeUsername(username), display_name: name.trim() } },
  });
  if (error) throw new Error("Não foi possível criar a conta. Verifique os dados ou tente outro usuário.");
  return { needsEmailConfirmation: !data.session };
}

export async function loginWithGoogle() {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authCallbackUrl(), skipBrowserRedirect: Platform.OS !== "web" },
  });
  if (error || !data.url) throw new Error("Não foi possível iniciar o login Google.");
  if (Platform.OS !== "web") await Linking.openURL(data.url);
}

export async function sendRecoveryEmail(email: string) {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Informe um email válido.");
  await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: authCallbackUrl("reset-password") });
}

export async function exchangeCallbackCode(code: string | null) {
  if (!code) throw new Error("Link inválido ou expirado. Solicite um novo link.");
  const { error } = await requireSupabase().auth.exchangeCodeForSession(code);
  if (error) throw new Error("Link inválido ou expirado. Solicite um novo link.");
}
