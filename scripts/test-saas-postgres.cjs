// Real PostgreSQL 17.6, independent backends/locks. Auth claims and Storage service are fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {cluster,root}=require('./saas-local-postgres.cjs');
const F=require('./saas-homologation-fixture.cjs'),B=require('./saas-local-backup.cjs');
const MiB=1048576;let passed=0,lockProofs=[];
const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
const value=async(c,sql,args=[])=>(await c.query(sql,args)).rows[0].r;
const reject=(fn,code)=>assert.rejects(fn,e=>e.code===code);
const finish=(c,p,t,cancel=false)=>value(c,'select public.saas_finish_upload($1,$2,$3) as r',[p,t,cancel]);
const object=(c,p,n)=>c.query("insert into storage.objects(bucket_id,name,metadata) values('aldus-private-library',$1,$2)",[p,{size:n}]);
const change=(c,action,target,revision,payload)=>value(c,'select public.aldus_admin_change($1,$2,$3,$4,$5,$6,$7) as r',[crypto.randomUUID(),action,F.ids[target]??target,revision,payload,'SYNTHETIC local homologation','CONFIRMAR '+(F.ids[target]??target)]);
async function lockWait(observer,client){const pid=(await observer.query('select $1::int as pid',[client.processID])).rows[0].pid;for(let i=0;i<100;i++){const row=(await observer.query('select wait_event_type,pg_blocking_pids(pid) as blockers from pg_stat_activity where pid=$1',[pid])).rows[0];if(row?.wait_event_type==='Lock'){assert.ok(row.blockers.length);lockProofs.push({blockedPid:pid,blockingPids:row.blockers});return;}await new Promise(r=>setTimeout(r,20));}throw Error('Independent session did not wait on PostgreSQL lock');}
async function seed(c,who,count,prefix){await c.query(`insert into public.user_library_items(user_id,kind,id,book_id,payload)
 select $1,'book',$2||i,$2||i,'{"title":"SYNTHETIC seeded book","format":"epub"}' from generate_series(1,$3::int) i`,[F.ids[who],prefix,count]);}
(async()=>{
 const pg=await cluster();let restored;
 try{
  const control=await pg.connect();await control.query('create role anon;create role authenticated;create role service_role bypassrls');
  await control.query('create database aldus_homologation');await control.query('create database aldus_failure');
  const db=await pg.connect('aldus_homologation'),a=await pg.connect('aldus_homologation'),b=await pg.connect('aldus_homologation');
  assert.notEqual(a.processID,b.processID);await F.baseline(db);
  const original=(await db.query('select * from public.user_library_items order by kind,id')).rows,profiles=(await db.query('select * from public.profiles order by id')).rows,objects=(await db.query('select * from storage.objects')).rows;
  for(const file of F.pending)await test('incremental '+file,async()=>{
   assert.equal(await F.migrate(db,file),'applied');
   assert.deepEqual((await db.query('select * from public.user_library_items order by kind,id')).rows,original);
   assert.deepEqual((await db.query('select * from public.profiles order by id')).rows,profiles);
   assert.deepEqual((await db.query('select * from storage.objects')).rows,objects);
  });
  await test('ledger/checksums and rerun guard preserve historical versions',async()=>{for(const file of F.pending)assert.equal(await F.migrate(db,file),'already_applied');assert.equal((await db.query('select * from supabase_migrations.schema_migrations')).rowCount,7);});
  await db.query("update public.saas_account_subscriptions set plan_id='pro',grant_source='trusted_backend' where user_id=$1",[F.ids.pro]);
  await test('six synthetic identities; original Free/Pro catalog; disabled denied',async()=>{
   await F.as(a,'freeA');assert.deepEqual((await F.snapshot(a)).limits,{syncedBooks:100,storageBytes:500*MiB});
   await F.as(a,'pro');assert.deepEqual((await F.snapshot(a)).limits,{syncedBooks:2000,storageBytes:10*1024*MiB});
   await F.as(a,'disabled');await reject(()=>F.snapshot(a),'42501');await reject(()=>F.apply(a,'denied'),'42501');
   assert.equal((await db.query('select count(*)::int as n from public.saas_account_subscriptions where user_id=$1',[F.ids.disabled])).rows[0].n,0);
  });
  await F.as(a,'freeA');await F.apply(a,'upload-one');await F.apply(a,'upload-two');await seed(db,'freeA',97,'free-seed-');
  await test('99/100/101 books with independent concurrent transactions',async()=>{
   assert.equal((await F.snapshot(a)).usage.syncedBooks,99);await F.as(b,'freeA');await a.query('begin');await F.apply(a,'book-100');
   await b.query('begin');const pending=F.apply(b,'book-101');pending.catch(()=>{});await lockWait(db,b);await a.query('commit');await reject(()=>pending,'PQL01');await b.query('rollback');
   assert.equal((await F.snapshot(a)).usage.syncedBooks,100);await F.apply(a,'upload-one',0,{percentage:.7},'progress','position');
  });
  const p1=F.objectPath('freeA','upload-one','a'),p2=F.objectPath('freeA','upload-two','b');let reservation;
  await test('two uploads cannot jointly overbook 500 MiB; actual row lock observed',async()=>{
   await a.query('begin');reservation=await F.reserve(a,p1,300*MiB);await b.query('begin');const pending=F.reserve(b,p2,300*MiB);pending.catch(()=>{});await lockWait(db,b);await a.query('commit');await reject(()=>pending,'PQL02');await b.query('rollback');
   assert.equal((await F.snapshot(a)).usage.reservedBytes,300*MiB);await finish(a,p1,reservation.token,true);
  });
  await test('same-path concurrent retry returns one lease, no double charge',async()=>{
   await a.query('begin');reservation=await F.reserve(a,p1,6);await b.query('begin');const pending=F.reserve(b,p1,6);await lockWait(db,b);await a.query('commit');assert.equal((await pending).token,reservation.token);await b.query('commit');assert.equal((await F.snapshot(a)).usage.reservedBytes,6);
  });
  await test('Storage probe rollback, size mismatch, failed write, completion and response-loss recovery',async()=>{
   await a.query('begin;savepoint probe');await a.query("insert into storage.objects(bucket_id,name) values('aldus-private-library',$1)",[p1]);await a.query('rollback to probe;commit');
   await reject(()=>object(a,p1,7),'22023');assert.equal((await F.snapshot(a)).usage.reservedBytes,6);
   await a.query('begin');await object(a,p1,6);await a.query('rollback');assert.equal((await F.snapshot(a)).usage.storageBytes,0);
   await object(a,p1,6);assert.equal((await F.reserve(a,p1,6)).state,'exists');assert.equal((await finish(a,p1,reservation.token,true)).state,'committed');
   assert.equal((await F.snapshot(a)).usage.reservedBytes,0);assert.equal((await F.snapshot(a)).usage.storageBytes,6);
   await reject(()=>F.reserve(a,p1,7),'22023');await reject(()=>object(a,F.objectPath('freeA','upload-two','d'),1),'42501');
  });
  await test('Free storage exactly 500 MiB and over, without changing commercial limits',async()=>{
   const remaining=(await F.snapshot(a)).remaining.storageBytes,r=await F.reserve(a,p2,remaining);await object(a,p2,remaining);
   assert.equal((await F.snapshot(a)).remaining.storageBytes,0);await reject(()=>F.reserve(a,F.objectPath('freeA','upload-two','f'),1),'PQL02');
   await F.apply(a,'upload-one',0,{text:'SYNTHETIC still studying'},'highlight','at-limit');await db.query('delete from storage.objects where name=$1',[p2]);assert.equal((await finish(a,p2,r.token,true)).state,'cancelled');
  });
  await test('cancel, stale token, expiry and late completion are fenced',async()=>{
   const old=await F.reserve(a,p2,8);await finish(a,p2,old.token,true);await reject(()=>object(a,p2,8),'42501');const fresh=await F.reserve(a,p2,8);assert.notEqual(fresh.token,old.token);await reject(()=>finish(a,p2,old.token,true),'22023');
   await db.query("update saas_private.upload_reservations set expires_at=clock_timestamp()-interval '1 second' where user_id=$1 and path=$2",[F.ids.freeA,p2]);await reject(()=>object(a,p2,8),'42501');assert.equal((await F.snapshot(a)).usage.reservedBytes,0);
  });
  await test('A/B/anonymous isolation and self-promotion denied',async()=>{
   await F.as(a,'freeB');assert.equal((await a.query('select * from public.user_library_items')).rowCount,5);assert.equal((await a.query('select * from storage.objects')).rowCount,1);
   await reject(()=>F.reserve(a,p1,6),'22023');await reject(()=>a.query("update public.saas_account_subscriptions set plan_id='pro'"),'42501');await reject(()=>a.query('select * from saas_private.upload_reservations'),'42501');
   await F.as(a,null);await reject(()=>F.snapshot(a),'42501');await reject(()=>a.query('select * from public.user_library_items'),'42501');
  });
  await seed(db,'pro',2000,'pro-seed-');await F.as(a,'pro');
  await test('Pro exactly 2000, above denied; downgrade/upgrade retain books, files and study writes',async()=>{
   assert.equal((await F.snapshot(a)).usage.syncedBooks,2000);await reject(()=>F.apply(a,'pro-2001'),'PQL01');
   for(const [book,c] of [['pro-seed-1','c'],['pro-seed-2','d']]){const p=F.objectPath('pro',book,c);await F.reserve(a,p,300*MiB);await object(a,p,300*MiB);}
   let left=(await F.snapshot(a)).remaining.storageBytes,i=3;while(left>0){const size=Math.min(512*MiB,left),p=F.objectPath('pro','pro-seed-'+i,'e');await F.reserve(a,p,size);await object(a,p,size);left-=size;i++;}
   assert.equal((await F.snapshot(a)).remaining.storageBytes,0);await reject(()=>F.reserve(a,F.objectPath('pro','pro-seed-50','f'),1),'PQL02');
   await db.query("update public.saas_account_subscriptions set plan_id='free' where user_id=$1",[F.ids.pro]);assert.equal((await F.snapshot(a)).overLimit,true);
   await F.apply(a,'pro-seed-1',0,{note:'SYNTHETIC downgrade note'},'bookmark','downgrade-note');await reject(()=>F.reserve(a,F.objectPath('pro','pro-seed-50','f'),1),'PQL02');assert.equal((await F.reserve(a,F.objectPath('pro','pro-seed-1','c'),300*MiB)).state,'exists');
   await db.query("update public.saas_account_subscriptions set plan_id='pro' where user_id=$1",[F.ids.pro]);assert.equal((await F.snapshot(a)).overLimit,false);assert.equal((await F.snapshot(a)).usage.syncedBooks,2000);assert.equal((await F.snapshot(a)).usage.storageBytes,10*1024*MiB);
  });
  await test('synthetic OWNER bootstrap, delegated ADMIN, verified session and MFA boundaries',async()=>{
   await reject(()=>db.query('select aldus_admin_private.bootstrap_owner($1,$2)',['owner@aldus.example.invalid',F.ids.admin]),'P0002');
   await db.query('select aldus_admin_private.bootstrap_owner($1,$2)',['owner@aldus.example.invalid',F.ids.owner]);await reject(()=>db.query('select aldus_admin_private.bootstrap_owner($1,$2)',['owner@aldus.example.invalid',F.ids.owner]),'P0001');
   await F.as(a,'owner',{mfa:false});assert.equal((await value(a,'select public.aldus_admin_session() as r')).recentMfa,false);assert.equal((await change(a,'member','admin',0,{role:'ADMIN',active:true,permissions:['users.read','metrics.read']})).ok,false);
   await F.as(a,'owner',{age:601});assert.equal((await change(a,'member','admin',0,{role:'ADMIN',active:true,permissions:[]})).ok,false);
   await F.as(a,'owner');assert.equal((await change(a,'member','admin',0,{role:'ADMIN',active:true,permissions:['users.read','metrics.read']})).ok,true);
   await F.as(b,'admin');assert.equal((await value(b,'select public.aldus_admin_session() as r')).role,'ADMIN');await reject(()=>value(b,"select public.aldus_admin_read('plans') as r"),'42501');
   await F.as(b,'pro');await reject(()=>value(b,'select public.aldus_admin_session() as r'),'42501');await reject(()=>b.query("insert into public.aldus_admin_members values($1,'OWNER','{}',true,now())",[F.ids.pro]),'42501');
  });
  await test('Admin CAS across independent sessions, audit, revocation and no private library access',async()=>{
   await F.as(b,'owner');await a.query('begin');assert.equal((await change(a,'setting','app.notice',0,{value:'SYNTHETIC first'})).ok,true);await b.query('begin');const pending=change(b,'setting','app.notice',0,{value:'SYNTHETIC second'});await lockWait(db,b);await a.query('commit');assert.equal((await pending).code,'conflict');await b.query('commit');
   assert.equal((await a.query('select * from public.user_library_items')).rowCount,0);assert.equal((await a.query('select * from storage.objects')).rowCount,0);await reject(()=>a.query('select * from public.aldus_admin_members'),'42501');
   const metrics=await value(a,"select public.aldus_admin_read('overview') as r");assert.equal(metrics.data.payments.mrr,null);
   assert.equal((await change(a,'member','admin',1,{role:'ADMIN',active:false,permissions:[]})).ok,true);await F.as(b,'admin');await reject(()=>value(b,'select public.aldus_admin_session() as r'),'42501');
   await reject(()=>db.query('delete from public.aldus_admin_members where user_id=$1',[F.ids.owner]),'42501');await reject(()=>db.query("update public.profiles set account_status='disabled' where id=$1",[F.ids.owner]),'42501');
   assert.ok((await db.query("select count(*)::int as n from public.aldus_admin_audit where outcome='success'")).rows[0].n>0);await reject(()=>db.query('delete from public.aldus_admin_audit'),'42501');
  });
  await test('cross-revocation of two OWNER sessions leaves one active OWNER',async()=>{
   assert.equal((await change(a,'member','admin',2,{role:'OWNER',active:true,permissions:[]})).ok,true);await F.as(b,'admin');
   await a.query('begin');assert.equal((await change(a,'member','admin',3,{role:'OWNER',active:false,permissions:[]})).ok,true);await b.query('begin');
   const pending=change(b,'member','owner',0,{role:'OWNER',active:false,permissions:[]});await lockWait(db,b);await a.query('commit');assert.equal((await pending).code,'forbidden_or_mfa');await b.query('commit');
   assert.equal((await db.query("select count(*)::int as n from public.aldus_admin_members where role='OWNER' and active")).rows[0].n,1);
  });
  await test('intermediate migration failure rolls back; original source files remain unchanged',async()=>{
   const c=await pg.connect('aldus_failure');await F.baseline(c);await F.migrate(c,F.pending[0]);const before=(await c.query('select * from public.user_library_items order by kind,id')).rows;
   await reject(()=>c.query(F.source(F.pending[1]).replace(/commit;\s*$/i,'select 1/0;commit;')),'22012');await c.query('rollback');assert.equal((await c.query("select to_regclass('public.saas_plans') as r")).rows[0].r,null);assert.deepEqual((await c.query('select * from public.user_library_items order by kind,id')).rows,before);await c.end();
  });
  await db.query('delete from storage.objects where name<>$1',[F.legacyPath]);
  const expected={profiles:(await db.query('select * from public.profiles order by id')).rows,library:(await db.query('select * from public.user_library_items order by user_id,kind,id')).rows,ledger:(await db.query('select version,source_hash from supabase_migrations.schema_migrations order by version')).rows,audit:(await db.query('select * from public.aldus_admin_audit order by id')).rows};
  await test('free offline physical backup restores database/Auth/metadata/ledger/audit and fixture bytes',async()=>{
   const directory=await B.backup(pg,{'legacy.epub':F.bytes});restored=await B.restore(directory,pg.password);const r=await restored.connect('aldus_homologation');
   assert.deepEqual((await r.query('select * from public.profiles order by id')).rows,expected.profiles);assert.deepEqual((await r.query('select * from public.user_library_items order by user_id,kind,id')).rows,expected.library);assert.deepEqual((await r.query('select version,source_hash from supabase_migrations.schema_migrations order by version')).rows,expected.ledger);assert.deepEqual((await r.query('select * from public.aldus_admin_audit order by id')).rows,expected.audit);assert.equal((await r.query('select count(*)::int as n from auth.users')).rows[0].n,6);
   assert.deepEqual(fs.readFileSync(path.join(directory,'objects/legacy.epub')),F.bytes);await F.as(r,'freeB');assert.equal((await F.snapshot(r)).usage.storageBytes,F.bytes.length);
   const corrupt=path.join(directory,'objects/legacy.epub');fs.appendFileSync(corrupt,'corrupt');await assert.rejects(()=>B.restore(directory,pg.password),/checksum/);fs.writeFileSync(corrupt,F.bytes);
  });
  const result={postgres:'17.6',scenarios:passed,independentSessionLocks:lockProofs,
   migrationSources:Object.fromEntries(F.pending.map(file=>[file,F.digest(F.source(file))])),testSourceHash:F.digest(fs.readFileSync(__filename,'utf8')),
   storageMetadataIncludesSimulatedLargeSizes:true,physicalFixtureBytes:F.bytes.length,
   managedAuth:'NOT_TESTED',managedStorage:'NOT_TESTED',productionRecovery:'NOT_VERIFIED',localSyntheticRestore:'PASS'};
  fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(result,null,2));console.log(`PASS ${passed} real PostgreSQL scenarios; ${lockProofs.length} actual multi-session lock waits. Auth/Storage fixtures, not managed Supabase proof.`);
 }finally{await restored?.stop();await pg.stop();}
})().catch(e=>{console.error(e);process.exitCode=1});
