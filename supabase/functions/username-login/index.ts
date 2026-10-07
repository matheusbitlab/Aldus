import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const headers = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
};
const invalid = () => new Response(JSON.stringify({ error: "Credenciais inválidas." }), { status: 401, headers });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return new Response(null, { status: 405, headers });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const published = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? (published ? JSON.parse(published).default : null);
  if (!url || !serviceKey || !publicKey) return new Response(JSON.stringify({ error: "Serviço indisponível." }), { status: 503, headers });
  let body: { username?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return invalid(); }
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(username) || !password || password.length > 1024) return invalid();

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("id,account_status").eq("username", username).maybeSingle();
    if (profileError || !profile || profile.account_status !== "active") return invalid();
    const { data: user, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError || !user.user?.email) return invalid();
    const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: user.user.email, password });
    if (error || !data.session) return invalid();
    return new Response(JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }), { headers });
  } catch {
    return invalid();
  }
});
