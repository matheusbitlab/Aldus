// React lifecycle tests of production Auth components; Supabase/router/storage are controlled.
// Setup (test tools only, no application dependency):
// npm install --no-save --package-lock=false --ignore-scripts --prefix .expo/auth-test-tools react@19.2.3 react-test-renderer@19.2.3
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const testRequire = createRequire(path.resolve('.expo/auth-test-tools/package.json'));
const React = testRequire('react');
const { act, create } = testRequire('react-test-renderer');
assert.equal(testRequire('react/package.json').version, require('react/package.json').version, 'Test React must match the application');
global.IS_REACT_ACT_ENVIRONMENT = true;
const baseline = process.argv.includes('--baseline');
const uuid = '11111111-1111-4111-8111-111111111111';
const account = { id: uuid, username: 'reader_test', display_name: 'Test', avatar_url: null, role: 'user', account_status: 'active' };
const session = { user: { id: uuid } }; // Fixture only; never passed to the real service.
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const pause = () => new Promise(r => setTimeout(r, 5));

function harness(options = {}) {
  const modules = new Map(), storage = new Map(options.cache ? [[`@kindle/auth-profile.v1:${uuid}`, JSON.stringify(options.cache)]] : []), events = [], navigation = [];
  let currentSession = options.initialSession ?? null, callback, state;
  const client = {
    auth: {
      getSession: async () => ({ data: { session: currentSession }, error: null }),
      onAuthStateChange: fn => { callback = fn; return { data: { subscription: { unsubscribe() { callback = null; } } } }; },
      signInWithPassword: async () => {
        events.push('signIn');
        if (options.invalid) return { data: { session: null, user: null }, error: { code: 'invalid_credentials', status: 400 } };
        currentSession = session; callback?.('SIGNED_IN', session); events.push('SIGNED_IN');
        return { data: { session, user: session.user }, error: null };
      },
      signUp: async () => {
        events.push('signUp');
        return options.signupError ? { data: { session: null, user: null }, error: options.signupError }
          : { data: { session: null, user: { id: uuid } }, error: null };
      },
      signOut: async () => { currentSession = null; callback?.('SIGNED_OUT', null); return { error: null }; },
    },
    from: table => ({ select: () => ({ eq: () => table === 'profiles'
      ? { single: async () => options.profileGate ? options.profileGate.promise : options.profileError
        ? { data: null, error: { code: '42501', status: 403 } }
        : { data: options.profile ?? account, error: null } }
      : Promise.resolve({ data: [], error: null }) }) }),
  };
  const router = { replace: route => { navigation.push(route); if (options.routerError) throw new Error('CONTROLLED_ROUTER_FAILURE'); } };
  const form = Object.fromEntries(['AuthForm', 'AuthInput', 'AuthButton', 'AuthError', 'AuthLink', 'AuthLegalNotice'].map(key => [key, key]));
  const dependencies = {
    react: React, 'react/jsx-runtime': testRequire('react/jsx-runtime'),
    'react-native': { Platform: { OS: 'android' }, View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator' },
    'expo-router': { router, Redirect: 'Redirect' }, 'expo-linking': {},
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); }, removeItem: async key => { storage.delete(key); },
    },
    '@/src/data/remote/supabase': { supabase: client, requireSupabase: () => client },
    '@/src/presentation/contexts/AppThemeContext': { useAppTheme: () => ({ palette: {} }) },
    '@/src/presentation/components/AuthForm': form,
  };
  function load(file) {
    file = path.resolve(file);
    if (modules.has(file)) return modules.get(file);
    const exports = {}; modules.set(file, exports);
    const relative = path.relative(process.cwd(), file).replaceAll('\\','/');
    // Historical source is read in memory only; never restore/overwrite the worktree.
    const source = baseline && ['app/auth/login.tsx','app/auth/signup.tsx','src/data/remote/authService.ts','src/presentation/contexts/AuthContext.tsx','src/presentation/components/AuthGuard.tsx'].includes(relative)
      ? execFileSync('git',['show',`77c490c:${relative}`],{encoding:'utf8',windowsHide:true}) : fs.readFileSync(file,'utf8');
    const code = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    new Function('require', 'exports', 'process', 'console', code)(name => {
      if (name in dependencies) return dependencies[name];
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name);
        const alias = '@/' + path.relative(process.cwd(), base).replaceAll('\\', '/');
        if (alias in dependencies) return dependencies[alias];
        return load(['.ts', '.tsx', ''].map(ext => base + ext).find(candidate => fs.existsSync(candidate)));
      }
      return require(name);
    }, exports, { env: { EXPO_PUBLIC_AUTH_DIAGNOSTICS: options.diagnostics ? '1' : '0' } }, { info: (...args) => options.logs?.push(args) });
    return exports;
  }
  const auth = load('src/presentation/contexts/AuthContext.tsx');
  const { AuthGuard } = load('src/presentation/components/AuthGuard.tsx');
  const service = load('src/data/remote/authService.ts');
  const Screen = load(options.signup ? 'app/auth/signup.tsx' : 'app/auth/login.tsx').default;
  function Probe() { state = auth.useAuth(); return React.createElement(React.Fragment, null,
    React.createElement(Screen), React.createElement(AuthGuard, null, React.createElement('AuthorizedApp'))); }
  let tree;
  return {
    service, events, navigation, storage, client, load,
    state: () => state, currentSession: () => currentSession,
    async mount() { await act(async () => { tree = create(React.createElement(auth.AuthProvider, null, React.createElement(Probe))); await pause(); }); },
    async settle() { await act(async () => { await pause(); }); },
    async unmount() { await act(async () => { tree.unmount(); }); },
    async input(label, value) { await act(async () => { tree.root.findAllByType('AuthInput').find(n => n.props.label === label).props.onChangeText(value); }); },
    async press(title) { await act(async () => { tree.root.findAllByType('AuthButton').find(n => n.props.title === title).props.onPress(); await Promise.resolve(); }); },
    async logout() { await act(async () => { await state.signOut(); await pause(); }); },
    error: () => tree.root.findAllByType('AuthError').map(n => n.props.message).filter(Boolean).join('|'),
    allowed: () => tree.root.findAllByType('AuthorizedApp').length > 0,
    redirects: () => tree.root.findAllByType('Redirect').map(n => n.props.href),
    inputs: () => tree.root.findAllByType('AuthInput').length,
    titles: () => tree.root.findAllByType('AuthForm').map(n => n.props.title),
  };
}

async function login(h) { await h.input('Email ou nome de usuário', 'reader@example.invalid'); await h.input('Senha', 'synthetic-only'); await h.press('Entrar'); }
async function sdkContract() {
  const { createClient } = require('@supabase/supabase-js');
  let accept = false;
  const sequence = [];
  const user = { id:uuid, aud:'authenticated', role:'authenticated', email:'reader@example.invalid', app_metadata:{}, user_metadata:{}, created_at:new Date().toISOString() };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const access = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uuid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture-only`;
  const client = createClient('https://auth-fixture.invalid','fixture-public-key',{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{ fetch:async url => {
      const route = new URL(url).pathname;
      if (route.endsWith('/logout')) return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});
      assert.ok(route.endsWith('/token'));
      return new Response(JSON.stringify(accept
        ? {access_token:access,refresh_token:'fixture-only',token_type:'bearer',expires_in:3600,user}
        : {code:'invalid_credentials',error_code:'invalid_credentials',msg:'Invalid login credentials'}),{
        status:accept?200:400,headers:{'Content-Type':'application/json','X-Supabase-Api-Version':'2024-01-01'},
      });
    } },
  });
  const {data:listener}=client.auth.onAuthStateChange(event=>{sequence.push(event);});
  const credentials={email:'reader@example.invalid',password:'synthetic-only'};
  const first=await client.auth.signInWithPassword(credentials);
  assert.equal(first.error?.code,'invalid_credentials'); assert.equal(!!(await client.auth.getSession()).data.session,false);
  accept=true; const success=await client.auth.signInWithPassword(credentials); sequence.push('PROMISE_RESOLVED');
  assert.equal(!!success.error,false); assert.equal(success.data.user?.id,uuid);
  assert.ok(sequence.indexOf('SIGNED_IN')<sequence.indexOf('PROMISE_RESOLVED'));
  accept=false; const invalid=await client.auth.signInWithPassword(credentials);
  assert.equal(invalid.error?.code,'invalid_credentials'); assert.equal(!!invalid.data.session,false);
  assert.equal((await client.auth.getSession()).data.session?.user.id,uuid);
  assert.equal(sequence.filter(event=>event==='SIGNED_IN').length,1);
  await client.auth.signOut(); assert.equal(!!(await client.auth.getSession()).data.session,false);
  listener.subscription.unsubscribe();
  console.log('PASS installed Supabase SDK / controlled HTTP: invalid never creates session; SIGNED_IN precedes promise; prior session survives rejection; logout removes it');
}
async function run() {
  await sdkContract();
  let h = harness({ invalid: true }); await h.mount(); await login(h); await h.settle();
  assert.equal(h.allowed(), false); assert.equal(h.navigation.length, 0); assert.ok(h.error());
  await h.unmount(); console.log('PASS A: invalid sign-in, no session, no navigation/access');

  const gate = deferred(); h = harness({ profileGate: gate }); await h.mount(); await login(h); await h.settle();
  assert.equal(h.allowed(), false); assert.equal(h.state().loading, true);
  await act(async () => { gate.resolve({ data: account, error: null }); });
  assert.equal(h.allowed(), true); await h.logout(); assert.equal(h.allowed(), false); assert.equal(h.currentSession(), null);
  await h.unmount(); console.log('PASS B/logout: access only after auth + active profile; logout removes access');

  h = harness({ initialSession: session, invalid: true }); await h.mount();
  assert.equal(h.inputs(), 0); assert.ok(h.redirects().includes('/'));
  await assert.rejects(h.service.loginWithIdentifier('reader@example.invalid', 'synthetic-only'));
  assert.equal(h.currentSession(), session); assert.equal(h.navigation.length, 0);
  await h.unmount(); console.log('PASS C: restored session redirects before showing form; failed service attempt does not become success');

  h = harness({ profileError: true }); await h.mount(); await login(h); await h.settle();
  assert.equal(h.allowed(), false); assert.match(h.state().error, /perfil/i); assert.equal(h.error(), '');
  await h.unmount(); console.log('PASS D: profile failure blocks access and is not a credential error');

  const delayed = deferred(); h = harness({ routerError: true, profileGate: delayed }); await h.mount(); await login(h); await h.settle();
  assert.equal(h.allowed(), false);
  if (baseline) assert.equal(h.error(), 'CONTROLLED_ROUTER_FAILURE');
  else { assert.match(h.error(), /autenticação.*concluída/i); assert.doesNotMatch(h.error(), /CONTROLLED_ROUTER_FAILURE/); }
  await act(async () => { delayed.resolve({ data: account, error: null }); });
  assert.equal(h.allowed(), true); assert.ok(h.redirects().includes('/'));
  await h.unmount(); console.log(baseline ? 'REPRODUCED E: navigation exception shown as login error; authorized profile then redirects' : 'PASS E: navigation failure distinguished from successful authentication');

  h = harness({ signup: true }); await h.mount();
  for (const [label, value] of [['Nome','Test'],['Nome de usuário','reader_test'],['Email','reader@example.invalid'],['Senha','synthetic-only'],['Confirmar senha','synthetic-only']]) await h.input(label,value);
  await h.press('Criar conta'); assert.ok(h.titles().includes('Verifique seu email')); assert.equal(h.allowed(), false);
  await h.unmount(); console.log('PASS signup: valid local fields reach confirmation, without granting access');

  for (const [code,status] of [['weak_password',422],['unexpected_failure',500],['over_email_send_rate_limit',429],['user_already_exists',422]]) {
    h = harness({ signupError: { code, status, message: 'PRIVATE_BACKEND_DETAIL' } });
    const error = await h.service.registerAccount('Test','reader_test','reader@example.invalid','synthetic-only').then(() => null, e => e);
    assert.ok(error); assert.doesNotMatch(error.message,/PRIVATE_BACKEND_DETAIL/);
    if (baseline) assert.equal(error.code, undefined);
    else { assert.equal(error.code, code); assert.equal(error.status, status); if(code !== 'weak_password') assert.doesNotMatch(error.message,/senha/i); }
  }
  console.log(baseline ? 'REPRODUCED signup: distinct backend codes/status discarded' : 'PASS signup: sanitized categories preserve backend code/status; non-password errors do not blame password');
  if (!baseline) {
    h = harness(); const { AuthOperationError, authFailureDetails } = h.load('src/data/remote/authErrors.ts');
    const error = new AuthOperationError('signup', { name:'AuthRetryableFetchError', message:'PRIVATE_BACKEND_DETAIL' });
    assert.equal(authFailureDetails(error).category,'network'); assert.match(error.message,/conexão/);
  }

  for (const [username,email,password,pattern] of [
    ['ab','reader@example.invalid','synthetic-only',/3 a 24/],
    ['reader_test','invalid-email','synthetic-only',/email válido/],
    ['reader_test','reader@example.invalid','short',/8 caracteres/],
  ]) {
    h = harness();
    await assert.rejects(h.service.registerAccount('Test',username,email,password), pattern);
    assert.equal(h.events.includes('signUp'), false);
  }
  h = harness({ signup: true }); await h.mount();
  await h.input('Nome','Test'); await h.input('Senha','synthetic-only'); await h.input('Confirmar senha','different-fixture');
  await h.press('Criar conta'); assert.match(h.error(),/não coincidem/); assert.equal(h.events.includes('signUp'),false); await h.unmount();
  console.log('PASS local validation: username/email/short password/confirmation rejected at the right stage');

  for (const profile of [{ ...account, account_status:'disabled' }, { ...account, username:null }]) {
    h = harness({ initialSession:session, profile }); await h.mount(); assert.equal(h.allowed(),false); await h.unmount();
  }
  h = harness({ cache: { profile:account, overrides:{} } }); await h.mount(); assert.equal(h.allowed(),false); await h.unmount();
  h = harness({ initialSession:session, profileError:true, cache:{profile:account,overrides:{}} });
  await h.mount(); assert.equal(h.allowed(),true); await h.logout(); assert.equal(h.allowed(),false); await h.unmount();
  h = harness({ initialSession:session, profileError:true, cache:{profile:{...account,id:'another-user'},overrides:{}} });
  await h.mount(); assert.equal(h.allowed(),false); await h.unmount();
  console.log('PASS access boundaries: disabled/incomplete profile, cache alone and foreign cache blocked; same-user offline behavior preserved');

  if (!baseline) {
    const logs = []; h = harness({ diagnostics:true, logs });
    await h.mount(); await login(h); await h.settle(); await h.logout(); await h.unmount();
    const records = logs.map(args => JSON.parse(args[1]));
    for (const event of ['LOGIN_ATTEMPT_STARTED','SIGN_IN_RESULT','AUTH_EVENT','PROFILE_RESOLUTION','AUTH_GUARD_DECISION','LOGIN_UI_RESULT']) assert.ok(records.some(r=>r.event===event),event);
    assert.ok(records.some(r=>r.event==='AUTH_GUARD_DECISION' && r.decision==='allowed'));
    assert.ok(records.some(r=>r.event==='AUTH_GUARD_DECISION' && r.decision==='blocked'));
    const diagnostics = h.load('src/utils/authDiagnostics.ts');
    const marker = 'PRIVATE_CANARY_credential_or_backend_content';
    diagnostics.authDiagnostic('SIGN_IN_RESULT',{ operationId:marker, uuid:marker, previousUuid:marker, code:marker, category:marker, authEvent:marker, message:marker, password:marker, session:{access_token:marker}, status:NaN });
    diagnostics.authDiagnostic(marker,{session:true});
    const output = JSON.stringify(logs);
    assert.ok(!output.includes(marker)); assert.ok(!output.includes('synthetic-only')); assert.ok(!output.includes('reader@example.invalid'));
    const disabledLogs=[]; h=harness({logs:disabledLogs}); const off=h.load('src/utils/authDiagnostics.ts'); off.authDiagnostic('AUTH_EVENT',{session:true}); assert.equal(disabledLogs.length,0);
    const signupLogs=[]; h=harness({signup:true,diagnostics:true,logs:signupLogs,signupError:{code:'unexpected_failure',status:500,message:marker}});
    await h.mount();
    for (const [label,value] of [['Nome','Test'],['Nome de usuário','reader_test'],['Email','reader@example.invalid'],['Senha','synthetic-only'],['Confirmar senha','synthetic-only']]) await h.input(label,value);
    await h.press('Criar conta'); assert.equal(h.allowed(),false); assert.doesNotMatch(h.error(),/senha/i); await h.unmount();
    const signupRecords=signupLogs.map(args=>JSON.parse(args[1]));
    assert.ok(signupRecords.some(r=>r.event==='SIGNUP_STARTED' && r.confirmationMatches===true && typeof r.passwordLength==='number'));
    assert.ok(signupRecords.some(r=>r.event==='SUPABASE_SIGNUP_RESULT' && r.code==='unexpected_failure' && r.status===500 && r.category==='backend'));
    assert.ok(!JSON.stringify(signupLogs).includes(marker));
    console.log('PASS diagnostics: opt-in timeline, strict serialization, no raw input/error/session fields');

    const migration=fs.readFileSync('supabase/migrations/202610060001_profiles_and_features.sql','utf8');
    assert.match(migration,/references auth\.users\(id\)/);
    assert.match(migration,/grant update \(username, display_name, avatar_url\) on public\.profiles to authenticated/);
    assert.match(migration,/'user', 'active'/);
    assert.match(migration,/revoke all on public\.user_feature_overrides from public, anon, authenticated/);
    assert.doesNotMatch(migration,/using\s*\(\s*true\s*\)/i);
    console.log('PASS static migration contract: identity FK, default user, no client role/status/override writes; live RLS NOT TESTED');
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
