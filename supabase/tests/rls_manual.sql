-- Run in a disposable/test project only after the remote inventory is known.
-- The transaction is rolled back. Replace the two empty strings with distinct
-- existing auth.users UUIDs; never put emails, passwords or tokens here.
begin;

select set_config('app.test_user_a', '', true); -- User A UUID
select set_config('app.test_user_b', '', true); -- User B UUID

set local role authenticated;

do $$
declare
  user_a uuid := nullif(current_setting('app.test_user_a', true), '')::uuid;
  user_b uuid := nullif(current_setting('app.test_user_b', true), '')::uuid;
  actor uuid;
  other uuid;
  affected integer;
  legacy_table text;
  operation text;
  promotion_blocked boolean;
  override_blocked boolean;
begin
  if user_a is null or user_b is null or user_a = user_b then
    raise exception 'Supply two different auth user UUIDs';
  end if;

  foreach actor in array array[user_a, user_b] loop
    other := case when actor = user_a then user_b else user_a end;
    perform set_config('request.jwt.claim.sub', actor::text, true);

    if (select count(*) from public.profiles) <> 1
       or not exists (select 1 from public.profiles where id = actor) then
      raise exception 'Profile SELECT did not isolate actor %', actor;
    end if;

    if exists (
      select 1 from public.user_feature_overrides where user_id <> actor
    ) then
      raise exception 'Feature SELECT exposed the other user to actor %', actor;
    end if;

    update public.profiles
    set display_name = display_name
    where id = actor;
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'Actor % could not update an allowed own-profile column', actor;
    end if;

    update public.profiles
    set display_name = display_name
    where id = other;
    get diagnostics affected = row_count;
    if affected <> 0 then
      raise exception 'Actor % updated other profile %', actor, other;
    end if;

    if has_column_privilege(current_user, 'public.profiles', 'role', 'UPDATE')
       or has_column_privilege(current_user, 'public.profiles', 'account_status', 'UPDATE')
       or has_table_privilege(current_user, 'public.profiles', 'INSERT')
       or has_table_privilege(current_user, 'public.profiles', 'DELETE') then
      raise exception 'Profile privileged operation exposed to actor %', actor;
    end if;

    promotion_blocked := false;
    begin
      update public.profiles set role = 'master' where id = actor;
    exception when insufficient_privilege then
      promotion_blocked := true;
    end;
    if not promotion_blocked then
      raise exception 'Actor % could attempt role self-promotion', actor;
    end if;

    if has_table_privilege(current_user, 'public.user_feature_overrides', 'INSERT')
       or has_table_privilege(current_user, 'public.user_feature_overrides', 'UPDATE')
       or has_table_privilege(current_user, 'public.user_feature_overrides', 'DELETE') then
      raise exception 'Feature override mutation privilege exposed to actor %', actor;
    end if;

    override_blocked := false;
    begin
      insert into public.user_feature_overrides (user_id, feature_key, enabled)
      values (actor, 'flashcards', true);
    exception when insufficient_privilege then
      override_blocked := true;
    end;
    if not override_blocked then
      raise exception 'Actor % could create a privileged feature override', actor;
    end if;

    foreach legacy_table in array array[
      'users', 'decks', 'cards', 'card_reviews', 'study_sessions', 'battles'
    ] loop
      if to_regclass(format('public.%I', legacy_table)) is null then
        continue;
      end if;
      foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
        if has_table_privilege(
          current_user,
          format('public.%I', legacy_table),
          operation
        ) then
          raise exception 'Legacy table public.% still grants % to authenticated',
            legacy_table, operation;
        end if;
      end loop;
    end loop;
  end loop;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  private_table text;
  operation text;
begin
  foreach private_table in array array[
    'profiles', 'user_feature_overrides', 'users', 'decks', 'cards',
    'card_reviews', 'study_sessions', 'battles'
  ] loop
    if to_regclass(format('public.%I', private_table)) is null then
      continue;
    end if;
    foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if has_table_privilege(
        current_user,
        format('public.%I', private_table),
        operation
      ) then
        raise exception 'Anonymous role has % on public.%', operation, private_table;
      end if;
    end loop;
  end loop;
end $$;

rollback;
