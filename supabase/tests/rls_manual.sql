-- Run in a disposable/test project after the two migrations. No data is committed.
-- Replace the two empty strings with distinct, existing auth.users UUIDs.
begin;
select set_config('request.jwt.claim.sub', '', true); -- User A UUID
select set_config('app.test_user_b', '', true);        -- User B UUID
set local role authenticated;

do $$
declare actor uuid;
        other uuid;
        affected integer;
        legacy_table text;
        operation text;
begin
  actor := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  other := nullif(current_setting('app.test_user_b', true), '')::uuid;
  if actor is null or other is null or actor = other then
    raise exception 'Supply two different auth user UUIDs';
  end if;
  if (select count(*) from public.profiles) <> 1
     or not exists (select 1 from public.profiles where id = actor) then
    raise exception 'Profile SELECT did not isolate user A';
  end if;
  if exists (select 1 from public.user_feature_overrides where user_id <> actor) then
    raise exception 'Feature SELECT exposed user B';
  end if;
  update public.profiles set display_name = display_name where id = other;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User A updated user B profile'; end if;
  if has_column_privilege(current_user, 'public.profiles', 'role', 'UPDATE')
     or has_column_privilege(current_user, 'public.profiles', 'account_status', 'UPDATE')
     or has_table_privilege(current_user, 'public.profiles', 'INSERT')
     or has_table_privilege(current_user, 'public.profiles', 'DELETE') then
    raise exception 'Profile privileged operation exposed';
  end if;
  if has_table_privilege(current_user, 'public.user_feature_overrides', 'INSERT')
     or has_table_privilege(current_user, 'public.user_feature_overrides', 'UPDATE')
     or has_table_privilege(current_user, 'public.user_feature_overrides', 'DELETE') then
    raise exception 'Feature override mutation exposed';
  end if;
  foreach legacy_table in array array['users','decks','cards','card_reviews','study_sessions','battles'] loop
    if to_regclass(format('public.%I', legacy_table)) is null then
      raise exception 'Expected legacy table % absent', legacy_table;
    end if;
    foreach operation in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if has_table_privilege(current_user, format('public.%I', legacy_table), operation) then
        raise exception 'Legacy table %.% still grants %', 'public', legacy_table, operation;
      end if;
    end loop;
  end loop;
end $$;
rollback;

-- Repeat the same block swapping A/B. Also exercise real client requests with
-- both sessions: B must not read/change A; neither client can use legacy study
-- tables until ownership is mapped to auth.users in a later migration.
