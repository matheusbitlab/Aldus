// Real shared TS contract/repository, controlled SDK/HTTP boundaries, no account secrets.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
let backend=null,fetcher,requests=0,timer;
const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file);
 const exports={};cache.set(file,exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports','fetch','setTimeout','clearTimeout',code)(name=>name.endsWith('/supabase')?{get supabase(){return backend}}:name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),exports,async(...args)=>{requests++;return fetcher(...args)},fn=>{timer=fn;return 1},()=>{});
 return exports;
}
const held=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)}};
const free=()=>({version:1,userId:'A',source:'server_database',effectivePlan:'free',plan:{id:'free',name:'Free',priceBrlCentavos:0},
 limits:{syncedBooks:100,storageBytes:524288000},usage:{syncedBooks:2,storageBytes:8},remaining:{syncedBooks:98,storageBytes:524287992},
 features:Object.fromEntries(['local_reading','book_import','library_sync','progress_sync','study_sync','organization_sync','private_storage','basic_study'].map(key=>[key,true])),
 subscription:{planId:'free',status:'active',startsAt:'2026-10-15T12:00:00Z',endsAt:null,grantSource:'server_default'}});
const unavailable={source:'unavailable',snapshot:null};
(async()=>{
 const {SupabaseAccountPlanRepository}=load('src/data/saas/SupabaseAccountPlanRepository.ts');
 const {parseAccountPlan,resolvePlanFeature}=load('src/domain/saas/accountPlan.ts');
 const {libraryAccountScope:scope}=load('src/data/library/LibraryAccountScope.ts');
 const repo=new SupabaseAccountPlanRepository(),signal=()=>new AbortController().signal;
 scope.set('A');assert.deepEqual(await repo.read(signal()),unavailable);assert.equal(requests,0);
 assert.equal(resolvePlanFeature(unavailable,'local_reading'),true);assert.equal(resolvePlanFeature(unavailable,'book_import'),true);
 assert.equal(resolvePlanFeature(unavailable,'premium'),false);
 const sdk=()=>({data:{session:{user:{id:'A',user_metadata:{plan:'pro'},app_metadata:{plan:'pro'}},access_token:'unverified-plan-claims'}}});
 backend={auth:{getSession:async()=>sdk()}};
 fetcher=async(url,options)=>{assert.ok(url.endsWith('/rpc/saas_account_snapshot'));assert.equal(options.body,'{}');assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer unverified-plan-claims');return {ok:true,json:async()=>free()}};
 let result=await repo.read(signal());assert.equal(result.snapshot.effectivePlan,'free','JWT claims do not assign plan');
 assert.equal(resolvePlanFeature(result,'library_sync'),true);assert.equal(resolvePlanFeature(result,'private_storage'),true);
 for(const status of [401,403,404,503]){fetcher=async()=>({ok:false,status});assert.deepEqual(await repo.read(signal()),unavailable)}
 fetcher=async()=>{throw new Error('network')};assert.deepEqual(await repo.read(signal()),unavailable);
 for(const modify of [v=>v.userId='B',v=>v.source='cache',v=>v.features.library_sync=false,v=>v.usage.storageBytes=-1,v=>v.limits.syncedBooks=NaN,v=>v.remaining.syncedBooks=100,v=>v.subscription.status='invented']){
  const invalid=free();modify(invalid);assert.throws(()=>parseAccountPlan(invalid,'A'));
  fetcher=async()=>({ok:true,json:async()=>invalid});assert.deepEqual(await repo.read(signal()),unavailable);
 }
 const unknown=free();unknown.usage.storageBytes=unknown.remaining.storageBytes=null;assert.equal(parseAccountPlan(unknown,'A').usage.storageBytes,null);
 const future=free();future.effectivePlan=future.plan.id=future.subscription.planId='future';future.features.future_feature=true;assert.equal(parseAccountPlan(future,'A').effectivePlan,'future');
 // Pending session, network and body must cancel; timeout must resolve unknown.
 for(const phase of ['session','network','body','timeout']){
  const pending=held();backend={auth:{getSession:()=>phase==='session'?pending.promise:Promise.resolve(sdk())}};
  fetcher=()=>phase==='network'||phase==='timeout'?pending.promise:Promise.resolve({ok:true,json:()=>phase==='body'?pending.promise:Promise.resolve(free())});
  const controller=new AbortController();let settled=false;
  const operation=repo.read(controller.signal);operation.then(()=>settled=true,()=>settled=true);
  await new Promise(setImmediate);if(phase==='timeout')timer();else controller.abort();await new Promise(setImmediate);
  assert.equal(settled,true,phase+' must settle');
  if(phase==='timeout')assert.deepEqual(await operation,unavailable);else await assert.rejects(operation);
  const before=requests;pending.resolve(phase==='session'?sdk():phase==='body'?free():{ok:true,json:async()=>free()});await new Promise(setImmediate);assert.equal(requests,before,'No late request after abort');
 }
 for(const phase of ['session','network','body']){
  scope.set('A');const pending=held();backend={auth:{getSession:()=>phase==='session'?pending.promise:Promise.resolve(sdk())}};
  fetcher=()=>phase==='network'?pending.promise:Promise.resolve({ok:true,json:()=>phase==='body'?pending.promise:Promise.resolve(free())});
  const operation=repo.read(signal());operation.catch(()=>{});await new Promise(setImmediate);scope.set('B');scope.set('A');
  pending.resolve(phase==='session'?sdk():phase==='network'?{ok:true,json:async()=>free()}:free());
  await assert.rejects(operation,/conta mudou/);
 }
 backend={auth:{getSession:async()=>({data:{session:{user:{id:'B'},access_token:'B'}}})}};
 const before=requests;assert.deepEqual(await repo.read(signal()),unavailable);assert.equal(requests,before);
 console.log('PASS SaaS client: actual shared Web/Android contract, Free Sync/Storage, no backend/cache/JWT promotion, owner and A-B-A fences, unknown usage, future plans, session/fetch/body cancellation and deadline, local read/import allowed. Controlled transport only.');
})().catch(error=>{console.error(error);process.exitCode=1});
