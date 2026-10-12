import { AppState, Platform } from "react-native";
import { authDiagnostic, beginAuthDiagnostic, finishAuthDiagnostic } from "./authDiagnostics";

let activeOperationId: string | undefined;
let activeFlow: "SUPABASE_GOOGLE" | "AUTH_LINK" | "RECOVERY" = "AUTH_LINK";
let generation = 0;

// Only structural, allowlisted URL fields are returned. Query/hash are never inspected for logging.
export function authUrlDiagnosticFields(rawUrl?: string | null) {
  const fields: { returnedScheme: "aldus" | "http" | "https" | "other"; returnedHost: string; returnedPath: string } = {
    returnedScheme: "other", returnedHost: "other", returnedPath: "other",
  };
  try {
    const url = new URL(rawUrl ?? "");
    const scheme = url.protocol.slice(0, -1);
    if (scheme === "aldus" || scheme === "http" || scheme === "https") fields.returnedScheme = scheme;
    if (["auth", "localhost", "127.0.0.1", "[::1]", "accounts.google.com", "cmivracxuihtmsbmtuec.supabase.co"].includes(url.hostname)) fields.returnedHost = url.hostname;
    if (["/", "/callback", "/auth/callback", "/auth/v1/authorize", "/auth/v1/callback"].includes(url.pathname)) fields.returnedPath = url.pathname;
  } catch { /* Unknown/malformed URI still produces a safe diagnostic. */ }
  return fields;
}

export function authOAuthContext() {
  const state = AppState?.currentState;
  return {
    operationId: activeOperationId,
    flow: activeFlow,
    platform: (["android", "ios", "web"].includes(Platform.OS) ? Platform.OS : "other") as "android" | "ios" | "web" | "other",
    appState: (state === "active" || state === "background" || state === "inactive" ? state : "unknown") as "active" | "background" | "inactive" | "unknown",
  };
}

export function beginGoogleAuthOperation(redirectTo: string) {
  generation++;
  activeFlow = "SUPABASE_GOOGLE";
  activeOperationId = beginAuthDiagnostic();
  authDiagnostic("OAUTH_STARTED", {
    ...authOAuthContext(), initialRedirectScheme: authUrlDiagnosticFields(redirectTo).returnedScheme,
    callbackReceived: false, exchangeStarted: false, authorizationResult: "pending",
  });
  return generation;
}

export function isCurrentGoogleAuthOperation(ticket: number) { return ticket === generation; }
export function authOAuthGeneration() { return generation; }

export function diagnoseAuthCallback(url: string | null, next?: string, authorizationResult: "received" | "denied" | "rejected" = "received") {
  if (next === "reset-password") activeFlow = "RECOVERY";
  if (!activeOperationId) activeOperationId = beginAuthDiagnostic();
  const context = authOAuthContext();
  authDiagnostic("OAUTH_CALLBACK_RECEIVED", {
    ...context, ...authUrlDiagnosticFields(url), callbackReceived: true, exchangeStarted: false, authorizationResult,
  });
  return context.operationId;
}

export function finishAuthOAuthOperation(operationId?: string, uuid?: string) { finishAuthDiagnostic(operationId, uuid); }
