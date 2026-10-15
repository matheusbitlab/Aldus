// Build-time only; values are never printed. This must run before Expo embeds EXPO_PUBLIC_*.
function validate(env) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL, key = env.EXPO_PUBLIC_SUPABASE_KEY;
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('EXPO_PUBLIC_') || !value) continue;
    let role; try { role = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role; } catch {}
    if (/SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|REDIS.*TOKEN|VERCEL_TOKEN/i.test(name) || /-----BEGIN .*PRIVATE KEY-----|^sb_secret_/.test(value) || role === 'service_role') throw Error('A secret was configured as a public variable. Remove it and rotate if exposed.');
  }
  if (!url && !key && !env.VERCEL) return;
  if (!url || !key) throw Error('Configure both public Supabase variables before building.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) throw Error('Invalid public Supabase URL.');
  if (!key.startsWith('sb_publishable_')) {
    let role; try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch {}
    if (role !== 'anon') throw Error('Only anon/publishable keys may be embedded in the app.');
  }
  if (env.VERCEL_ENV === 'production' && (!env.EXPO_PUBLIC_LEGAL_CONTROLLER_NAME?.trim()
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL ?? ''))) throw Error('Production requires verified legal controller and contact configuration.');
}
module.exports = { validate };
if (require.main === module) {
  const fs = require('node:fs');
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
  try { validate(process.env); console.log('PASS public Web configuration (values redacted).'); }
  catch { console.error('Invalid or unsafe public Web configuration. Check Supabase/public-only keys and production legal identity. No values logged.'); process.exitCode = 1; }
}
