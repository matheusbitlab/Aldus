const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ids=Object.fromEntries(['freeA','freeB','pro','disabled','owner','admin'].map((k,i)=>[k,`aaaaaaaa-aaaa-4aaa-8aaa-${String(i+1).padStart(12,'0')}`]));
const pending=['20261015160539_library_active_account_fences.sql','20261015190705_saas_plans_entitlements.sql','20261015194604_aldus_admin.sql','20261015215745_saas_quota_reservations.sql'];
const historical=[['20261015144958','202610090001_flashcard_battles.sql'],['20261015145012','202610110001_private_account_library.sql'],['20261015145018','202610110002_private_library_file_recovery.sql']];
const source=file=>fs.readFileSync(path.resolve('supabase/migrations',file),'utf8');
const digest=sql=>crypto.createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');
const bytes=Buffer.from('SYNTHETIC'),hash=crypto.createHash('sha256').update(bytes).digest('hex');
const legacyPath=`${ids.freeB}/legacy/${hash}.epub`;
async function baseline(c){
 await c.query(`create schema auth;create schema storage;create schema supabase_migrations;
 create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[],source_hash text);
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}',deleted_at timestamptz,banned_until timestamptz);
 create type auth.aal_level as enum('aal1','aal2');create type auth.factor_status as enum('unverified','verified');create type auth.factor_type as enum('totp','phone','webauthn');
 create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users(id),status auth.factor_status,factor_type auth.factor_type);
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),not_after timestamptz,factor_id uuid references auth.mfa_factors(id),aal auth.aal_level);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth,storage to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[],versioning_status text not null default 'DISABLED');
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,user_metadata jsonb,version text,archived_at timestamptz,is_delete_marker boolean not null default false,is_versioned boolean not null default false);
 create unique index idx_objects_null_version on storage.objects(bucket_id,name) where not is_versioned;
 create unique index idx_objects_current_version on storage.objects(bucket_id,name) where archived_at is null;
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;
 `);
 await c.query(source('202610060001_profiles_and_features.sql'));
 for(const [version,file] of historical){await c.query(source(file));await c.query('insert into supabase_migrations.schema_migrations values($1,$2,$3,$4)',[version,file.slice(13,-4),[source(file)],digest(source(file))]);}
 for(const [name,id] of Object.entries(ids)){
  await c.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,name.toLowerCase()+'@aldus.example.invalid']);
  await c.query("insert into auth.mfa_factors values($1,$1,'verified','totp')",[id]);
  await c.query("insert into auth.sessions values($1,$1,null,$1,'aal2')",[id]);
 }
 await c.query("update public.profiles set account_status='disabled' where id=$1",[ids.disabled]);
 await c.query(`insert into public.user_library_items(user_id,kind,id,book_id,payload) values
 ($1,'book','legacy','legacy','{"title":"SYNTHETIC legacy","format":"epub"}'),
 ($1,'progress','progress','legacy','{"percentage":0.4}'),
 ($1,'bookmark','note','legacy','{"note":"SYNTHETIC private note"}'),
 ($1,'highlight','highlight','legacy','{"text":"SYNTHETIC private highlight"}'),
 ($1,'organization','legacy','legacy','{"favorite":true}')`,[ids.freeB]);
 await c.query("insert into storage.objects(bucket_id,name,metadata) values('aldus-private-library',$1,$2)",[legacyPath,{size:bytes.length}]);
}
async function migrate(c,file){
 const sql=source(file),version=file.split('_')[0],hash=digest(sql);
 const old=(await c.query('select source_hash from supabase_migrations.schema_migrations where version=$1',[version])).rows[0];
 if(old){if(old.source_hash!==hash)throw Error('Migration checksum differs');return 'already_applied';}
 await c.query(sql);await c.query('insert into supabase_migrations.schema_migrations values($1,$2,$3,$4)',[version,file.slice(version.length+1,-4),[sql],hash]);return 'applied';
}
async function as(c,name,{mfa=true,age=0}={}){
 await c.query('reset role');const id=ids[name];
 await c.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id??'',JSON.stringify({sub:id,session_id:id,aal:mfa?'aal2':'aal1',amr:mfa?[{method:'totp',timestamp:Math.floor(Date.now()/1000)-age}]:[]})]);
 await c.query('set role '+(name===null?'anon':'authenticated'));
}
async function snapshot(c){return (await c.query('select public.saas_quota_snapshot() as r')).rows[0].r;}
async function apply(c,book,base=0,payload={title:'SYNTHETIC book',format:'epub'},kind='book',id=book){return (await c.query('select public.library_apply($1,$2,$3,$4,$5,$6,false) as r',[crypto.randomUUID(),book,kind,id,base,payload])).rows[0].r;}
async function reserve(c,p,size){return (await c.query('select public.saas_reserve_upload($1,$2) as r',[p,size])).rows[0].r;}
const objectPath=(who,book,character='a')=>`${ids[who]}/${book}/${character.repeat(64)}.epub`;
module.exports={ids,pending,historical,baseline,migrate,as,snapshot,apply,reserve,objectPath,bytes,legacyPath,digest,source};
