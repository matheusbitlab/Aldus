-- Read-only inventory for the Auth/RLS scope.
-- Run in the Supabase SQL Editor before applying any migration. Save the
-- results and compare them with the local migrations; do not infer remote
-- state from the migration files themselves.

-- 1. Relevant relations and effective RLS flags.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relkind as relation_kind,
  pg_get_userbyid(c.relowner) as owner,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p')
  and (
    (n.nspname = 'auth' and c.relname = 'users')
    or (n.nspname = 'public' and c.relname = any (array[
      'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
      'battles', 'study_sessions', 'card_reviews'
    ]))
  )
order by 1, 2;

-- 2. Columns, nullability, defaults, identity and generated expressions.
select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  is_identity,
  identity_generation,
  is_generated,
  generation_expression
from information_schema.columns
where (table_schema = 'auth' and table_name = 'users')
   or (table_schema = 'public' and table_name = any (array[
     'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
     'battles', 'study_sessions', 'card_reviews'
   ]))
order by table_schema, table_name, ordinal_position;

-- 3. PK, UNIQUE, FK, CHECK and exclusion constraints.
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  con.convalidated as validated,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'auth' and c.relname = 'users')
   or (n.nspname = 'public' and c.relname = any (array[
     'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
     'battles', 'study_sessions', 'card_reviews'
   ]))
order by 1, 2, 3;

-- 4. Indexes, including uniqueness, validity and predicates.
select
  n.nspname as schema_name,
  c.relname as table_name,
  i.relname as index_name,
  x.indisprimary as is_primary,
  x.indisunique as is_unique,
  x.indisvalid as is_valid,
  pg_get_expr(x.indpred, x.indrelid) as predicate,
  pg_get_indexdef(i.oid) as definition
from pg_index x
join pg_class c on c.oid = x.indrelid
join pg_class i on i.oid = x.indexrelid
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'auth' and c.relname = 'users')
   or (n.nspname = 'public' and c.relname = any (array[
     'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
     'battles', 'study_sessions', 'card_reviews'
   ]))
order by 1, 2, 3;

-- 5. Policies exactly as installed. Review qual/with_check for generic TRUE.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = any (array[
    'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
    'battles', 'study_sessions', 'card_reviews'
  ])
order by tablename, policyname;

-- 6. Table and column grants. Column grants matter for preventing updates to
-- role/account_status even when a user may update their own profile row.
select table_schema, table_name, grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where (table_schema = 'auth' and table_name = 'users')
   or (table_schema = 'public' and table_name = any (array[
     'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
     'battles', 'study_sessions', 'card_reviews'
   ]))
order by 1, 2, 3, 4;

select table_schema, table_name, column_name, grantee, privilege_type, is_grantable
from information_schema.role_column_grants
where table_schema = 'public'
  and table_name = any (array['profiles', 'user_feature_overrides'])
order by 1, 2, 3, 4, 5;

-- 7. User-defined triggers and their exact functions.
select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  pn.nspname as function_schema,
  p.proname as function_name,
  pg_get_triggerdef(t.oid, true) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal
  and (
    (n.nspname = 'auth' and c.relname = 'users')
    or (n.nspname = 'public' and c.relname = any (array[
      'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
      'battles', 'study_sessions', 'card_reviews'
    ]))
  )
order by 1, 2, 3;

-- 8. Public functions: owner, SECURITY DEFINER, configured search_path, ACL
-- and definition. Inspect every SECURITY DEFINER function, not just the
-- expected profile trigger.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  p.proacl as acl,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

select routine_schema, routine_name, grantee, privilege_type, is_grantable
from information_schema.role_routine_grants
where routine_schema = 'public'
order by 1, 2, 3, 4;

-- 9. Presence of Supabase's migration history relation. If present, inspect
-- its rows in the Dashboard/CLI before choosing any migration to apply.
select
  to_regclass('supabase_migrations.schema_migrations') as migration_history_relation,
  to_regclass('supabase_migrations.seed_files') as seed_history_relation;
