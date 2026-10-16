// Stage 3: actual TS contracts/repository/controller, original SQL in isolated PGlite.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {fixture}=require('./admin-test-fixture.cjs'),{loader}=require('./library-test-utils.cjs');
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name)};
(async()=>{
 const f=await fixture({quota:true}),original=global.fetch;let user=f.ids.owner,mode='normal',hold,queue=Promise.resolve();
 const sdk={auth:{getSession:async()=>({data:{session:user?{user:{id:user,user_metadata:{plan:'pro'}},access_token:'jwt-'+user}:null}})}};
 const load=loader({'@/src/data/remote/supabase':{supabase:sdk},'@/src/domain/entities/libraryId':{newLibraryId:()=>crypto.randomUUID()},'@/src/data/library/BundledBookIdentity':{findBundledAsset:()=>null},'@/src/data/library/LibrarySyncPayload':{libraryMutationEvents:{subscribe:()=>()=>{}}}});
 const {libraryAccountScope:scope,LibraryAccountScope}=load('src/data/library/LibraryAccountScope.ts'),{SupabaseAccountPlanRepository}=load('src/data/saas/SupabaseAccountPlanRepository.ts');
 const D=load('src/domain/saas/accountPlan.ts'),P=load('src/domain/saas/planPresentation.ts'),{AccountPlanController}=load('src/presentation/saas/AccountPlanController.ts');
 const repo=new SupabaseAccountPlanRepository();scope.set(user);
 const sql=(actor,query,args=[])=>{const task=queue.then(async()=>{if(actor===null)await f.db.exec('reset role');else await f.as(actor);return f.db.query(query,args)});queue=task.catch(()=>{});return task;};
 global.fetch=async(url,options)=>{
  const actor=options.headers.Authorization.slice(11),u=new URL(url),signal=options.signal;
  if(mode==='network')throw Error('offline');if(mode==='hold')return hold;
  if(mode==='401'||mode==='403'||mode==='404')return Response.json({}, {status:Number(mode)});
  if(mode==='invalid'&&url.endsWith('saas_account_snapshot'))return Response.json({userId:'foreign',plan:'pro'});
  if(signal.aborted)throw Error('aborted');
  if(url.endsWith('saas_account_snapshot'))return Response.json((await sql(actor,'select public.saas_account_snapshot() as r')).rows[0].r);
  if(url.endsWith('saas_quota_snapshot'))return Response.json((await sql(actor,'select public.saas_quota_snapshot() as r')).rows[0].r);
  if(u.pathname.endsWith('/saas_plans'))return Response.json((await sql(actor,'select * from public.saas_plans where available order by id')).rows);
  if(u.pathname.endsWith('/saas_plan_features'))return Response.json((await sql(actor,'select plan_id,feature,enabled from public.saas_plan_features')).rows);
  throw Error('Unexpected endpoint '+u.pathname);
 };
 process.env.EXPO_PUBLIC_SUPABASE_URL='https://synthetic.example.invalid';process.env.EXPO_PUBLIC_SUPABASE_KEY='fixture-public';
 const read=()=>repo.readExperience(new AbortController().signal),catalog=()=>repo.readCatalog(new AbortController().signal);
 const switchUser=id=>{user=id;scope.set(id)};
 try{
  await test('Free authenticated; original catalog limits and essential features from SQL',async()=>{const v=await read();assert.equal(v.account.effectivePlan,'free');assert.equal(v.quota.limits.syncedBooks,100);assert.equal(v.quota.limits.storageBytes,524288000);assert.ok(D.BASE_FEATURES.every(k=>v.account.features[k]));assert.equal(P.subscriptionLabel(v.account),'Ativa');});
  await test('zero usage retains numeric zero',async()=>{assert.equal((await read()).quota.usage.storageBytes,0);assert.equal(P.formatBytes(0),'0 bytes');});
  await test('Pro undefined price is not a purchase offer',async()=>{const p=(await catalog()).find(p=>p.id==='pro');assert.equal(P.catalogPrice(p),'Preço ainda não disponível');assert.equal(p.limits.storageBytes,10737418240)});
  await test('Admin configured monthly/annual price read from existing catalog',async()=>{await sql(null,"update public.saas_plans set price_brl_centavos=3490,annual_brl_centavos=34900 where id='pro'");const p=(await catalog()).find(p=>p.id==='pro');assert.match(P.catalogPrice(p),/34,90/);assert.equal(p.annualBrlCentavos,34900)});
  await test('Pro administrative grant and partial usage',async()=>{switchUser(f.ids.user);const v=await read();assert.equal(v.account.effectivePlan,'pro');assert.equal(v.account.subscription.grantSource,'trusted_backend');assert.equal(v.quota.usage.storageBytes,5);assert.equal(v.quota.usage.syncedBooks,1)});
  await test('Pro subscription confers no Admin authorization',async()=>{await assert.rejects(()=>sql(user,'select public.aldus_admin_session()'),/denied/)});
  const objectPath=`${f.ids.user}/legacy/${'b'.repeat(64)}.epub`;
  // Inject historical/unknown metadata only in this isolated fixture. Enforcement has its own suites.
  const legacySize=async metadata=>{await sql(null,'alter table storage.objects disable trigger user');try{await sql(null,'update storage.objects set metadata=$1 where name=$2',[metadata,objectPath])}finally{await sql(null,'alter table storage.objects enable trigger user')}};
  await test('downgrade retains book/study/file and reports overage',async()=>{await sql(null,"update public.saas_account_subscriptions set plan_id='free' where user_id=$1",[user]);await legacySize({size:524288001});const v=await read();assert.equal(v.quota.overLimit,true);assert.equal(v.quota.remaining.storageBytes,0);assert.equal(v.quota.usage.syncedBooks,1);assert.equal((await sql(user,'select * from public.user_library_items')).rowCount,5)});
  await test('exact limit and clamped over-limit progress',async()=>{await legacySize({size:524288000});const v=await read();assert.equal(v.quota.overLimit,false);assert.equal(v.quota.remaining.storageBytes,0);assert.equal(P.progressPercent(524288000,524288000),100);assert.equal(P.progressPercent(900,100),100);assert.equal(P.progressPercent(-1,100),null);assert.equal(P.progressPercent(1,0),null)});
  await test('unknown usage is never displayed as zero',async()=>{await legacySize({});const v=await read();assert.equal(v.quota.usage.storageBytes,null);assert.equal(P.formatBytes(v.quota.usage.storageBytes),'Em verificação');assert.equal(P.progressPercent(null,10),null);await legacySize({size:5})});
  await test('active reservations are separate from actual objects',async()=>{const p=`${user}/legacy/${'c'.repeat(64)}.epub`;await sql(user,'select public.saas_reserve_upload($1,123)',[p]);const v=await read();assert.equal(v.quota.usage.reservedBytes,123);assert.equal(v.quota.usage.reservedUploads,1);assert.equal(v.quota.usage.storageBytes,5);assert.equal(v.quota.remaining.storageBytes,524288000-128)});
  for(const status of ['expired','revoked','trialing'])await test('subscription state '+status,async()=>{await sql(null,"update public.saas_account_subscriptions set plan_id='pro',status=$1,ends_at=null where user_id=$2",[status,user]);const v=await read();assert.equal(v.account.effectivePlan,status==='trialing'?'pro':'free');assert.equal(P.subscriptionLabel(v.account),{expired:'Expirada',revoked:'Revogada',trialing:'Em avaliação concedida'}[status])});
  await test('expired administrative deadline falls back to Free without deleting data',async()=>{await sql(null,"update public.saas_account_subscriptions set status='active',starts_at=now()-interval '2 minutes',ends_at=now()-interval '1 minute' where user_id=$1",[user]);const v=await read();assert.equal(v.account.effectivePlan,'free');assert.equal(P.subscriptionLabel(v.account),'Expirada')});
  for(const [m,code] of [['network','network'],['401','session'],['403','authorization'],['404','unavailable'],['invalid','contract']])await test('safe error '+m,async()=>{mode=m;await assert.rejects(read,e=>e.code===code);mode='normal'});
  await test('missing session never produces Pro',async()=>{user=null;await assert.rejects(read);user=f.ids.user});
  await test('deactivated account is denied by original SQL',async()=>{await sql(null,"update public.profiles set account_status='disabled' where id=$1",[f.ids.second]);switchUser(f.ids.second);await assert.rejects(read);switchUser(f.ids.owner)});
  await test('controller refresh failure clears previous server data and recovers',async()=>{const c=new AccountPlanController(s=>repo.readExperience(s));await c.refresh();assert.equal(c.state.data.account.effectivePlan,'free');mode='network';await c.refresh();assert.equal(c.state.data,null);mode='normal';await c.refresh();assert.ok(c.state.data);c.cancel()});
  await test('offline event revokes the displayed view until authenticated refresh',async()=>{const c=new AccountPlanController(s=>repo.readExperience(s));await c.refresh();c.unavailable('network');assert.equal(c.state.data,null);assert.equal(c.state.error,'network');await c.refresh();assert.ok(c.state.data);c.cancel()});
  await test('A-B-A, logout, late result and cancellation discard previous identity',async()=>{let release;const c=new AccountPlanController(()=>new Promise(r=>release=r));const stop=scope.subscribe(c.cancel);const pending=c.refresh();switchUser(f.ids.user);switchUser(f.ids.owner);release({secret:'PREVIOUS_ACCOUNT'});await pending;assert.equal(c.state.data,null);const p=c.refresh();c.cancel();release({secret:'cancelled'});await p;assert.equal(c.state.data,null);const q=c.refresh();switchUser(null);release({secret:'logout'});await q;assert.equal(c.state.data,null);stop();switchUser(f.ids.owner)});
  await test('catalog malformed or incomplete contract fails closed',async()=>{assert.throws(()=>D.parsePlanCatalog([{id:'free',available:true}],[]));assert.throws(()=>D.parsePlanCatalog([null],[]));const all=await catalog();assert.equal(all[0].id,'free');assert.equal(P.catalogPrice(all[0]).replace(/\s/g,''),'R$0,00')});
  await test('bytes MiB GiB formatting and inconsistent effective plan',async()=>{assert.equal(P.formatBytes(524288000),'500 MiB');assert.equal(P.formatBytes(10737418240),'10 GiB');const v=await read();assert.throws(()=>P.assertPlanUsage(v.account,{...v.quota,effectivePlan:'pro'}));assert.throws(()=>P.assertPlanUsage({...v.account,limits:{...v.account.limits,storageBytes:0}},{...v.quota,limits:{...v.quota.limits,storageBytes:0}}))});
  await test('book availability shares coordinator rules; metadata alone cannot claim cloud bytes',async()=>{
   const C=load('src/data/library/LibrarySyncCoordinator.ts').LibrarySyncCoordinator,S=load('src/data/library/LibrarySyncService.ts').LibrarySyncService;
   const engine={quotaKey:'unavailable',quotaBlockMessage:S.prototype.quotaBlockMessage};
   const context={scope:{userId:'A'},files:{states:new Map()},engine,state:{entries:{},quotaBlocks:{}},needsFile:b=>!!b.filePath&&!b.remotePath};
   const a=b=>C.prototype.availability.call(context,b),book={id:'b',ownerUserId:'A',filePath:'local',remotePath:null};
   assert.equal(a({...book,ownerUserId:null}),'LOCAL');assert.equal(a(book),'SYNC_PENDING');
   context.state.entries['book:b']={key:'book:b',bookId:'b',shadow:{payload:{},deleted_at:null}};assert.notEqual(a(book),'SYNCED');
   const cloud={...book,remotePath:'A/b/file'};context.state.entries['book:b'].shadow.payload.remotePath=cloud.remotePath;assert.equal(a(cloud),'SYNCED');assert.equal(a({...cloud,filePath:''}),'CLOUD_ONLY');
   context.state.entries['book:b'].conflict={};assert.equal(a(cloud),'CONFLICT');delete context.state.entries['book:b'].conflict;
   context.state.quotaBlocks['file:b']={signature:'old',message:'quota'};const before=JSON.stringify(context.state);assert.equal(a(cloud),'QUOTA_BLOCKED');assert.equal(JSON.stringify(context.state),before);delete context.state.quotaBlocks['file:b'];
   context.files.states.set('b',{state:'UPLOADING'});assert.equal(a(cloud),'UPLOADING');context.files.states.set('b',{state:'ERROR'});assert.equal(a(cloud),'ERROR');context.files.states.clear();assert.equal(a(cloud),'SYNCED');
  });
  console.log(`PASS ${passed} Stage 3 scenarios. Original SQL/TS, synthetic Auth/HTTP; no production or Android proof.`);
 }finally{global.fetch=original;await queue;await f.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
