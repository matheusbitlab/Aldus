-- Run in Supabase SQL Editor only after both accounts have signed up.
-- Replace NULL values below with the two auth.users UUIDs after verifying them.
-- Never put email addresses or passwords in this file.
do $$
declare master_id uuid := null;
        test_id uuid := null;
        affected integer;
begin
  if master_id is null or test_id is null or master_id = test_id then
    raise exception 'Set two distinct auth.users UUIDs before provisioning';
  end if;
  if not exists (select 1 from auth.users where id = master_id)
     or not exists (select 1 from auth.users where id = test_id) then
    raise exception 'One or both auth users do not exist';
  end if;
  update public.profiles set role = 'master', account_status = 'active' where id = master_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Master profile missing'; end if;
  update public.profiles set role = 'user', account_status = 'active' where id = test_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Test profile missing'; end if;
  insert into public.user_feature_overrides (user_id, feature_key, enabled)
  values (test_id, 'flashcards', false)
  on conflict (user_id, feature_key) do update set enabled = false;
end $$;
