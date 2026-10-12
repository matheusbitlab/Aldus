import { AppState, Platform } from "react-native";
import { DriveErrorCategory } from "@/src/data/drive/DriveErrors";

let sequence = 0;
export function driveOperationId(): string { return `drive-${Date.now().toString(36)}-${++sequence}`; }
export type DriveDiagnosticFields = {
  operationId: string; implementation: "AUTHORIZATION_CLIENT" | "GIS_WEB" | "UNAVAILABLE";
  callbackReceived?: boolean; authorizationResult?: "started" | "resolution" | "success" | "cancelled" | "error" | "stale";
  category?: DriveErrorCategory;
};
/** Strict allowlist: no account, folder, URL, OAuth code or credential is accepted. */
export function driveDiagnostic(fields: DriveDiagnosticFields): void {
  if (process.env.EXPO_PUBLIC_DRIVE_DIAGNOSTICS !== "1" && process.env.EXPO_PUBLIC_AUTH_DIAGNOSTICS !== "1") return;
  try {
    if (!/^drive-[a-z0-9]+-\d+$/.test(fields.operationId)) return;
    const clean: Record<string, string | boolean> = { operationId: fields.operationId, flow: "DRIVE", platform: Platform.OS,
      initialRedirectScheme: "none", appState: AppState.currentState ?? "unknown" };
    if (["AUTHORIZATION_CLIENT", "GIS_WEB", "UNAVAILABLE"].includes(fields.implementation)) clean.implementation = fields.implementation;
    if (typeof fields.callbackReceived === "boolean") clean.callbackReceived = fields.callbackReceived;
    if (fields.authorizationResult && ["started", "resolution", "success", "cancelled", "error", "stale"].includes(fields.authorizationResult)) clean.authorizationResult = fields.authorizationResult;
    if (fields.category && ["AUTH_CANCELLED", "AUTH_REQUIRED", "AUTH_DENIED", "TOKEN_EXPIRED", "DRIVE_API_DISABLED", "FOLDER_NOT_FOUND", "FOLDER_FORBIDDEN", "NETWORK_ERROR", "RATE_LIMIT", "INVALID_FOLDER", "UNKNOWN"].includes(fields.category)) clean.category = fields.category;
    console.info("[DriveDiagnostic]", JSON.stringify(clean));
  } catch { /* Observability cannot change authorization. */ }
}
