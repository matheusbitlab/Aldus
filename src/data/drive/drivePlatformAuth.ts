import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { DriveAuthorizationProvider, DRIVE_SCOPE } from "./DriveAuthorization";
import { DriveError } from "./DriveErrors";
import { withAbort } from "@/src/core/utils/cancellation";

interface TokenResponse { access_token?: string; expires_in?: number; scope?: string; error?: string; }
interface GoogleOAuth {
  initTokenClient(options: { client_id: string; scope: string; include_granted_scopes: boolean; callback: (result: TokenResponse) => void; error_callback: () => void }): { requestAccessToken(options: { prompt: string }): void };
  revoke(token: string, callback: (result: { successful?: boolean }) => void): void;
}
function oauth(): GoogleOAuth | undefined {
  return typeof window === "undefined" ? undefined : (window as unknown as { google?: { accounts?: { oauth2?: GoogleOAuth } } }).google?.accounts?.oauth2;
}
let preparation: Promise<void> | undefined;
export const drivePlatformAuth: DriveAuthorizationProvider = {
  prepare: async () => {
    if (Platform.OS !== "web") return;
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
  authorize: signal => {
    if (Platform.OS === "web") {
      const api = oauth(), clientId = process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID;
      // Preload from the modal effect; requestAccessToken must run inside the click.
      if (!api || !clientId) return Promise.reject(new DriveError("configuration"));
      return withAbort(new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new DriveError("network")), 120000);
        const finish = () => { clearTimeout(timer); signal?.removeEventListener("abort", finish); };
        signal?.addEventListener("abort", finish, { once: true });
        try {
          const client = api.initTokenClient({ client_id: clientId, scope: DRIVE_SCOPE, include_granted_scopes: false,
            callback: result => {
              finish();
              if (result.error || !result.access_token || !result.scope?.split(" ").includes(DRIVE_SCOPE)) reject(new DriveError("permission"));
              else resolve({ accessToken: result.access_token, expiresAt: Date.now() + Number(result.expires_in ?? 0) * 1000 });
            },
            error_callback: () => { finish(); reject(new DriveError("disconnected")); },
          });
          client.requestAccessToken({ prompt: "consent" });
        } catch { finish(); reject(new DriveError("configuration")); }
      }), signal);
    }
    const native = Platform.OS === "android" ? requireOptionalNativeModule<{
      authorize(): Promise<{ accessToken: string; expiresAt: number }>; cancelAuthorization(): Promise<void>;
    }>("AldusDriveAuth") : null;
    if (!native) return Promise.reject(new DriveError("configuration"));
    const deadline = new AbortController();
    const forward = () => deadline.abort();
    const cancel = () => { void native.cancelAuthorization().catch(() => undefined); };
    signal?.addEventListener("abort", forward, { once: true });
    deadline.signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(forward, 120000);
    return withAbort(native.authorize(), deadline.signal).catch(error => {
      if (signal?.aborted) throw error;
      if (deadline.signal.aborted) throw new DriveError("network");
      throw new DriveError("permission");
    }).finally(() => { clearTimeout(timer); signal?.removeEventListener("abort", forward); deadline.signal.removeEventListener("abort", cancel); });
  },
  clearToken: async token => {
    if (Platform.OS !== "android") return;
    await requireOptionalNativeModule<{ clearToken(token: string): Promise<void> }>("AldusDriveAuth")?.clearToken(token);
  },
  revoke: async token => {
    // Revocation is best effort, bounded; local disconnection succeeds offline.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await withAbort(fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(token)}`, signal: controller.signal,
      }), controller.signal);
      if (!response.ok) throw new DriveError("network");
    } finally { clearTimeout(timer); }
  },
};
