const assert = require('node:assert/strict');
const { loader } = require('./library-test-utils.cjs');
const { createUsernameLoginHandler, createRedisLimiter, LIMIT_SCRIPT } = loader()('supabase/functions/username-login/handler.ts');
const envValues = { SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'SERVER_SECRET_CANARY', SUPABASE_ANON_KEY: 'public',
  UPSTASH_REDIS_REST_URL: 'https://redis.invalid', UPSTASH_REDIS_REST_TOKEN: 'REDIS_SECRET_CANARY', USERNAME_LOGIN_HMAC_KEY: 'hmac-canary-'.repeat(4) };
const env = name => envValues[name];
const req = (body = { username: 'Reader', password: 'correct' }, extra = {}) => new Request('https://example.invalid/username-login', {
  method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body),
});
function harness(state = {}, limit = async () => ({ allowed: true, retryAfter: 0 })) {
  const calls = [];
  const factory = (_url, key) => ({
    from: () => ({ select: () => ({ eq: (field, value) => ({ maybeSingle: async () => {
      calls.push(['profile', field, value]);
      return { data: state.unknown ? null : { id: 'a', account_status: state.disabled || (field === 'id' && state.disabledLater) ? 'disabled' : 'active' }, error: null };
    } }) }) }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'private@example.invalid' } }, error: null }) },
      signInWithPassword: async payload => {
        calls.push(['password', payload.email, key]);
        return { data: { session: payload.password === 'correct' && !state.wrong ? { user: { id: state.wrongOwner ? 'b' : 'a' }, access_token: 'fixture-access', refresh_token: 'fixture-refresh' } : null }, error: null };
      } },
  });
  return { calls, handle: createUsernameLoginHandler(factory, env, limit) };
}
(async () => {
  const happy = harness(), success = await happy.handle(req());
  assert.equal(success.status, 200); assert.equal(success.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await success.json(), { access_token: 'fixture-access', refresh_token: 'fixture-refresh' });
  assert.equal(happy.calls.filter(c => c[0] === 'password')[0][2], 'public');
  const failures = [];
  for (const state of [{ wrong: true }, { unknown: true }, { disabled: true }, { disabledLater: true }, { wrongOwner: true }]) {
    const h = harness(state), result = await h.handle(req());
    assert.equal(result.status, 401); failures.push(await result.text());
    assert.equal(h.calls.filter(c => c[0] === 'password').length, 1);
  }
  assert.equal(new Set(failures).size, 1, 'Missing, disabled and wrong-password errors must be indistinguishable');
  for (const body of ['{', 'null', '[]', { username: 'a', password: 'correct' }, { username: 'reader', password: 'a'.repeat(1025) }, ' '.repeat(9000)]) {
    const h = harness(); assert.equal((await h.handle(req(body))).status, 401); assert.equal(h.calls.length, 0);
  }
  const unavailable = harness({}, async () => { throw Error('SECRET'); });
  const down = await unavailable.handle(req()); assert.equal(down.status, 503); assert.equal(unavailable.calls.length, 0); assert.doesNotMatch(await down.text(), /SECRET/);
  const blocked = harness({}, async () => ({ allowed: false, retryAfter: 900 }));
  const denied = await blocked.handle(req()); assert.equal(denied.status, 429); assert.equal(denied.headers.get('retry-after'), '900'); assert.equal(blocked.calls.length, 0);
  assert.equal((await happy.handle(new Request('https://x.invalid', { method: 'OPTIONS' }))).status, 200);
  assert.equal((await happy.handle(new Request('https://x.invalid'))).status, 405);

  // REST boundary fixtures share one server-side state across independent limiter instances.
  // This verifies contracts/concurrency, not deployment or a real Redis engine.
  const counters = new Map(), commands = [];
  const redis = async (_url, init) => {
    const cmd = JSON.parse(init.body); commands.push(cmd);
    assert.equal(cmd[0], 'EVAL'); assert.equal(cmd[1], LIMIT_SCRIPT); assert.equal(cmd[2], '3');
    let retry = 0;
    for (let i = 0; i < 3; i++) {
      const key = cmd[3 + i], n = (counters.get(key) || 0) + 1; counters.set(key, n);
      if (n > Number(cmd[6 + i * 2])) retry = Math.max(retry, Number(cmd[7 + i * 2]));
    }
    return Response.json({ result: [retry ? 0 : 1, retry] });
  };
  const workers = Array.from({ length: 4 }, () => createRedisLimiter(env, redis));
  const attempts = await Promise.all(Array.from({ length: 24 }, (_, i) => workers[i % 4]('reader', `spoof-${i}`)));
  assert.equal(attempts.filter(r => r.allowed).length, 8, 'Rotating network addresses cannot bypass the account limit');
  assert.equal(new Set(commands.map(c => c[5])).size, 1);
  assert.doesNotMatch(JSON.stringify(commands), /reader|spoof-|private@example|correct|SERVER_SECRET_CANARY|REDIS_SECRET_CANARY/);
  for (const response of [Response.json({ result: [1] }), Response.json({ result: [0, 0] }), Response.json({ error: 'failure' }), new Response('', { status: 500 })]) {
    await assert.rejects(() => createRedisLimiter(env, async () => response)('reader', 'network'));
  }
  await assert.rejects(() => createRedisLimiter(name => name === 'USERNAME_LOGIN_HMAC_KEY' ? undefined : env(name), redis)('reader', 'network'));
  // Installed SDK at the client boundary: invoke -> setSession -> user resolution -> SIGNED_IN.
  const { createClient } = require('@supabase/supabase-js');
  const uid = '11111111-1111-4111-8111-111111111111', requests = [], events = [];
  const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const access = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: uid, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })}.fixture-only`;
  let accept = true;
  const client = createClient('https://username-fixture.invalid', 'sb_publishable_fixture', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.url); requests.push(url.pathname);
      if (url.pathname.endsWith('/functions/v1/username-login')) {
        assert.deepEqual(JSON.parse(init.body), { username: 'reader', password: 'synthetic-only' });
        return Response.json(accept ? { access_token: access, refresh_token: 'fixture-refresh' } : { error: 'Credenciais inválidas.' }, { status: accept ? 200 : 401 });
      }
      assert.equal(url.pathname, '/auth/v1/user'); return Response.json(user);
    } },
  });
  const listener = client.auth.onAuthStateChange(event => events.push(event));
  const service = loader({ './supabase': { requireSupabase: () => client }, 'react-native': { Platform: { OS: 'web' } }, 'expo-linking': {},
    '@/src/utils/authDiagnostics': { authDiagnostic() {}, finishAuthDiagnostic() {} }, '@/src/utils/authOAuthDiagnostics': {} })('src/data/remote/authService.ts');
  await service.loginWithIdentifier(' Reader ', 'synthetic-only');
  assert.equal((await client.auth.getSession()).data.session.user.id, uid); assert.ok(events.includes('SIGNED_IN'));
  assert.ok(requests.includes('/auth/v1/user')); accept = false;
  const signedIn = events.filter(e => e === 'SIGNED_IN').length;
  await assert.rejects(() => service.loginWithIdentifier('reader', 'synthetic-only'), /Não foi possível entrar/);
  assert.equal(events.filter(e => e === 'SIGNED_IN').length, signedIn);
  listener.data.subscription.unsubscribe(); await client.auth.signOut({ scope: 'local' });
  console.log('PASS installed Supabase SDK / controlled HTTP: username function invocation establishes correct session; invalid credentials do not emit SIGNED_IN.');
  console.log('PASS username login: generic failures, active profile recheck, bounded body, fail-closed limiter, atomic REST contract, cross-worker/account limits and secret canaries. Redis/Auth remote NOT tested.');
})().catch(error => { console.error(error); process.exitCode = 1; });
