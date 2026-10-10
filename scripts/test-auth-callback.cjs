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
function loader(mocks) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = baseline && ['app/auth/callback.tsx', 'src/data/remote/authService.ts'].includes(file)
      ? execFileSync('git', ['show', `77c490c:${file}`], { encoding: 'utf8', windowsHide: true }) : fs.readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX } }).outputText;
    new Function('require','exports',code)(name => {
      if (name in mocks) return mocks[name];
      const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file),name);
      if ('@/'+base in mocks) return mocks['@/'+base];
      const target = ['.ts','.tsx',''].map(ext=>base+ext).find(candidate=>fs.existsSync(candidate));
      return target ? load(target) : require(name);
    },exports);
    return exports;
  };
}
(async()=>{
  let resolve, calls=0, params={code:'fixture-code'}, urls=[], nextError=null;
  const gate=new Promise(r=>resolve=r);
  const client={auth:{exchangeCodeForSession:()=>{calls++;return gate;},resetPasswordForEmail:async(email,options)=>{urls.push(options.redirectTo);return {error:nextError};}}};
  const load=loader({react:React,'react/jsx-runtime':testRequire('react/jsx-runtime'),
    'react-native':{Platform:{OS:'android'},Text:'Text',ActivityIndicator:'Spinner'},
    'expo-linking':{useURL:()=>null},'expo-router':{useLocalSearchParams:()=>params,router:{replace:url=>urls.push(url)}},
    '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette:{}})},
    '@/src/presentation/components/AuthForm':{AuthForm:'Form',AuthLink:'Link'},
    '@/src/data/remote/supabase':{requireSupabase:()=>client}});
  const service=load('src/data/remote/authService.ts');
  const Screen=load('app/auth/callback.tsx').default;
  let tree;
  await act(async()=>{tree=create(React.createElement(Screen));});
  params={...params,next:'reset-password'};
  await act(async()=>{tree.update(React.createElement(Screen));});
  await act(async()=>{resolve({error:null});await gate;});
  assert.equal(calls,1);
  if(baseline){assert.deepEqual(urls,[]);console.log('REPRODUCED baseline: effect cleanup + code ref leaves callback without navigation');}
  else {assert.deepEqual(urls,['/auth/reset-password']);console.log('PASS callback effect update: same exchange, recovery navigation completes');}
  await act(async()=>{tree.unmount();});
  params={error:'server_error',error_description:'PRIVATE_CANARY_authorization_code'};
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
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
