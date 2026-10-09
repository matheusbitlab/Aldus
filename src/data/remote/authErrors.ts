// No backend message, response body or credentials are retained in these errors.
const knownCodes = new Set([
  "invalid_credentials", "email_not_confirmed", "weak_password", "email_address_invalid",
  "email_address_not_authorized", "user_already_exists", "email_exists", "signup_disabled",
  "email_provider_disabled", "over_request_rate_limit", "over_email_send_rate_limit",
  "over_sms_send_rate_limit", "captcha_failed", "unexpected_failure", "request_timeout",
  "validation_failed", "bad_json", "user_banned", "session_not_found", "session_expired",
  "23505", "23514", "42501", "PGRST116",
]);

export type AuthErrorCategory = "credentials" | "confirmation" | "password_policy" | "email"
  | "rate_limit" | "signup_unavailable" | "verification" | "account" | "conflict"
  | "permission" | "backend" | "network" | "unknown";

export function authFailureDetails(failure: unknown): { code: string; status: number | null; category: AuthErrorCategory } {
  if (failure instanceof AuthOperationError) return { code: failure.code, status: failure.status, category: failure.category };
  const value = failure && typeof failure === "object" ? failure as { code?: unknown; status?: unknown; name?: unknown } : {};
  const code = typeof value.code === "string" && knownCodes.has(value.code) ? value.code : "unknown";
  const status = typeof value.status === "number" && Number.isInteger(value.status) && value.status >= 100 && value.status <= 599 ? value.status : null;
  let category: AuthErrorCategory = "unknown";
  if (code === "invalid_credentials") category = "credentials";
  else if (code === "email_not_confirmed") category = "confirmation";
  else if (code === "weak_password") category = "password_policy";
  else if (code === "email_address_invalid") category = "email";
  else if (code.startsWith("over_") || status === 429) category = "rate_limit";
  else if (code === "signup_disabled" || code === "email_provider_disabled") category = "signup_unavailable";
  else if (code === "captcha_failed") category = "verification";
  else if (["user_already_exists", "email_exists", "email_address_not_authorized", "user_banned"].includes(code)) category = "account";
  else if (code === "23505") category = "conflict"; // Constraint unspecified: never assume username/email.
  else if (code === "42501") category = "permission";
  else if (code === "unexpected_failure" || (status !== null && status >= 500)) category = "backend";
  else if (code === "request_timeout" || value.name === "AuthRetryableFetchError") category = "network";
  return { code, status, category };
}

export class AuthOperationError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly category: AuthErrorCategory;
  constructor(operation: "login" | "signup", failure: unknown) {
    const details = authFailureDetails(failure);
    const signupMessages: Partial<Record<AuthErrorCategory, string>> = {
      password_policy: "A senha não atende à política de segurança do serviço. Escolha outra senha mais forte.",
      email: "Informe um email válido.",
      rate_limit: "Muitas tentativas de cadastro. Aguarde antes de tentar novamente.",
      signup_unavailable: "O cadastro por email está indisponível no momento.",
      verification: "Não foi possível concluir a verificação de segurança. Tente novamente.",
      backend: "O serviço não conseguiu concluir o cadastro. Tente novamente mais tarde.",
      permission: "O serviço não conseguiu concluir o cadastro. Tente novamente mais tarde.",
      network: "Não foi possível conectar ao serviço de cadastro. Verifique a conexão.",
      conflict: "Não foi possível concluir o cadastro com os dados informados.",
    };
    super(operation === "signup"
      ? signupMessages[details.category] ?? "Não foi possível concluir o cadastro. Se já possui conta, entre ou recupere o acesso."
      : "Não foi possível entrar. Confira os dados e tente novamente.");
    this.name = "AuthOperationError";
    this.code = details.code; this.status = details.status; this.category = details.category;
  }
}
