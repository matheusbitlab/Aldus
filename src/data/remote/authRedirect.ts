/** Keep Google → Supabase and Supabase → app as separate redirect contracts. */
export const NATIVE_AUTH_CALLBACK = "aldus://auth/callback";

export function buildAuthCallback(platform: string, webOrigin?: string, next?: "reset-password") {
  let base = NATIVE_AUTH_CALLBACK;
  if (platform === "web") {
    // Static rendering has no browser origin. Inventing one sends real users to localhost.
    if (!webOrigin) throw new Error("Abra o aplicativo no navegador para continuar a autenticação.");
    let origin: URL;
    try { origin = new URL(webOrigin); } catch { throw new Error("O endereço Web do aplicativo é inválido."); }
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.origin !== webOrigin) {
      throw new Error("O endereço Web do aplicativo é inválido.");
    }
    base = `${origin.origin}/auth/callback`;
  }
  return next ? `${base}?next=${next}` : base;
}

export function isExpectedAuthCallback(url: string | null | undefined, platform: string, webOrigin?: string) {
  if (!url) return true; // Expo Router may supply params before Linking resolves its initial URL.
  try {
    const actual = new URL(url);
    const expected = new URL(buildAuthCallback(platform, webOrigin));
    return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname
      && !actual.username && !actual.password;
  } catch { return false; }
}

export function validateGoogleAuthorizationUrl(url: string, projectUrl: string | undefined, redirectTo: string) {
  try {
    const authorization = new URL(url);
    const project = new URL(projectUrl ?? "");
    if (authorization.origin !== project.origin || authorization.protocol !== "https:"
      || authorization.pathname !== "/auth/v1/authorize" || authorization.username || authorization.password
      || authorization.searchParams.get("provider") !== "google"
      || authorization.searchParams.get("redirect_to") !== redirectTo
      || !authorization.searchParams.get("code_challenge")
      || authorization.searchParams.get("code_challenge_method") !== "s256") throw new Error();
  } catch {
    throw new Error("O retorno do login Google está incorreto. A configuração de autenticação precisa ser verificada.");
  }
}
