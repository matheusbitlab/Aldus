// Parse query/fragment on both platforms. Raw URL values never go to diagnostics/UI.
export function readAuthCallback(url: string | null | undefined) {
  const query = new URLSearchParams(url?.split("?")[1]?.split("#")[0] ?? "");
  const hash = new URLSearchParams(url?.split("#")[1] ?? "");
  const read = (key: string) => query.get(key) || hash.get(key) || undefined;
  return { code: read("code"), next: read("next"), error: read("error"),
    error_description: read("error_description"), error_code: read("error_code") };
}

export function callbackFailureMessage(description?: string) {
  return description?.includes("Unable to exchange external code")
    ? "O serviço não conseguiu concluir o acesso com o Google. A configuração do provedor precisa ser verificada."
    : "Não foi possível concluir a autenticação. Solicite um novo link ou tente entrar novamente.";
}
