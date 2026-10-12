export type DriveErrorCode = "disconnected" | "expired" | "cancelled" | "popup-blocked" | "auth-denied" | "api-disabled" | "permission" | "not-found" | "rate-limit" | "network" | "api" | "invalid-folder" | "unsupported" | "configuration" | "busy";
export type DriveErrorCategory = "AUTH_CANCELLED" | "AUTH_REQUIRED" | "AUTH_DENIED" | "TOKEN_EXPIRED" | "DRIVE_API_DISABLED" | "FOLDER_NOT_FOUND" | "FOLDER_FORBIDDEN" | "NETWORK_ERROR" | "RATE_LIMIT" | "INVALID_FOLDER" | "UNKNOWN";
const categories: Record<DriveErrorCode, DriveErrorCategory> = {
  disconnected: "AUTH_REQUIRED", expired: "TOKEN_EXPIRED", cancelled: "AUTH_CANCELLED", "popup-blocked": "AUTH_REQUIRED", "auth-denied": "AUTH_DENIED",
  "api-disabled": "DRIVE_API_DISABLED", permission: "FOLDER_FORBIDDEN", "not-found": "FOLDER_NOT_FOUND",
  "rate-limit": "RATE_LIMIT", network: "NETWORK_ERROR", api: "UNKNOWN", "invalid-folder": "INVALID_FOLDER",
  unsupported: "INVALID_FOLDER", configuration: "UNKNOWN", busy: "UNKNOWN",
};
const messages: Record<DriveErrorCode, string> = {
  disconnected: "Drive desconectado. Use Conectar/Reconectar em Minhas fontes.",
  expired: "A autorização do Drive expirou ou foi revogada. Reconecte o Drive.",
  cancelled: "A autorização do Google Drive foi cancelada. Toque em Reconectar para tentar novamente.",
  "popup-blocked": "O navegador bloqueou a janela de autorização Google. Permita pop-ups para este site e toque em Reconectar.",
  "auth-denied": "O Google não concedeu a autorização Drive. Confira o consentimento e se sua conta está autorizada a usar o aplicativo.",
  "api-disabled": "A API Google Drive está desabilitada para este aplicativo. A configuração do serviço precisa ser concluída pelo responsável.",
  permission: "Esta conta Google não tem permissão para acessar a pasta ou baixar este arquivo. Confira o compartilhamento da pasta.",
  "not-found": "Pasta ou arquivo não encontrado, ou não visível para esta conta Google (404).",
  "rate-limit": "Limite de consultas do Drive atingido. Aguarde e tente atualizar novamente.",
  network: "Não foi possível contatar o Drive. Confira a rede e tente novamente.",
  api: "Não foi possível concluir a consulta ao Drive. A causa não foi identificada; tente atualizar novamente.",
  "invalid-folder": "Informe o ID ou um link de pasta válido do Google Drive.",
  unsupported: "Use uma pasta real do Drive. Atalhos e subpastas não são percorridos nesta etapa.",
  configuration: "A autorização Google Drive não está configurada nesta plataforma/build.",
  busy: "Já existe uma autorização Drive em andamento. Conclua ou cancele a janela do Google e tente novamente.",
};
export class DriveError extends Error {
  readonly category: DriveErrorCategory;
  constructor(public readonly code: DriveErrorCode) { super(messages[code]); this.name = "DriveError"; this.category = categories[code]; }
}
/** Provider bodies are used only for known reason enums; their messages never leave this boundary. */
export function assertDriveResponse(status: number, body?: unknown): void {
  if (status >= 200 && status < 300) return;
  const error = (body as { error?: { errors?: { reason?: unknown }[]; details?: { reason?: unknown }[] } } | null)?.error;
  const reasons = [...(Array.isArray(error?.errors) ? error.errors : []), ...(Array.isArray(error?.details) ? error.details : [])].map(item => item?.reason);
  const disabled = reasons.some(reason => reason === "accessNotConfigured" || reason === "serviceDisabled" || reason === "SERVICE_DISABLED");
  const rateLimit = reasons.some(reason => reason === "rateLimitExceeded" || reason === "userRateLimitExceeded" || reason === "dailyLimitExceeded" || reason === "RATE_LIMIT_EXCEEDED");
  const scope = reasons.some(reason => reason === "insufficientPermissions" || reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT");
  const filePermission = reasons.some(reason => reason === "insufficientFilePermissions");
  throw new DriveError(status === 401 ? "expired" : status === 429 || (status === 403 && rateLimit) ? "rate-limit" : status === 403 && disabled ? "api-disabled" : status === 403 && scope ? "auth-denied" : status === 403 && filePermission ? "permission" : status === 404 ? "not-found" : "api");
}
