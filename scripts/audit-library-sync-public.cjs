// Read-only contract probe. No user session, RPC invocation or private rows.
const fs = require('node:fs');
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (!base || !key || !/^https:\/\//.test(base)) throw new Error('Configuração pública Supabase ausente.');
if (!key.startsWith('sb_publishable_')) {
  let role;
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch {}
  if (role !== 'anon') throw new Error('Esta sonda aceita somente chave pública anon/publishable.');
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
(async () => {
  for (const [label, path] of [
    ['profiles_control', '/rest/v1/profiles?select=id&limit=0'],
    ['library_items', '/rest/v1/user_library_items?select=user_id,kind,id,book_id,payload,revision,updated_at,deleted_at&limit=0'],
    ['library_operations', '/rest/v1/user_library_operations?select=user_id,operation_id,request,response,created_at&limit=0'],
    ['private_bucket_visibility', '/storage/v1/bucket/aldus-private-library'],
  ]) {
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}${path}`, { headers, signal: AbortSignal.timeout(20000) });
      const body = await response.json().catch(() => ({}));
      const code = typeof body?.code === 'string' ? body.code : typeof body?.error === 'string' ? body.error : null;
      console.log(JSON.stringify({ label, status: response.status, code, checkedAt: new Date().toISOString() }));
      if (code === 'PGRST205') process.exitCode = 2;
    } catch (error) {
      console.log(JSON.stringify({ label, status: 'NETWORK_ERROR', code: error?.cause?.code || error?.name || 'unknown' }));
      process.exitCode = 3;
    }
  }
  console.log('Read-only public probe: no rows/RPC/SQL/writes. Bucket visibility does not prove absence; admin inventory and authenticated A/B tests are still required.');
})().catch(()=>{console.error('Falha na sonda pública. Nenhuma mutação realizada.');process.exitCode=1;});
