-- Community Etapa 1 draft. CREATED ONLY; DO NOT APPLY REMOTELY on this old branch.
-- Review against the newer main/schema before integration.
begin;

create table public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 600),
  avatar_url text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 2048)),
  favorite_genres text[] not null default '{}' check (cardinality(favorite_genres) <= 20),
  favorite_authors text[] not null default '{}' check (cardinality(favorite_authors) <= 20),
  favorite_books text[] not null default '{}' check (cardinality(favorite_books) <= 20),
  goal_year integer check (goal_year between 2000 and 9999),
  goal_books integer check (goal_books between 1 and 10000),
  privacy text not null default 'PRIVATE' check (privacy in ('PUBLIC','FOLLOWERS','PRIVATE')),
  activity_privacy text not null default 'PRIVATE' check (activity_privacy in ('PUBLIC','FOLLOWERS','PRIVATE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((goal_year is null) = (goal_books is null))
);

-- All nullable measures mean unavailable. These derived records are server-owned.
create table public.community_reading_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started integer check (started >= 0), completed integer check (completed >= 0),
  reading integer check (reading >= 0), interrupted integer check (interrupted >= 0),
  abandoned integer check (abandoned >= 0), unread integer check (unread >= 0),
  pages_read bigint check (pages_read >= 0), reading_seconds bigint check (reading_seconds >= 0),
  streak integer check (streak >= 0),
  books_by_month jsonb, books_by_year jsonb, most_read_genres jsonb,
  updated_at timestamptz not null default now()
);

create table public.community_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 2000),
  type text not null check (type in ('started_book','finished_book','reading_streak','rated_book','updated_progress','achievement_unlocked','level_reached','joined_club','created_discussion')),
  book_id text, book_title text, label text,
  occurred_at timestamptz, -- null for observed states without a historical event date
  recorded_at timestamptz not null default now(),
  privacy text not null default 'PRIVATE' check (privacy in ('PUBLIC','FOLLOWERS','PRIVATE')),
  primary key (user_id, id)
);
create index community_activities_timeline_idx on public.community_activities (user_id, recorded_at desc);

-- No authenticated INSERT/UPDATE grants or policies: a future trusted server derives awards.
-- Never accept a client points total, new arbitrary completion revision or a level claim.
create table public.community_progression_awards (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 1 and 2000),
  event_type text not null check (event_type in ('BOOK_STARTED','BOOK_COMPLETED','READING_STREAK')),
  points integer not null,
  recorded_at timestamptz not null default now(),
  primary key (user_id, event_key),
  check ((event_type = 'BOOK_STARTED' and points = 10) or
    (event_type = 'BOOK_COMPLETED' and points = 100) or (event_type = 'READING_STREAK' and points = 5))
);
create table public.community_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create function public.community_profile_timestamps() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then NEW.created_at := pg_catalog.now();
  else NEW.created_at := OLD.created_at; end if;
  NEW.updated_at := pg_catalog.now();
  return NEW;
end;
$$;
create trigger community_profile_timestamps before insert or update on public.community_profiles
for each row execute function public.community_profile_timestamps();
revoke all on function public.community_profile_timestamps() from public, anon, authenticated;

alter table public.community_profiles enable row level security;
alter table public.community_reading_stats enable row level security;
alter table public.community_activities enable row level security;
alter table public.community_progression_awards enable row level security;
alter table public.community_achievements enable row level security;

revoke all on public.community_profiles, public.community_reading_stats, public.community_activities,
  public.community_progression_awards, public.community_achievements from public, anon, authenticated;
grant select on public.community_profiles, public.community_activities to anon, authenticated;
grant insert, update, delete on public.community_profiles to authenticated;
grant select on public.community_reading_stats, public.community_progression_awards, public.community_achievements to authenticated;

create policy community_profiles_read on public.community_profiles for select to anon, authenticated
  using (privacy = 'PUBLIC' or (select auth.uid()) = user_id);
-- FOLLOWERS deliberately remains owner-only until verified follow relationships exist.
create policy community_profiles_insert on public.community_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy community_profiles_update on public.community_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy community_profiles_delete on public.community_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy community_stats_owner_read on public.community_reading_stats for select to authenticated
  using ((select auth.uid()) = user_id);
create policy community_awards_owner_read on public.community_progression_awards for select to authenticated
  using ((select auth.uid()) = user_id);
create policy community_achievements_owner_read on public.community_achievements for select to authenticated
  using ((select auth.uid()) = user_id);
create policy community_activities_read on public.community_activities for select to anon, authenticated
  using ((select auth.uid()) = user_id or (privacy = 'PUBLIC' and exists (
    select 1 from public.community_profiles p where p.user_id = community_activities.user_id and p.privacy = 'PUBLIC'
  )));
-- Activities are server-owned too. Changing profile privacy cannot publish a private event.

comment on table public.community_profiles is 'Community foundation; public read only for PUBLIC profiles; FOLLOWERS fails closed.';
comment on table public.community_progression_awards is 'Server-derived awards; no client writes. Local points must never be imported as authoritative XP.';
commit;
