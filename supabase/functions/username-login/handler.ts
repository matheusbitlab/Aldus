// Server-only. No per-isolate counters: all instances share an atomic Redis decision.
type Env = (name: string) => string | undefined;
type ClientFactory = (url: string, key: string, options: { auth: { persistSession: boolean; autoRefreshToken: boolean } }) => any;
const headers = {
  "content-type": "application/json", "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS", "access-control-expose-headers": "Retry-After",
  "cache-control": "no-store", "x-content-type-options": "nosniff",
};
const reply = (status: number, error: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error }), { status, headers: { ...headers, ...extra } });
const invalid = () => reply(401, "Credenciais inválidas.");
const unavailable = () => reply(503, "Serviço indisponível. Tente novamente mais tarde.");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
// One Lua execution serializes all buckets across concurrent Edge workers. TTLs bound storage.
export const LIMIT_SCRIPT = `local retry = 0
for i, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  local ttl = tonumber(ARGV[i * 2])
  if count == 1 or redis.call('TTL', key) < 0 then redis.call('EXPIRE', key, ttl) end
  if count > tonumber(ARGV[i * 2 - 1]) then retry = math.max(retry, 1, redis.call('TTL', key)) end
end
return {retry == 0 and 1 or 0, retry}`;

export function createRedisLimiter(env: Env, request: typeof fetch = fetch) {
  return async (username: string, network: string) => {
    const endpoint = new URL(env("UPSTASH_REDIS_REST_URL") ?? "");
    const token = env("UPSTASH_REDIS_REST_TOKEN"), secret = env("USERNAME_LOGIN_HMAC_KEY");
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.pathname !== "/"
      || endpoint.search || endpoint.hash || !token || !secret || secret.length < 32) throw new Error("limiter unavailable");
    const hmac = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(value))))
      .map((v) => v.toString(16).padStart(2, "0")).join("");
    const prefix = "{aldus-username-login}:";
    const keys = [prefix + "global", prefix + await digest("network:" + network), prefix + await digest("username:" + username)];
    const response = await request(endpoint, { method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(["EVAL", LIMIT_SCRIPT, "3", ...keys, "300", "60", "30", "60", "8", "900"]) });
    if (!response.ok) throw new Error("limiter unavailable");
    const body = await response.json();
    if (body.error || !Array.isArray(body.result) || body.result.length !== 2
      || ![0, 1].includes(body.result[0]) || !Number.isInteger(body.result[1]) || body.result[1] < 0 || body.result[1] > 900
      || (body.result[0] === 0 && body.result[1] === 0)) throw new Error("limiter unavailable");
    return { allowed: body.result[0] === 1, retryAfter: body.result[1] };
  };
}

async function readBody(request: Request): Promise<{ username?: unknown; password?: unknown }> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error();
  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length < 0 || length > 8192 || !request.body) throw new Error();
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  return body;
}

export function createUsernameLoginHandler(createClient: ClientFactory, env: Env,
  limit = createRedisLimiter(env)) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, allow: "POST, OPTIONS" } });
    let body;
    try { body = await readBody(request); } catch { return invalid(); }
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z][a-z0-9_]{2,23}$/.test(username) || !password || password.length > 1024) return invalid();
    try {
      // Forwarded headers are supplemental; account/global limits cannot be bypassed by spoofing IP.
      const network = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim().slice(0, 128);
      const decision = await limit(username, network);
      if (!decision.allowed) return reply(429, "Muitas tentativas. Aguarde antes de tentar novamente.", { "retry-after": String(decision.retryAfter) });
    } catch { return unavailable(); }
    try {
      const url = env("SUPABASE_URL"), serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
      const published = env("SUPABASE_PUBLISHABLE_KEYS");
      const publicKey = env("SUPABASE_ANON_KEY") ?? (published ? JSON.parse(published).default : undefined);
      if (!url || !serviceKey || !publicKey) return unavailable();
      const admin = createClient(url, serviceKey, options);
      const { data: profile, error: profileError } = await admin.from("profiles")
        .select("id,account_status").eq("username", username).maybeSingle();
      if (profileError) return unavailable();
      const eligible = profile?.account_status === "active";
      const user = eligible ? await admin.auth.admin.getUserById(profile.id) : null;
      if (user?.error) return unavailable();
      // Also attempt password auth for unknown/disabled usernames. Never disclose email or status.
      const email = user?.data?.user?.email ?? "username-login-unresolved@invalid.invalid";
      const auth = createClient(url, publicKey, options);
      const { data, error } = await auth.auth.signInWithPassword({ email, password });
      if (!eligible || error || !data.session || data.session.user?.id !== profile.id) return invalid();
      const fresh = await admin.from("profiles").select("id,account_status").eq("id", profile.id).maybeSingle();
      if (fresh.error) return unavailable();
      if (fresh.data?.id !== profile.id || fresh.data.account_status !== "active") return invalid();
      return new Response(JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }), { headers });
    } catch { return unavailable(); }
  };
}
