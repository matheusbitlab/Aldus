-- Read-only inventory. Run in the Supabase SQL Editor before applying migrations.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and n.nspname in ('public', 'auth')
order by 1, 2;

select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema in ('public', 'auth')
  and (table_schema = 'public' or table_name = 'users')
order by table_schema, table_name, ordinal_position;

select conrelid::regclass as source_table, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f' and connamespace in ('public'::regnamespace, 'auth'::regnamespace)
order by 1, 2;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

select n.nspname as schema_name, c.relname as table_name, i.relname as index_name,
       pg_get_indexdef(i.oid) as definition
from pg_index x join pg_class c on c.oid=x.indrelid
join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' order by c.relname,i.relname;

select event_object_schema, event_object_table, trigger_name, action_statement
from information_schema.triggers where event_object_schema in ('public','auth')
order by event_object_schema,event_object_table,trigger_name;

select n.nspname as schema_name, p.proname as function_name,
       p.prosecdef as security_definer, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by p.proname;
