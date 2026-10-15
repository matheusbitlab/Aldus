// Real remote adapter, held SDK/fetch/body promises and timeout clock; no real user/backend.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),cp=require('node:child_process');
const baseline=process.argv.includes('--baseline');let session,network,body,timer,responseOverride,calls=0;
const defer=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)}};
const sessionA={data:{session:{user:{id:'A'},access_token:'test-token'}}};
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const source=baseline&&file.endsWith('SupabaseLibraryAdapter.ts')?cp.execFileSync('git',['show','3df3f5b:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports','fetch','setTimeout','clearTimeout',code)(name=>name.endsWith('/supabase')?{supabase:{auth:{getSession:()=>session?session.promise:Promise.resolve(sessionA)}}}:name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),exports,async()=>{calls++;if(network)return network.promise;return responseOverride??{ok:true,json:()=>body?body.promise:Promise.resolve([])}},callback=>{timer=callback;return 1},()=>{});return exports;}
(async()=>{
 const {SupabaseLibraryAdapter}=load('src/data/library/SupabaseLibraryAdapter.ts'),adapter=new SupabaseLibraryAdapter();
 for(const phase of ['session','network','body','timeout']){
   session=network=body=null;calls=0;const held=defer();if(phase==='session')session=held;if(phase==='network'||phase==='timeout')network=held;if(phase==='body')body=held;
   const controller=new AbortController();let settled=false;const operation=adapter.pull('A',controller.signal);operation.catch(()=>{settled=true});
   await new Promise(setImmediate);if(phase==='timeout')timer();else controller.abort();await new Promise(setImmediate);
   assert.equal(settled,true,`${phase}: cancellation/IO timeout must settle even if external promise ignores AbortSignal`);
   await assert.rejects(operation);const before=calls;held.resolve(phase==='session'?sessionA:phase==='body'?[]:{ok:true,json:async()=>[]});await new Promise(setImmediate);assert.equal(calls,before,'Late SDK result must not start a network phase');
 }
 session=network=body=null;assert.deepEqual(await adapter.pull('A',new AbortController().signal),[]);
 for(const [status,code,category] of [[404,'PGRST205','contract'],[401,'42501','authorization'],[403,null,'authorization'],[401,'PGRST301','session'],[503,null,'network']]){
   responseOverride={ok:false,status,json:async()=>({code,message:'secret-provider-canary'})};
   await assert.rejects(adapter.pull('A',new AbortController().signal),error=>error.code===category&&!error.message.includes('secret-provider-canary'));
 }
 responseOverride=null;
 console.log('PASS actual Library REST adapter: cancel pending SDK session, fetch and response body; IO deadline; no late network, fresh retry. Controlled boundaries, not authenticated remote proof.');
})().catch(e=>{console.error(e);process.exitCode=1});
