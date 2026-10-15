-- Read-only inventory; run before deciding to deploy the new migration.
select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname like 'user_library_%';
select table_name,column_name,data_type,column_default,is_nullable
from information_schema.columns where table_schema='public' and table_name like 'user_library_%';
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where tablename like 'user_library_%' or (schemaname='storage' and tablename='objects');
select n.nspname,p.proname,p.prosecdef,p.proconfig,p.proacl,pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','library_private')
and p.proname in ('library_apply','library_object_allowed','library_account_active');
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id='aldus-private-library';
select schemaname,tablename,indexname,indexdef from pg_indexes where tablename like 'user_library_%';
select c.relname,c.relkind,c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='user_library_revision_seq';
select to_regclass('supabase_migrations.schema_migrations') as migration_ledger;
-- Reported remote mappings: 20261015144958=202610090001_flashcard_battles;
-- 20261015145012=202610110001_private_account_library;
-- 20261015145018=202610110002_private_library_file_recovery. Do NOT reapply these.
-- If present, inspect versions/names before considering only 20261015160539 hardening.
-- Also run 01_inventory.sql. Do not infer deployment from public API visibility alone.
