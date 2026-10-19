import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { requireSupabase } from "./supabase";
import { normalizeUsername, validUsername } from "@/src/domain/auth/authRules";
import { AuthOperationError, authFailureDetails } from "./authErrors";
import { authDiagnostic, finishAuthDiagnostic } from "@/src/utils/authDiagnostics";
import { buildAuthCallback, validateGoogleAuthorizationUrl } from "./authRedirect";
import { authOAuthContext, authOAuthGeneration, beginGoogleAuthOperation, finishAuthOAuthOperation, isCurrentGoogleAuthOperation } from "@/src/utils/authOAuthDiagnostics";
import { hardenPkceParameters } from "./authPkce";

export function authCallbackUrl(next?: "reset-password") {
  const webOrigin = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : undefined;
  return buildAuthCallback(Platform.OS, webOrigin, next);
}

export async function loginWithIdentifier(identifier: string, password: string, operationId?: string) {
  const client = requireSupabase();
  const name = identifier.trim();
  if (!name || !password) throw new Error("Informe usuário ou email e senha.");
  if (name.includes("@")) {
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: name.toLowerCase(), password });
      if (error) throw new AuthOperationError("login", error);
      authDiagnostic("SIGN_IN_RESULT", { operationId, result: "success", uuid: data.user?.id, session: !!data.session });
      finishAuthDiagnostic(operationId, data.user?.id);
    } catch (failure) {
      const error = failure instanceof AuthOperationError ? failure : new AuthOperationError("login", failure);
      authDiagnostic("SIGN_IN_RESULT", { operationId, result: "error", ...authFailureDetails(error) });
      finishAuthDiagnostic(operationId);
      throw error;
    }
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

export async function registerAccount(name: string, username: string, email: string, password: string, operationId?: string) {
  const client = requireSupabase();
  if (!validUsername(username)) throw new Error("Use 3 a 24 caracteres: letras, números ou _; comece por uma letra.");
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Informe um email válido.");
  if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(), password,
      // The existing Auth trigger inserts profiles.username under a unique index.
      // Claim it only after email verification, through the authenticated profile flow:
      // a taken suggestion must not abort creation of the Auth identity with HTTP 500.
      options: { emailRedirectTo: authCallbackUrl(), data: { preferred_username: normalizeUsername(username), display_name: name.trim() } },
    });
    if (error) throw new AuthOperationError("signup", error);
    authDiagnostic("SUPABASE_SIGNUP_RESULT", { operationId, result: "success", uuid: data.user?.id, session: !!data.session, emailConfirmationPending: !data.session });
    finishAuthDiagnostic(operationId, data.user?.id);
    return { needsEmailConfirmation: !data.session };
  } catch (failure) {
    const error = failure instanceof AuthOperationError ? failure : new AuthOperationError("signup", failure);
    authDiagnostic("SUPABASE_SIGNUP_RESULT", { operationId, result: "error", ...authFailureDetails(error) });
    finishAuthDiagnostic(operationId);
    throw error;
  }
}

export async function loginWithGoogle() {
  if (callbackExchange?.pending) throw new Error("A autenticação anterior está sendo concluída. Aguarde e tente novamente.");
  const client = requireSupabase();
  const redirectTo = authCallbackUrl();
  const ticket = beginGoogleAuthOperation(redirectTo);
  const context = authOAuthContext();
  let result;
  try {
    // Validate the SDK's authorize URL before either platform opens the browser.
    result = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  } catch (failure) {
    if (!isCurrentGoogleAuthOperation(ticket)) return;
    authDiagnostic("OAUTH_BROWSER_OPENED", { ...context, authorizationResult: "error", ...authFailureDetails(failure) });
    throw new Error("Não foi possível iniciar o login Google. Verifique a conexão e tente novamente.");
  }
  if (!isCurrentGoogleAuthOperation(ticket)) return;
  const { data, error } = result;
  if (error || !data.url) {
    authDiagnostic("OAUTH_BROWSER_OPENED", { ...context, authorizationResult: "error", ...authFailureDetails(error) });
    throw new Error("Não foi possível iniciar o login Google.");
  }
  let authorizationUrl = data.url;
  try {
    if (Platform.OS !== 'web') {
      const nativeUrl = new URL(authorizationUrl);
      hardenPkceParameters(nativeUrl.searchParams);
      authorizationUrl = nativeUrl.href;
    }
    validateGoogleAuthorizationUrl(authorizationUrl, process.env.EXPO_PUBLIC_SUPABASE_URL, redirectTo);
  }
  catch (failure) {
    authDiagnostic("OAUTH_BROWSER_OPENED", { ...context, authorizationResult: "rejected" });
    throw failure;
  }
  try {
    if (Platform.OS === "web") window.location.assign(authorizationUrl);
    else await Linking.openURL(authorizationUrl);
    authDiagnostic("OAUTH_BROWSER_OPENED", { ...context, authorizationResult: "opened", callbackReceived: false, exchangeStarted: false });
  } catch {
    if (!isCurrentGoogleAuthOperation(ticket)) return;
    authDiagnostic("OAUTH_BROWSER_OPENED", { ...context, authorizationResult: "error" });
    throw new Error("Não foi possível abrir o login Google. Tente novamente.");
  }
}

export async function sendRecoveryEmail(email: string) {
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Informe um email válido.");
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: authCallbackUrl("reset-password") });
  if (error) {
    const details = authFailureDetails(error);
    if (["network", "backend", "rate_limit"].includes(details.category)) {
      throw new Error("Não foi possível solicitar a recuperação agora. Verifique a conexão e tente novamente mais tarde.");
    }
    // Account-specific refusals keep the same generic response (anti-enumeration).
  }
}

// One bounded in-memory entry: StrictMode/effect updates/remounts attach to the same
// exchange. A PKCE code is single-use; never repeat it or log its value.
let callbackExchange: { code: string; promise: Promise<void>; generation: number; pending: boolean } | null = null;
export function exchangeCallbackCode(code: string | null, operationId?: string): Promise<void> {
  if (!code) return Promise.reject(new Error("Link inválido ou expirado. Solicite um novo link."));
  const generation = authOAuthGeneration();
  const context = { ...authOAuthContext(), operationId };
  if (callbackExchange?.code === code) {
    if (callbackExchange.generation !== generation) {
      authDiagnostic("OAUTH_EXCHANGE", { ...context, exchangeStarted: false, exchangeResult: "stale" });
      return Promise.reject(new Error("Este retorno pertence a uma tentativa anterior. Continue com o login mais recente."));
    }
    return callbackExchange.promise;
  }
  const entry = { code, promise: Promise.resolve(), generation, pending: true };
  callbackExchange = entry;
  entry.promise = (async () => {
    authDiagnostic("OAUTH_EXCHANGE", { ...context, callbackReceived: true, exchangeStarted: true, exchangeResult: "pending" });
    try {
      const { data, error } = await requireSupabase().auth.exchangeCodeForSession(code);
      if (error) throw new Error();
      if (!data?.session?.user?.id || !data.session.access_token || !data.session.refresh_token) {
        authDiagnostic("OAUTH_EXCHANGE", { ...context, exchangeStarted: true, exchangeResult: "missing_session", session: false });
        throw new Error();
      }
      authDiagnostic("OAUTH_EXCHANGE", { ...context, exchangeStarted: true, exchangeResult: "success", session: true });
      finishAuthOAuthOperation(operationId, data.session.user.id);
    } catch {
      authDiagnostic("OAUTH_EXCHANGE", { ...context, exchangeStarted: true, exchangeResult: "error" });
      finishAuthOAuthOperation(operationId);
      throw new Error("Link inválido ou expirado. Solicite um novo link.");
    } finally { entry.pending = false; }
  })();
  return entry.promise;
}
