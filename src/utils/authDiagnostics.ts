import { authFailureDetails } from "@/src/data/remote/authErrors";

// Temporary investigation support. Off by default, console only, no persistent log.
// Only explicit, allowlisted fields survive serialization. Never pass raw session/error objects.
const enabled = process.env.EXPO_PUBLIC_AUTH_DIAGNOSTICS === "1";
type Event = "LOGIN_ATTEMPT_STARTED" | "SIGN_IN_RESULT" | "AUTH_EVENT" | "PROFILE_RESOLUTION"
  | "AUTH_GUARD_DECISION" | "LOGIN_UI_RESULT" | "SIGNUP_STARTED" | "SUPABASE_SIGNUP_RESULT"
  | "SIGNUP_UI_RESULT" | "OAUTH_STARTED" | "OAUTH_BROWSER_OPENED" | "OAUTH_CALLBACK_RECEIVED" | "OAUTH_EXCHANGE";
const events: readonly Event[] = ["LOGIN_ATTEMPT_STARTED", "SIGN_IN_RESULT", "AUTH_EVENT", "PROFILE_RESOLUTION", "AUTH_GUARD_DECISION", "LOGIN_UI_RESULT", "SIGNUP_STARTED", "SUPABASE_SIGNUP_RESULT", "SIGNUP_UI_RESULT", "OAUTH_STARTED", "OAUTH_BROWSER_OPENED", "OAUTH_CALLBACK_RECEIVED", "OAUTH_EXCHANGE"];
type Fields = {
  operationId?: string | null; uuid?: string | null; previousUuid?: string | null;
  session?: boolean; profile?: boolean; username?: boolean; loading?: boolean; appReady?: boolean;
  errorShown?: boolean; navigationExecuted?: boolean; passwordLength?: number;
  confirmationSameLength?: boolean; confirmationMatches?: boolean; usernameValid?: boolean; emailValid?: boolean;
  emailConfirmationPending?: boolean; cacheAgeMs?: number | null; code?: string; status?: number | null;
  result?: "started" | "success" | "error" | "missing";
  source?: "remote" | "cache"; accountStatus?: "active" | "disabled" | "unknown";
  stage?: "credentials" | "navigation" | "profile" | "profile_cache_write" | "validation" | "confirmation";
  guard?: "shell" | "route"; decision?: "allowed" | "blocked";
  authEvent?: string; correlation?: "candidate";
  category?: ReturnType<typeof authFailureDetails>["category"];
  flow?: "SUPABASE_GOOGLE" | "AUTH_LINK" | "RECOVERY";
  platform?: "android" | "ios" | "web" | "other";
  initialRedirectScheme?: "aldus" | "http" | "https" | "other";
  returnedScheme?: "aldus" | "http" | "https" | "other";
  returnedHost?: string; returnedPath?: string;
  appState?: "active" | "background" | "inactive" | "unknown";
  callbackReceived?: boolean; exchangeStarted?: boolean;
  exchangeResult?: "pending" | "success" | "error" | "missing_session" | "stale";
  authorizationResult?: "pending" | "opened" | "received" | "denied" | "error" | "rejected";
};
let counter = 0;
let latest: { id: string; uuid: string | null; pending: boolean } | null = null;
const validUuid = (value: unknown): string | null => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;

export function beginAuthDiagnostic(): string | undefined {
  if (!enabled) return undefined;
  const id = `auth-${Date.now().toString(36)}-${++counter}`;
  latest = { id, uuid: null, pending: true };
  return id;
}

export function finishAuthDiagnostic(operationId: string | undefined, uuid?: string | null) {
  if (latest && latest.id === operationId) { latest.pending = false; latest.uuid = validUuid(uuid); }
}

// A matching UUID / event during the request is correlation, not proof of causality.
export function correlatedAuthDiagnostic(uuid?: string | null): string | null {
  if (!enabled || !latest) return null;
  return latest.pending || (validUuid(uuid) !== null && latest.uuid === validUuid(uuid)) ? latest.id : null;
}

export function authDiagnostic(event: Event, fields: Fields) {
  if (!enabled || !events.includes(event)) return;
  try {
    const clean: Record<string, string | number | boolean | null> = { event, timestamp: new Date().toISOString() };
    for (const key of ["uuid", "previousUuid"] as const) if (fields[key] !== undefined) clean[key] = validUuid(fields[key]);
    if (typeof fields.operationId === "string" && /^auth-[a-z0-9]+-\d+$/.test(fields.operationId)) clean.operationId = fields.operationId;
    for (const key of ["session", "profile", "username", "loading", "appReady", "errorShown", "navigationExecuted", "confirmationSameLength", "confirmationMatches", "usernameValid", "emailValid", "emailConfirmationPending", "callbackReceived", "exchangeStarted"] as const) {
      if (typeof fields[key] === "boolean") clean[key] = fields[key];
    }
    for (const key of ["passwordLength", "cacheAgeMs"] as const) {
      const value = fields[key];
      if (value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0)) clean[key] = value;
    }
    const enums = {
      result: ["started", "success", "error", "missing"], source: ["remote", "cache"],
      accountStatus: ["active", "disabled", "unknown"], stage: ["credentials", "navigation", "profile", "profile_cache_write", "validation", "confirmation"],
      guard: ["shell", "route"], decision: ["allowed", "blocked"], correlation: ["candidate"],
      authEvent: ["SIGNED_IN", "SIGNED_OUT", "INITIAL_SESSION", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY", "MFA_CHALLENGE_VERIFIED"],
      category: ["credentials", "confirmation", "password_policy", "email", "rate_limit", "signup_unavailable", "verification", "account", "conflict", "permission", "backend", "network", "unknown"],
      flow: ["SUPABASE_GOOGLE", "AUTH_LINK", "RECOVERY"], platform: ["android", "ios", "web", "other"],
      initialRedirectScheme: ["aldus", "http", "https", "other"], returnedScheme: ["aldus", "http", "https", "other"],
      appState: ["active", "background", "inactive", "unknown"],
      exchangeResult: ["pending", "success", "error", "missing_session", "stale"],
      authorizationResult: ["pending", "opened", "received", "denied", "error", "rejected"],
    };
    for (const key of Object.keys(enums) as (keyof typeof enums)[]) {
      const value = fields[key]; if (value && enums[key].includes(value)) clean[key] = value;
    }
    const knownHosts = ["auth", "localhost", "127.0.0.1", "[::1]", "accounts.google.com", "cmivracxuihtmsbmtuec.supabase.co", "other"];
    const knownPaths = ["/", "/callback", "/auth/callback", "/auth/v1/authorize", "/auth/v1/callback", "other"];
    if (fields.returnedHost && knownHosts.includes(fields.returnedHost)) clean.returnedHost = fields.returnedHost;
    if (fields.returnedPath && knownPaths.includes(fields.returnedPath)) clean.returnedPath = fields.returnedPath;
    if (fields.code !== undefined || fields.status !== undefined) {
      const details = authFailureDetails(fields); clean.code = details.code; clean.status = details.status;
      if (!clean.category) clean.category = details.category;
    }
    console.info("[AuthDiagnostic]", JSON.stringify(clean));
  } catch { /* Diagnostics must never change the outcome of authentication. */ }
}
