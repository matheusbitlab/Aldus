// Installed Supabase SDK in a Hermes-like runtime: no SubtleCrypto, real secure UUID source.
const assert=require('node:assert/strict'), crypto=require('node:crypto');
const load=require('./community-test-loader.cjs')({'expo-modules-core':{uuid:{v4:()=>crypto.randomUUID()}}});
const {hardenPkceParameters,nativeAuthFetch}=load('src/data/remote/authPkce.ts');
const {installNativeAuthRandom}=load('src/data/remote/nativeAuthRandom.ts');
const {validateGoogleAuthorizationUrl}=load('src/data/remote/authRedirect.ts');
const {createClient}=require('@supabase/supabase-js');
(async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'crypto'), random=Math.random;
 const originalWarn=console.warn; console.warn=message=>{if(!String(message).startsWith('WebCrypto API is not supported'))originalWarn(message);};
 try{
  Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});
  Math.random=()=>{throw Error('Insecure random fallback must never run');}; installNativeAuthRandom();
  assert.equal(globalThis.crypto.subtle,undefined,'do not fake complete WebCrypto support');
  const bytes=globalThis.crypto.getRandomValues(new Uint32Array(56)); assert.ok(bytes.some(Boolean));
  assert.throws(()=>globalThis.crypto.getRandomValues(new Float32Array(2)));assert.throws(()=>globalThis.crypto.getRandomValues(new Uint8Array(65537)));
  const rfc=new URLSearchParams({code_challenge:'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',code_challenge_method:'plain'});
  hardenPkceParameters(rfc);assert.equal(rfc.get('code_challenge'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');assert.equal(rfc.get('code_challenge_method'),'s256');
  const storage=new Map(), requests=[];
  const project='https://fixture.supabase.co';
  const client=createClient(project,'fixture-only-public-key',{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:{getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value),removeItem:async key=>storage.delete(key)}},global:{fetch:nativeAuthFetch(project,async(url,init)=>{requests.push({url,body:JSON.parse(init.body)});return Response.json({user:{id:'fixture-user',identities:[]},session:null});})}});
  const redirectTo='aldus://auth/callback'; const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:true}});assert.equal(error,null);
  const url=new URL(data.url);assert.equal(url.searchParams.get('code_challenge_method'),'plain','baseline installed SDK reproduces the Native fallback');
  assert.throws(()=>validateGoogleAuthorizationUrl(url.href,project,redirectTo),'baseline validator rejects the SDK plain method');
  const verifier=url.searchParams.get('code_challenge'); hardenPkceParameters(url.searchParams);validateGoogleAuthorizationUrl(url.href,project,redirectTo);
  assert.equal(url.searchParams.get('code_challenge'),crypto.createHash('sha256').update(verifier).digest('base64url'));
  const tampered=new URL(url);tampered.hostname='attacker.invalid';assert.throws(()=>validateGoogleAuthorizationUrl(tampered.href,project,redirectTo));
  const services=require('./community-test-loader.cjs')({
   'react-native':{Platform:{OS:'android'}},'expo-linking':{},
   '@/src/data/remote/supabase':{requireSupabase:()=>client},
   './supabase':{requireSupabase:()=>client},
   '@/src/utils/authDiagnostics':{authDiagnostic(){},finishAuthDiagnostic(){}},
   '@/src/utils/authOAuthDiagnostics':{},
  })('src/data/remote/authService.ts');
  const registration=await services.registerAccount('Synthetic','already_taken','synthetic@example.invalid','fixture-only-password');
  assert.equal(registration.needsEmailConfirmation,true);
  assert.equal(requests.length,1);assert.equal(requests[0].body.code_challenge_method,'s256');assert.equal(requests[0].body.code_challenge.length,43);
  assert.equal(requests[0].body.data.username,undefined,'username collision cannot abort the Auth trigger');
  assert.equal(requests[0].body.data.preferred_username,'already_taken');
  assert.ok([...storage.values()].some(value=>value.includes(verifier)),'the SDK stored verifier is preserved for callback exchange');
  await client.auth.dispose();
  const direct=new URLSearchParams(url.searchParams);hardenPkceParameters(direct);assert.equal(direct.toString(),url.searchParams.toString(),'S256 is unchanged');
  console.log('PASS installed SDK reproduces plain rejection without SubtleCrypto; Native secure RNG, RFC7636 S256, unchanged SDK verifier/flow, protected origin/callback, signup S256 and deferred username claim. Controlled HTTP only; no real account created.');
 }finally{Math.random=random;console.warn=originalWarn;if(original)Object.defineProperty(globalThis,'crypto',original);else delete globalThis.crypto;}
})().catch(error=>{console.error(error);process.exitCode=1;});
