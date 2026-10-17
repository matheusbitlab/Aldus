import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { DriveAuthorizationProvider, DRIVE_SCOPE } from "./DriveAuthorization";
import { DriveError } from "./DriveErrors";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { driveDiagnostic, driveOperationId } from "@/src/utils/driveDiagnostics";

interface TokenResponse { access_token?: string; expires_in?: number; scope?: string; error?: string; }
interface GoogleOAuth {
  initTokenClient(options: { client_id: string; scope: string; include_granted_scopes: boolean; callback: (result: TokenResponse) => void; error_callback: (error: { type?: string }) => void }): { requestAccessToken(options: { prompt: string }): void };
  revoke(token: string, callback: (result: { successful?: boolean }) => void): void;
}
function oauth(): GoogleOAuth | undefined {
  return typeof window === "undefined" ? undefined : (window as unknown as { google?: { accounts?: { oauth2?: GoogleOAuth } } }).google?.accounts?.oauth2;
}
let preparation: Promise<void> | undefined;
export const drivePlatformAuth: DriveAuthorizationProvider = {
  clearBeforeAuthorize: Platform.OS === "android",
  prepare: async () => {
    if (Platform.OS !== "web") {
      if (Platform.OS !== "android" || !requireOptionalNativeModule("AldusDriveAuth")) throw new DriveError("configuration");
      return;
    }
    if (!process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID) throw new DriveError("configuration");
    if (oauth()) return;
    if (!preparation) preparation = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      const timer = setTimeout(() => { script.remove(); reject(new DriveError("network")); }, 15000);
      script.onload = () => { clearTimeout(timer); oauth() ? resolve() : reject(new DriveError("configuration")); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new DriveError("network")); };
      document.head.appendChild(script);
    }).catch(error => { preparation = undefined; throw error; });
    return preparation;
  },
  authorize: (signal, correlationId) => {
    try { throwIfAborted(signal); } catch (error) { return Promise.reject(error); }
    const operationId = correlationId && /^(?:source|drive)-[a-z0-9]+-\d+$/.test(correlationId) ? correlationId : driveOperationId();
    const implementation = Platform.OS === "web" ? "GIS_WEB" : Platform.OS === "android" ? "AUTHORIZATION_CLIENT" : "UNAVAILABLE";
    driveDiagnostic({ operationId, implementation, callbackReceived: false, authorizationResult: "started" });
    if (Platform.OS === "web") {
      const api = oauth(), clientId = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID;
      // Preload from the modal effect; requestAccessToken must run inside the click.
      if (!api || !clientId) return Promise.reject(new DriveError("configuration"));
      return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error?: unknown, grant?: { accessToken: string; expiresAt: number }, callbackReceived = false) => {
          if (settled) return;
          settled = true; clearTimeout(timer); signal?.removeEventListener("abort", abort);
          driveDiagnostic({ operationId, implementation, callbackReceived,
            authorizationResult: error ? (error instanceof DriveError && error.code === "cancelled" || (error as Error)?.name === "AbortError" ? "cancelled" : "error") : "success",
            category: error instanceof DriveError ? error.category : undefined });
          if (error) reject(error); else resolve(grant!);
        };
        const abort = () => { try { throwIfAborted(signal); } catch (error) { finish(error); } };
        const timer = setTimeout(() => finish(new DriveError("network")), 120000);
        signal?.addEventListener("abort", abort, { once: true });
        try {
          const client = api.initTokenClient({ client_id: clientId, scope: DRIVE_SCOPE, include_granted_scopes: false,
            callback: result => {
              if (result.error) finish(new DriveError(result.error === "access_denied" ? "auth-denied" : result.error === "server_error" || result.error === "temporarily_unavailable" ? "network" : result.error === "invalid_client" || result.error === "unauthorized_client" || result.error === "invalid_request" ? "configuration" : "api"), undefined, true);
              else if (!result.access_token || !result.scope?.split(" ").includes(DRIVE_SCOPE)) finish(new DriveError("auth-denied"), undefined, true);
              else finish(undefined, { accessToken: result.access_token, expiresAt: Date.now() + Number(result.expires_in ?? 0) * 1000 }, true);
            },
            error_callback: error => finish(new DriveError(error?.type === "popup_closed" ? "cancelled" : error?.type === "popup_failed_to_open" ? "popup-blocked" : "api"), undefined, true),
          });
          client.requestAccessToken({ prompt: "select_account consent" });
        } catch { finish(new DriveError("configuration")); }
      });
    }
    const native = Platform.OS === "android" ? requireOptionalNativeModule<{
      authorize(operationId: string): Promise<{ accessToken: string; expiresAt: number; callbackReceived?: boolean }>;
      cancelAuthorization(operationId: string): Promise<void>;
      addListener?(event: string, listener: (result: { operationId?: string; stage?: string }) => void): { remove(): void };
    }>("AldusDriveAuth") : null;
    if (!native) return Promise.reject(new DriveError("configuration"));
    const deadline = new AbortController();
    const forward = () => deadline.abort();
    const cancel = () => { void native.cancelAuthorization(operationId).catch(() => undefined); };
    signal?.addEventListener("abort", forward, { once: true });
    deadline.signal.addEventListener("abort", cancel, { once: true });
    let callbackReceived = false;
    const subscription = native.addListener?.("onAuthorizationState", result => {
      if (result.operationId !== operationId) return;
      if (result.stage === "callback") callbackReceived = true;
      if (result.stage === "resolution") driveDiagnostic({ operationId, implementation, callbackReceived: false, authorizationResult: "resolution" });
    });
    const timer = setTimeout(forward, 120000);
    let request: Promise<{ accessToken: string; expiresAt: number; callbackReceived?: boolean }>;
    try { request = native.authorize(operationId); } catch (error) { request = Promise.reject(error); }
    return withAbort(request, deadline.signal).then(grant => {
      driveDiagnostic({ operationId, implementation, callbackReceived: callbackReceived || grant.callbackReceived === true, authorizationResult: "success" });
      return grant;
    }).catch(error => {
      const failure = deadline.signal.aborted && !signal?.aborted ? new DriveError("network") : nativeFailure(error);
      driveDiagnostic({ operationId, implementation, callbackReceived,
        authorizationResult: signal?.aborted || failure.code === "cancelled" ? "cancelled" : "error", category: failure.category });
      if (signal?.aborted) throw error;
      throw failure;
    }).finally(() => { clearTimeout(timer); signal?.removeEventListener("abort", forward); deadline.signal.removeEventListener("abort", cancel); subscription?.remove(); });
  },
  clearToken: async token => {
    if (Platform.OS !== "android") return;
    const native = requireOptionalNativeModule<{ clearToken(token: string): Promise<void> }>("AldusDriveAuth");
    if (!native) return;
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), 10000);
    try { await withAbort(native.clearToken(token), deadline.signal); } finally { clearTimeout(timer); }
  },
  revoke: async token => {
    // Revocation is best effort, bounded; local disconnection succeeds offline.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      if (Platform.OS === "web") {
        const api = oauth();
        if (!api) throw new DriveError("configuration");
        await withAbort(new Promise<void>((resolve, reject) => {
          api.revoke(token, result => result.successful ? resolve() : reject(new DriveError("network")));
        }), controller.signal);
        return;
      }
      const response = await withAbort(fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(token)}`, signal: controller.signal,
      }), controller.signal);
      if (!response.ok) throw new DriveError("network");
    } finally { clearTimeout(timer); }
  },
};

function nativeFailure(error: unknown): DriveError {
  const code = (error as { code?: unknown } | null)?.code;
  return new DriveError(code === "DRIVE_AUTH_CANCELLED" ? "cancelled" : code === "DRIVE_AUTH_REQUIRED" ? "disconnected" : code === "DRIVE_AUTH_DENIED" || code === "DRIVE_SCOPE" ? "auth-denied" : code === "DRIVE_CONFIGURATION" ? "configuration" : code === "DRIVE_NETWORK" ? "network" : code === "DRIVE_BUSY" ? "busy" : "api");
}
