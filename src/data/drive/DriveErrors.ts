export type DriveErrorCode = "disconnected" | "expired" | "permission" | "not-found" | "rate-limit" | "network" | "api" | "invalid-folder" | "unsupported" | "configuration";
const messages: Record<DriveErrorCode, string> = {
  disconnected: "Drive desconectado. Use Conectar/Reconectar em Minhas fontes.",
  expired: "A autorização do Drive expirou ou foi revogada. Reconecte o Drive.",
  permission: "O Google recusou o acesso. Confira a permissão da pasta, o consentimento e se a API Drive está habilitada.",
  "not-found": "Pasta ou arquivo não encontrado, ou não visível para esta conta Google (404).",
  "rate-limit": "Limite de consultas do Drive atingido. Aguarde e tente atualizar novamente.",
  network: "Não foi possível contatar o Drive. Confira a rede e tente novamente.",
  api: "A API do Drive não respondeu corretamente. Tente atualizar novamente.",
  "invalid-folder": "Informe o ID ou um link de pasta válido do Google Drive.",
  unsupported: "Use uma pasta real do Drive. Atalhos e subpastas não são percorridos nesta etapa.",
  configuration: "A autorização Google Drive não está configurada nesta plataforma/build.",
};
export class DriveError extends Error {
  constructor(public readonly code: DriveErrorCode) { super(messages[code]); this.name = "DriveError"; }
}
export function assertDriveResponse(status: number): void {
  if (status >= 200 && status < 300) return;
  throw new DriveError(status === 401 ? "expired" : status === 403 ? "permission" : status === 404 ? "not-found" : status === 429 ? "rate-limit" : "api");
}
