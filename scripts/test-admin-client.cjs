const assert=require('node:assert/strict'),fs=require('node:fs');const {loader}=require('./library-test-utils.cjs');
let configured=true,sdk,fetcher,calls=0;
const load=loader({'@/src/data/remote/supabase':{get supabase(){return configured?{auth:{getSession:()=>sdk()}}:null;}}});
const {AdminRepository}=load('src/admin/data/AdminRepository.ts'),{parseAdminSession,canAdmin}=load('src/admin/domain/contracts.ts'),{libraryAccountScope:scope}=load('src/data/library/LibraryAccountScope.ts');
const hold=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)}};
const originalFetch=global.fetch;global.fetch=async(...args)=>{calls++;return fetcher(...args)};
const identity=()=>({data:{session:{user:{id:'A',email:'irrelevant',user_metadata:{role:'OWNER'},app_metadata:{plan:'pro'}},access_token:'frozen-A'}}});
const member=()=>({version:1,userId:'A',role:'OWNER',permissions:[],recentMfa:true,source:'server_database'});
(async()=>{
 scope.set('A');sdk=async()=>identity();const repo=new AdminRepository(),signal=()=>new AbortController().signal;
 configured=false;await assert.rejects(repo.session(signal()),/indisponível/);assert.equal(calls,0);configured=true;
 fetcher=async(url,opts)=>{assert.ok(url.endsWith('aldus_admin_session'));assert.equal(opts.headers.Authorization,'Bearer frozen-A');return {ok:true,json:async()=>member()}};
 assert.equal((await repo.session(signal())).role,'OWNER');
 for(const modify of [v=>v.userId='B',v=>v.source='cache',v=>v.role='master',v=>v.permissions=['sql.execute']]){const value=member();modify(value);assert.throws(()=>parseAdminSession(value,'A'));}
 assert.equal(canAdmin({ ...member(),role:'ADMIN',permissions:['users.read']},'users.write'),false);
 assert.equal(canAdmin({ ...member(),role:'ADMIN',permissions:['users.read']},'users.read'),true);
 for(const status of [401,403,404,500]){fetcher=async()=>({ok:false,status});await assert.rejects(repo.session(signal()),e=>e.code===(status<404?'denied':'unavailable'));}
 for(const phase of ['session','fetch','body']){
  const pending=hold();sdk=()=>phase==='session'?pending.promise:Promise.resolve(identity());fetcher=()=>phase==='fetch'?pending.promise:Promise.resolve({ok:true,json:()=>phase==='body'?pending.promise:Promise.resolve(member())});
  const controller=new AbortController(),operation=repo.session(controller.signal);operation.catch(()=>{});await new Promise(setImmediate);controller.abort();await assert.rejects(operation);
  const before=calls;pending.resolve(phase==='session'?identity():phase==='body'?member():{ok:true,json:async()=>member()});await new Promise(setImmediate);assert.equal(calls,before);
 }
 for(const phase of ['session','fetch','body']){
  scope.set('A');const pending=hold();sdk=()=>phase==='session'?pending.promise:Promise.resolve(identity());fetcher=()=>phase==='fetch'?pending.promise:Promise.resolve({ok:true,json:()=>phase==='body'?pending.promise:Promise.resolve(member())});
  const operation=repo.session(signal());operation.catch(()=>{});await new Promise(setImmediate);scope.set('B');scope.set('A');pending.resolve(phase==='session'?identity():phase==='body'?member():{ok:true,json:async()=>member()});await assert.rejects(operation,/conta mudou/);
 }
 sdk=async()=>identity();fetcher=async()=>({ok:true,json:async()=>({version:1,section:'users',source:'cache',data:{rows:[]}})});await assert.rejects(repo.read('users',{},signal()),/inválida/);
 fetcher=async(url,opts)=>{const body=JSON.parse(opts.body);assert.equal(body.p_expected_revision,3);assert.equal(body.p_confirmation,'CONFIRMAR target');return {ok:true,json:async()=>({ok:false,code:'conflict'})}};
 assert.equal((await repo.change('request','target',3,{action:'benefit',payload:{mode:'revoke'}},'Reason','CONFIRMAR target',signal())).code,'conflict');
 for(const data of [{},{registeredUsers:0},{usage:{storageBytes:null},registrationsByDay:[]}]){
  fetcher=async()=>({ok:true,json:async()=>({version:1,section:'overview',source:'server_database',data})});
  await assert.rejects(repo.read('overview',{},signal()),e=>e.code==='invalid'&&e.message.includes('incompletos'));
 }
 const {isAdminMetrics}=load('src/admin/domain/contracts.ts');
 const metrics={registeredUsers:5,newUsers:0,recentSignIns:0,freeAccounts:5,proAccounts:0,activeSubscriptions:5,expiredSubscriptions:0,manualProGrants:0,syncOperations:0,usage:{books:1,objects:1,unknownSizeObjects:0,storageBytes:1},averageStorageBytes:.2,registrationsByDay:[],observedAt:new Date().toISOString(),payments:{status:'not_integrated',mrr:null,arr:null,totalRevenue:null,cancellations:null,churn:null,transactions:null,events:null,refunds:null}};
 assert.ok(isAdminMetrics(metrics),'A fractional mean is real data');assert.ok(!isAdminMetrics({...metrics,registeredUsers:undefined}));assert.ok(!isAdminMetrics({...metrics,payments:{...metrics.payments,mrr:0}}),'Unknown finance cannot become zero');
 const frontend=fs.readdirSync('src/admin/presentation').filter(f=>f.endsWith('tsx')).map(f=>fs.readFileSync('src/admin/presentation/'+f,'utf8')).join('\n');
 assert.ok(!frontend.includes('matheusborbaifc@gmail.com'));assert.ok(!frontend.includes('service_role'));
 assert.ok(fs.readFileSync('src/admin/presentation/AdminScreen.tsx','utf8').includes('access.session?<AdminContent'));
 console.log('PASS Admin client: actual TS transport/permission contracts; no backend/cache/email/JWT role promotion; frozen JWT; abort session/fetch/body and A-B-A; RPC denial; revision/confirmation transport; no privileged bootstrap data in UI.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{global.fetch=originalFetch});
