-- Does not modify the legacy public.users table or its foreign keys.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text not null default '',
  avatar_url text,
  role text not null default 'user' check (role in ('master','user')),
  account_status text not null default 'active' check (account_status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-z][a-z0-9_]{2,23}$'),
  constraint profiles_username_normalized check (username is null or username = lower(username))
);
create unique index if not exists profiles_username_unique_ci on public.profiles (lower(username)) where username is not null;

create table if not exists public.user_feature_overrides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null check (feature_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_key)
);

create or replace function public.auth_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists auth_profile_updated_at on public.profiles;
create trigger auth_profile_updated_at before update on public.profiles
for each row execute function public.auth_profile_updated_at();
drop trigger if exists auth_feature_updated_at on public.user_feature_overrides;
create trigger auth_feature_updated_at before update on public.user_feature_overrides
for each row execute function public.auth_profile_updated_at();

create or replace function public.auth_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare proposed_username text;
begin
  proposed_username := lower(trim(new.raw_user_meta_data->>'username'));
  if proposed_username is not null and proposed_username !~ '^[a-z][a-z0-9_]{2,23}$' then
    proposed_username := null;
  end if;
  insert into public.profiles (id, username, display_name, avatar_url, role, account_status)
  values (new.id, proposed_username,
          left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
                        nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''), 120),
          nullif(new.raw_user_meta_data->>'avatar_url', ''), 'user', 'active')
  on conflict (id) do nothing;
  return new;
end; $$;
revoke all on function public.auth_create_profile() from public, anon, authenticated;
drop trigger if exists auth_user_to_profile on auth.users;
create trigger auth_user_to_profile after insert on auth.users
for each row execute function public.auth_create_profile();

-- Existing auth users receive a profile. Legacy public.users is deliberately untouched.
insert into public.profiles (id, display_name, avatar_url, role, account_status)
select id,
       left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''),
                     nullif(trim(raw_user_meta_data->>'full_name'), ''), ''), 120),
       nullif(raw_user_meta_data->>'avatar_url', ''), 'user', 'active'
from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_feature_overrides enable row level security;
revoke all on public.profiles from public, anon, authenticated;
revoke all on public.user_feature_overrides from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;
grant select on public.user_feature_overrides to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated
using (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid()) and account_status = 'active')
with check (id = (select auth.uid()) and account_status = 'active');
drop policy if exists feature_overrides_select_own on public.user_feature_overrides;
create policy feature_overrides_select_own on public.user_feature_overrides for select to authenticated
using (user_id = (select auth.uid()));
