const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const testRequire = createRequire(path.resolve('.expo/auth-test-tools/package.json'));
const React = testRequire('react');
const { act, create } = testRequire('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const baseline = process.argv.includes('--baseline');
function loader(mocks, environment = {}, logs) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = baseline && ['app/auth/callback.tsx', 'src/data/remote/authService.ts'].includes(file)
      ? execFileSync('git', ['show', `77c490c:${file}`], { encoding: 'utf8', windowsHide: true }) : fs.readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX } }).outputText;
    new Function('require','exports','process','console',code)(name => {
      if (name in mocks) return mocks[name];
      const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file),name);
      if ('@/'+base in mocks) return mocks['@/'+base];
      const target = ['.ts','.tsx',''].map(ext=>base+ext).find(candidate=>fs.existsSync(candidate));
      return target ? load(target) : require(name);
    },exports,{env:environment},{...console,info:(...args)=>logs?.push(args)});
    return exports;
  };
}
(async()=>{
  const previousWindow=global.window;
  // React Native exposes window without browser location. Native must never read location.
  global.window={};
  try {
  let resolve, calls=0, params={code:'fixture-code'}, urls=[], nextError=null, linkedUrl='aldus://auth/callback?code=fixture-code';
  let nativeSnapshot={ready:true,url:linkedUrl};
  const gate=new Promise(r=>resolve=r);
  const client={auth:{exchangeCodeForSession:()=>{calls++;return gate;},resetPasswordForEmail:async(email,options)=>{urls.push(options.redirectTo);return {error:nextError};}}};
  const load=loader({react:React,'react/jsx-runtime':testRequire('react/jsx-runtime'),
    'react-native':{Platform:{OS:'android'},Text:'Text',ActivityIndicator:'Spinner'},
    'expo-linking':{useURL:()=>linkedUrl},'expo-router':{useLocalSearchParams:()=>params,router:{replace:url=>urls.push(url)}},
    '@/src/data/remote/nativeAuthCallback':{nativeAuthCallbacks:{reset(){},subscribe:()=>()=>{},snapshot:()=>{if(nativeSnapshot.url!==linkedUrl)nativeSnapshot={ready:true,url:linkedUrl};return nativeSnapshot;}}},
    '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette:{}})},
    '@/src/presentation/components/AuthForm':{AuthForm:'Form',AuthLink:'Link'},
    '@/src/data/remote/supabase':{requireSupabase:()=>client}});
  const service=load('src/data/remote/authService.ts');
  const Screen=load('app/auth/callback.tsx').default;
  let tree;
  await act(async()=>{tree=create(React.createElement(Screen));});
  params={...params,next:'reset-password'};
  linkedUrl='aldus://auth/callback?code=fixture-code&next=reset-password';
  await act(async()=>{tree.update(React.createElement(Screen));});
  await act(async()=>{resolve({data:{session:{access_token:'fixture-only',refresh_token:'fixture-only',user:{id:'11111111-1111-4111-8111-111111111111'}}},error:null});await gate;});
  assert.equal(calls,1);
  if(baseline){assert.deepEqual(urls,[]);console.log('REPRODUCED baseline: effect cleanup + code ref leaves callback without navigation');}
  else {assert.deepEqual(urls,['/auth/reset-password']);console.log('PASS callback effect update: same exchange, recovery navigation completes');}
  await act(async()=>{tree.unmount();});
  params={error:'server_error',error_description:'PRIVATE_CANARY_authorization_code'};
  linkedUrl='aldus://auth/callback?error=server_error&error_description=PRIVATE_CANARY_authorization_code';
  await act(async()=>{tree=create(React.createElement(Screen));});
  const output=JSON.stringify(tree.toJSON());
  if(baseline) {assert.ok(output.includes('PRIVATE_CANARY'));console.log('REPRODUCED baseline: raw OAuth description exposed');}
  else {assert.ok(!output.includes('PRIVATE_CANARY'));console.log('PASS callback errors: no raw OAuth content');}
  await act(async()=>{tree.unmount();});
  nextError={code:'unexpected_failure',status:500};
  if(baseline){await service.sendRecoveryEmail('fixture@example.invalid');console.log('REPRODUCED baseline: recovery SDK refusal silently accepted');}
  else await assert.rejects(service.sendRecoveryEmail('fixture@example.invalid'),/recuperação agora/);
  assert.equal(urls.at(-1),'aldus://auth/callback?next=reset-password');
  if(!baseline){
    const {readAuthCallback}=load('src/data/remote/authCallback.ts');
    assert.deepEqual(readAuthCallback('aldus://auth/callback?next=reset-password#code=fixture').next,'reset-password');
    assert.equal(readAuthCallback('aldus://auth/callback#error_description=Unable+to+exchange+external+code').error_description,'Unable to exchange external code');
    // Remount/same code observes the settled operation instead of consuming it again.
    await service.exchangeCallbackCode('fixture-code');assert.equal(calls,1);
    console.log('PASS recovery exact URL, query/fragment parser, transport failure and bounded same-code exchange');
    linkedUrl='http://localhost/auth/callback?code=PRIVATE_CANARY';params={code:'PRIVATE_CANARY'};
    await act(async()=>{tree=create(React.createElement(Screen));});
    assert.equal(calls,1);assert.match(JSON.stringify(tree.toJSON()),/não pertence/);assert.ok(!JSON.stringify(tree.toJSON()).includes('PRIVATE_CANARY'));
    await act(async()=>tree.unmount());
    linkedUrl='aldus://auth/callback#error=access_denied';params={error:'access_denied'};
    await act(async()=>{tree=create(React.createElement(Screen));});
    assert.equal(calls,1);assert.match(JSON.stringify(tree.toJSON()),/cancelada/);await act(async()=>tree.unmount());
    const providerFailure='500: Unable to exchange external code: PRIVATE_CANARY_provider_detail';
    linkedUrl='aldus://auth/callback#error=access_denied&error_description='+encodeURIComponent(providerFailure);
    params={error:'access_denied',error_description:providerFailure};
    await act(async()=>{tree=create(React.createElement(Screen));});
    const providerMessage=JSON.stringify(tree.toJSON());
    assert.equal(calls,1,'A provider error must never attempt PKCE code exchange');
    assert.match(providerMessage,/configuração do provedor/,'A provider exchange failure is not user cancellation');
    assert.doesNotMatch(providerMessage,/cancelada|PRIVATE_CANARY|Unable to exchange/);
    await act(async()=>tree.unmount());
    linkedUrl=null;params={code:'PRIVATE_CANARY_route_without_origin'};
    await act(async()=>{tree=create(React.createElement(Screen));});
    assert.equal(calls,1,'Native route parameters alone cannot exchange an authorization code');
    assert.match(JSON.stringify(tree.toJSON()),/inválido ou expirado/);assert.ok(!JSON.stringify(tree.toJSON()).includes('PRIVATE_CANARY'));
    await act(async()=>tree.unmount());
    console.log('PASS Native rejects HTTP/localhost callback before exchange; cancellation remains a sanitized separate outcome');
    await redirectContract();
    console.log('PASS React Native window without location: callback/recovery/login Google and real callback component never read browser origin');
  }
  } finally {if(previousWindow===undefined)delete global.window;else global.window=previousWindow;}
})().catch(e=>{console.error(e);process.exitCode=1;});

async function redirectContract() {
  const {createClient}=require('@supabase/supabase-js');
  const project='https://cmivracxuihtmsbmtuec.supabase.co', platform={OS:'android'}, logs=[], opened=[], requests=[];
  const sdk=createClient(project,'fixture-public-key',{auth:{storage:undefined,persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce'}});
  let gate=null, override=null, exchangeResult={data:{session:{access_token:'fixture-only',refresh_token:'fixture-only',user:{id:'11111111-1111-4111-8111-111111111111'}}},error:null};
  const successResult=exchangeResult;
  const client={auth:{
    signInWithOAuth:async options=>{requests.push(options);if(gate)await gate;return override??sdk.auth.signInWithOAuth(options);},
    exchangeCodeForSession:async()=>exchangeResult,
  }};
  const load=loader({'react-native':{Platform:platform,AppState:{currentState:'active'}},'expo-linking':{openURL:async url=>opened.push(url)},
    '@/src/data/remote/supabase':{requireSupabase:()=>client}},
    {EXPO_PUBLIC_SUPABASE_URL:project,EXPO_PUBLIC_AUTH_DIAGNOSTICS:'1'},logs);
  const service=load('src/data/remote/authService.ts'),redirect=load('src/data/remote/authRedirect.ts');
  const {authUrlDiagnosticFields}=load('src/utils/authOAuthDiagnostics.ts');
  assert.equal(service.authCallbackUrl(),'aldus://auth/callback');
  assert.equal(service.authCallbackUrl('reset-password'),'aldus://auth/callback?next=reset-password');
  await service.loginWithGoogle();
  assert.equal(requests.at(-1).options.redirectTo,'aldus://auth/callback');assert.equal(requests.at(-1).options.skipBrowserRedirect,true);
  assert.equal(opened.length,1);
  const actual=new URL(opened[0]);assert.equal(actual.searchParams.get('redirect_to'),'aldus://auth/callback');assert.equal(actual.searchParams.get('code_challenge_method'),'s256');
  assert.equal(redirect.isExpectedAuthCallback('http://localhost/auth/callback?code=PRIVATE_CANARY','android'),false);
  assert.equal(redirect.isExpectedAuthCallback('aldus://auth/callback?code=PRIVATE_CANARY','android'),true);
  assert.equal(redirect.isExpectedAuthCallback('aldus://auth/other?code=PRIVATE_CANARY','android'),false);
  override={data:{url:project+'/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost&code_challenge=fixture&code_challenge_method=s256'},error:null};
  await assert.rejects(service.loginWithGoogle(),/retorno.*incorreto/);assert.equal(opened.length,1);override=null;
  await service.exchangeCallbackCode('PRIVATE_CANARY_code');
  await service.loginWithGoogle();await assert.rejects(service.exchangeCallbackCode('PRIVATE_CANARY_code'),/tentativa anterior/);
  let finish;exchangeResult=new Promise(resolve=>finish=resolve);const pending=service.exchangeCallbackCode('PRIVATE_CANARY_pending');
  await assert.rejects(service.loginWithGoogle(),/anterior.*concluída/);finish(successResult);await pending;
  exchangeResult={data:{session:null},error:null};await assert.rejects(service.exchangeCallbackCode('PRIVATE_CANARY_no_session'),/inválido/);
  // A slow previous authorize response must not open a second browser after a newer attempt.
  let release;gate=new Promise(resolve=>release=resolve);const old=service.loginWithGoogle();gate=null;await service.loginWithGoogle();const count=opened.length;release();await old;assert.equal(opened.length,count);
  let reject;gate=new Promise((resolve,fail)=>reject=fail);const oldFailure=service.loginWithGoogle();gate=null;await service.loginWithGoogle();const countAfterNew=opened.length,logsAfterNew=logs.length;
  reject(new Error('PRIVATE_CANARY_transport'));await oldFailure;assert.equal(opened.length,countAfterNew);assert.equal(logs.length,logsAfterNew);
  const savedWindow=global.window;
  try {
    platform.OS='web';delete global.window;assert.throws(()=>service.authCallbackUrl(),/navegador/);
    for(const origin of ['http://localhost:8081','http://127.0.0.1:8081','https://reader.example.invalid']) {
      const assigned=[];global.window={location:{origin,assign:url=>assigned.push(url)}};
      assert.equal(service.authCallbackUrl(),origin+'/auth/callback');
      assert.equal(service.authCallbackUrl('reset-password'),origin+'/auth/callback?next=reset-password');
      await service.loginWithGoogle();assert.equal(assigned.length,1);
      assert.equal(new URL(assigned[0]).searchParams.get('redirect_to'),origin+'/auth/callback');
    }
  } finally {if(savedWindow===undefined)delete global.window;else global.window=savedWindow;}
  const diagnostic=load('src/utils/authDiagnostics.ts');
  const marker='PRIVATE_CANARY';
  const structural=authUrlDiagnosticFields('aldus://auth/callback?code='+marker+'#access_token='+marker);
  assert.deepEqual(structural,{returnedScheme:'aldus',returnedHost:'auth',returnedPath:'/callback'});
  diagnostic.authDiagnostic('OAUTH_CALLBACK_RECEIVED',{...structural,authorizationCode:marker,access_token:marker,refresh_token:marker,verifier:marker,returnedHost:marker,returnedPath:marker,flow:marker,exchangeResult:marker});
  const records=logs.map(args=>JSON.parse(args[1]));
  for(const event of ['OAUTH_STARTED','OAUTH_BROWSER_OPENED','OAUTH_EXCHANGE'])assert.ok(records.some(item=>item.event===event),event);
  assert.ok(records.some(item=>item.exchangeResult==='missing_session'));assert.ok(records.some(item=>item.exchangeResult==='stale'));
  assert.ok(!JSON.stringify(logs).includes(marker));assert.ok(!JSON.stringify(logs).includes('code_challenge'));
  console.log('PASS installed SDK PKCE redirect contract: Native/recovery exact, Web runtime origin/local development/SSR rejection, wrong redirect rejected before browser, stale authorize/replayed callback, missing session and safe diagnostics');
}
