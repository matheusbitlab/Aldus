const fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(path.resolve('.expo/library-db-test/node_modules/@electric-sql/pglite'));
const ids={owner:'11111111-1111-4111-8111-111111111111',admin:'22222222-2222-4222-8222-222222222222',user:'33333333-3333-4333-8333-333333333333',unverified:'44444444-4444-4444-8444-444444444444',second:'55555555-5555-4555-8555-555555555555'};
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz,factor_id uuid,aal text);
 create table auth.mfa_factors(id uuid primary key,user_id uuid,status text,factor_type text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 grant usage on schema auth,storage to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id integer generated always as identity primary key,bucket_id text,name text,metadata jsonb);
 alter table storage.objects enable row level security; grant select,insert,update,delete on storage.objects to authenticated;
 grant usage on sequence storage.objects_id_seq to authenticated;`);
 for(const file of ['202610060001_profiles_and_features.sql','202610110001_private_account_library.sql','202610110002_private_library_file_recovery.sql','20261015160539_library_active_account_fences.sql','20261015190705_saas_plans_entitlements.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 for(const [name,id] of Object.entries(ids)){
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,name==='owner'?'matheusborbaifc@gmail.com':name+'@example.invalid',name==='unverified'?null:new Date().toISOString()]);
  await db.query("insert into auth.sessions(id,user_id,factor_id,aal) values($1,$1,$1,'aal2')",[id]);
  await db.query("insert into auth.mfa_factors values($1,$1,'verified','totp')",[id]);
 }
 await db.query("update public.profiles set role='master' where id=$1",[ids.user]);
 await db.query("update public.saas_account_subscriptions set plan_id='pro',grant_source='trusted_backend' where user_id=$1",[ids.user]);
 const before=(await db.query('select * from public.profiles order by id')).rows;
 const migration=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_aldus_admin.sql'));
 await db.exec(fs.readFileSync('supabase/migrations/'+migration,'utf8'));
 const as=async(name='owner',mfa=true,opts={})=>{
  await db.exec('reset role');const uid=ids[name]??name;
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid??'',JSON.stringify({sub:uid,session_id:opts.sessionId??uid,aal:mfa?'aal2':'aal1',amr:mfa?[{method:'totp',timestamp:Math.floor(Date.now()/1000)-(opts.age??0)}]:[],...opts.claims})]);
  await db.exec('set role '+(name===null?'anon':'authenticated'));
 };
 let request=0;
 const id=()=>`00000000-0000-4000-8000-${String(++request).padStart(12,'0')}`;
 const change=async(action,target,revision,payload,opts={})=>(await db.query('select public.aldus_admin_change($1,$2,$3,$4,$5,$6,$7) as r',[
  opts.requestId??id(),action,ids[target]??target,revision,JSON.stringify(payload),opts.reason??'Controlled local regression',opts.confirmation??'CONFIRMAR '+(ids[target]??target)])).rows[0].r;
 const read=async(section,filters={})=>(await db.query('select public.aldus_admin_read($1,$2) as r',[section,JSON.stringify(filters)])).rows[0].r;
 const session=async()=>(await db.query('select public.aldus_admin_session() as r')).rows[0].r;
 return{db,as,change,read,session,ids,id,before};
}
module.exports={fixture,ids};
