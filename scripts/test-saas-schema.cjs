// Actual incremental SQL under PostgreSQL/PGlite. Not Supabase HTTP/Storage proof.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { PGlite } = require(path.resolve('.expo/library-db-test/node_modules/@electric-sql/pglite'));
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333', D='44444444-4444-4444-8444-444444444444';
const migration = fs.readdirSync('supabase/migrations').find(name=>name.endsWith('_saas_plans_entitlements.sql'));
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,storage to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id integer generated always as identity primary key,bucket_id text,name text,metadata jsonb);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 grant usage on sequence storage.objects_id_seq to anon,authenticated;
 create policy existing_permissive on storage.objects for all to public using(true) with check(true);`);
 for(const file of ['202610060001_profiles_and_features.sql','202610110001_private_account_library.sql','202610110002_private_library_file_recovery.sql','20261015160539_library_active_account_fences.sql'])
   await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.query('insert into auth.users(id) values($1),($2),($3)',[A,B,D]);
 await db.query("update public.profiles set account_status='disabled' where id=$1",[D]);
 const as=async(user,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);await db.exec('set role '+role)};
 let op=0;
 const apply=async(book,base=0,payload={title:'Book',format:'epub'},deleted=false,kind='book',id=book)=>
   (await db.query('select public.library_apply($1,$2,$3,$4,$5,$6,$7) as result',[
     `00000000-0000-4000-8000-${String(++op).padStart(12,'0')}`,book,kind,id,base,JSON.stringify(payload),deleted])).rows[0].result;
 const snapshot=async()=> (await db.query('select public.saas_account_snapshot() as s')).rows[0].s;
 await as(A);const legacy=await apply('legacy');
 await apply('legacy',0,{note:'keep'},false,'bookmark','note');
 for(const [kind,payload] of [['progress',{percentage:.4}],['highlight',{text:'keep',color:'yellow'}],['organization',{favorite:true,tags:['keep']}],['pdf_position',{page:7}]])
   await apply('legacy',0,payload,false,kind,kind);
 const filename=`${A}/legacy/${'a'.repeat(64)}.epub`;
 await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['aldus-private-library',filename,{size:600000000}]);
 await db.exec('reset role');
 // Pre-existing over-quota account, no destructive enforcement on migration.
 await db.query(`insert into public.user_library_items(user_id,kind,id,book_id,payload)
 select $1,'book','old-'||n,'old-'||n,'{"title":"Old","format":"pdf"}' from generate_series(1,100) n`,[A]);
 const preserved={};
 for(const table of ['profiles','user_library_items','user_library_operations']) preserved[table]=(await db.query(`select * from public.${table} order by 1,2,3`)).rows;
 preserved.objects=(await db.query('select * from storage.objects order by id')).rows;
 await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 for(const table of ['profiles','user_library_items','user_library_operations']) assert.deepEqual((await db.query(`select * from public.${table} order by 1,2,3`)).rows,preserved[table]);
 assert.deepEqual((await db.query('select * from storage.objects order by id')).rows,preserved.objects);
 assert.equal((await db.query('select * from public.saas_account_subscriptions where user_id=$1',[D])).rows.length,0);
 await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[C,{plan:'pro',role:'master'}]);
 await as(C);let s=await snapshot();assert.equal(s.effectivePlan,'free');assert.equal(s.plan.priceBrlCentavos,0);
 assert.deepEqual(s.limits,{syncedBooks:100,storageBytes:524288000});assert.equal(s.subscription.grantSource,'server_default');
 for(const key of ['local_reading','book_import','library_sync','progress_sync','study_sync','organization_sync','private_storage','basic_study']) assert.equal(s.features[key],true);
 // No self/other promotion, catalog edit, raw entitlement grant or private helper access.
 for(const user of [C,B]) {
   await assert.rejects(()=>db.query("update public.saas_account_subscriptions set plan_id='pro' where user_id=$1",[user]),/permission denied/);
   await assert.rejects(()=>db.query("insert into public.saas_account_entitlements values($1,'premium',true,null)",[user]),/permission denied/);
 }
 await assert.rejects(()=>db.exec("update public.saas_plans set storage_bytes=999999999999"),/permission denied/);
 await assert.rejects(()=>db.exec("select saas_private.effective_plan('"+B+"')"),/permission denied/);
 assert.equal((await db.query('select * from public.saas_account_subscriptions where user_id=$1',[A])).rows.length,0);
 // Smaller server-configured quota proves enforcement is catalog-driven, not UI constants.
 await db.exec('reset role');await db.exec("update public.saas_plans set synced_books=2,storage_bytes=10 where id='free'");
 await as(C);const one=await apply('one');const two=await apply('two');
 await assert.rejects(()=>apply('three'),/book quota/);
 const updated=await apply('one',one.row.revision,{title:'Updated at quota',format:'epub'});assert.equal(updated.accepted,true);
 await apply('one',0,{note:'study still syncs'},false,'bookmark','mark');
 const file=n=>`${C}/one/${String(n).repeat(64)}.epub`;
 // Mirror Storage's rolled-back permission probe (no trusted size yet), followed
 // by durable completion. A committed row with only declared contentLength fails.
 await db.exec('begin; savepoint storage_permission_probe');
 await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['aldus-private-library',file(9),{contentLength:1,mimetype:'application/epub+zip'}]);
 await db.exec('rollback to savepoint storage_permission_probe; commit');
 await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['aldus-private-library',file(9),{contentLength:1}]),/trusted storage size/);
 await db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['aldus-private-library',file(1),{size:8}]);
 await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['aldus-private-library',file(2),{size:3}]),/storage quota/);
 await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['aldus-private-library',file(3),{}]),/trusted storage size/);
 s=await snapshot();assert.deepEqual(s.usage,{syncedBooks:2,storageBytes:8});assert.deepEqual(s.remaining,{syncedBooks:0,storageBytes:2});
 // Storage completion runs as its trusted server role, not a client UPDATE.
 await db.exec('reset role');
 await assert.rejects(()=>db.query('update storage.objects set metadata=$1 where name=$2',[{size:11},file(1)]),/storage quota/);
 await db.query('update storage.objects set metadata=$1 where name=$2',[{size:10},file(1)]);
 await as(C);assert.equal((await snapshot()).remaining.storageBytes,0);
 // Deletion frees quota; receipt/CAS behavior remains owned by existing library_apply.
 await apply('two',two.row.revision,two.row.payload,true);assert.equal((await apply('three')).accepted,true);
 await as(A);s=await snapshot();assert.equal(s.usage.syncedBooks,101);assert.equal(s.usage.storageBytes,600000000);
 assert.deepEqual(s.remaining,{syncedBooks:0,storageBytes:0});
 assert.equal((await apply('legacy',legacy.row.revision,legacy.row.payload)).accepted,true);
 await apply('legacy',0,{percentage:.7},false,'progress','progress');
 assert.equal((await db.query('select * from storage.objects')).rows.length,1,'Over-quota files remain readable');
 await assert.rejects(()=>apply('new-over-quota'),/book quota/);
 // Backend grants independently of admin/master role. No client RPC to grant.
 await as(null,'service_role');await db.query("update public.saas_account_subscriptions set plan_id='pro',grant_source='trusted_backend' where user_id=$1",[C]);
 await db.query("insert into public.saas_account_entitlements values($1,'premium_future',true,null),($1,'library_sync',false,null)",[C]);
 await as(C);s=await snapshot();assert.equal(s.effectivePlan,'pro');assert.equal(s.plan.priceBrlCentavos,null);
 assert.equal(s.features.premium_future,true);assert.equal(s.features.library_sync,true,'Core Sync cannot be disabled by premium overrides');
 assert.deepEqual(s.limits,{syncedBooks:2000,storageBytes:10737418240});
 assert.equal((await apply('pro-book')).accepted,true);
 await db.exec('reset role');await db.query("update public.profiles set role='master' where id=$1",[B]);
 await as(B);assert.equal((await snapshot()).effectivePlan,'free','Master does not imply Pro');
 await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',['aldus-private-library',file(4),{size:1}]),/row-level security/);
 await as(null,'service_role');await db.query("update public.saas_account_subscriptions set ends_at=now()-interval '1 hour', starts_at=now()-interval '1 day' where user_id=$1",[C]);
 await as(C);s=await snapshot();assert.equal(s.effectivePlan,'free');assert.equal(s.subscription.status,'expired');
 await as(null,'service_role');await db.query("update public.saas_account_subscriptions set status='revoked' where user_id=$1",[C]);
 await as(C);assert.equal((await snapshot()).effectivePlan,'free');
 await db.exec('reset role');await db.query("update public.profiles set account_status='disabled' where id=$1",[C]);
 await as(C);await assert.rejects(snapshot,/active account/);await assert.rejects(()=>apply('disabled'),/active account/);
 assert.equal((await db.query('select * from public.saas_account_subscriptions')).rows.length,0);
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await as(D);await assert.rejects(snapshot,/active account/);
 await db.exec('reset role');await db.query("update public.profiles set account_status='active' where id=$1",[D]);
 await as(D);assert.equal((await snapshot()).effectivePlan,'free','Reactivated eligible account gets Free');
 await as(null,'anon');await assert.rejects(snapshot,/permission denied/);
 await assert.rejects(()=>db.exec('select * from public.saas_plans'),/permission denied/);
 // Unknown legacy size is preserved, explicitly unknown; blocks only storage growth.
 await db.exec('reset role');await db.exec('alter table storage.objects disable trigger saas_storage_quota');
 await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['aldus-private-library',`${A}/legacy/${'b'.repeat(64)}.epub`]);
 await db.exec('alter table storage.objects enable trigger saas_storage_quota');
 await as(A);s=await snapshot();assert.equal(s.usage.storageBytes,null);assert.equal(s.remaining.storageBytes,null);
 await db.exec('reset role');
 assert.equal((await db.query("select public from storage.buckets where id='aldus-private-library'")).rows[0].public,false);
 for(const name of ['assign_free()','effective_plan(uuid)','enforce_book_quota()','enforce_storage_quota()'])
   assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') as allowed",['saas_private.'+name])).rows[0].allowed,false);
 await db.close();console.log('PASS SaaS PostgreSQL: Free provisioning/backfill, preserved legacy rows/files/receipts, Free Sync/Storage, configurable quotas, existing-book UPSERT at cap, Pro trusted grant, expiry/revoke, master separation, A/B/anon/self escalation denied, disabled/reactivation, unknown sizes. Remote/Storage HTTP/concurrent devices pending.');
})().catch(error=>{console.error(error);process.exitCode=1});
