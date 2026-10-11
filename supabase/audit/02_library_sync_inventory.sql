-- Read-only inventory; run before deciding to deploy the new migration.
select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname like 'user_library_%';
select table_name,column_name,data_type,column_default,is_nullable
from information_schema.columns where table_schema='public' and table_name like 'user_library_%';
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where tablename like 'user_library_%' or (schemaname='storage' and tablename='objects');
select p.proname,p.prosecdef,p.proconfig,p.proacl,pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='library_apply';
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id='aldus-private-library';
select schemaname,tablename,indexname,indexdef from pg_indexes where tablename like 'user_library_%';
-- Also run 01_inventory.sql and inspect supabase_migrations.schema_migrations as admin.
