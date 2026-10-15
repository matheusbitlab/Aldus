// Public-key authorization probes only. No valid mutation IDs, sessions or user content.
const fs = require('node:fs');
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const base = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (new URL(base).origin !== 'https://cmivracxuihtmsbmtuec.supabase.co') throw Error('Unexpected project.');
if (!key?.startsWith('sb_publishable_')) {
  let role; try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role; } catch {}
  if (role !== 'anon') throw Error('Only public anon/publishable keys are allowed.');
}
(async () => {
  for (const [rpc, payload, expectedBoolean] of [
    ['flashcard_battle', { action: 'get', payload: {} }],
    // Null operation/book/entity IDs cannot form a valid operation, even if ACLs drifted.
    ['library_apply', { p_operation_id: null, p_book_id: null, p_kind: null, p_entity_id: null, p_expected_revision: null, p_payload: null, p_deleted: null }],
    ['library_object_allowed', { p_name: '00000000-0000-4000-8000-000000000000/probe/' + '0'.repeat(64) + '.epub', p_upload: false }, false],
  ]) {
    const response = await fetch(base + '/rest/v1/rpc/' + rpc, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => null);
    const expected = expectedBoolean === false ? response.ok && body === false : [401, 403].includes(response.status) && body?.code === '42501';
    console.log(JSON.stringify({ rpc, status: response.status, code: typeof body?.code === 'string' ? body.code : null,
      booleanResult: typeof body === 'boolean' ? body : null, anonymousContract: expected ? 'PASS' : 'INCONCLUSIVE_OR_DRIFT', checkedAt: new Date().toISOString() }));
    if (!expected) process.exitCode = 2;
  }
})().catch(() => { console.error('Anonymous probe failed; no credentials or response content logged.'); process.exitCode = 1; });
