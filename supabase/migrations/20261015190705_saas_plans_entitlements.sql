-- Stage 1 only. Requires profiles, private library/recovery and active-account fences.
-- Apply only after inventory reconciles the deployed historical migration versions.
begin;
create schema saas_private;
revoke all on schema saas_private from public, anon, authenticated;

create table public.saas_plans (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,63}$'),
  name text not null,
  price_brl_centavos integer check (price_brl_centavos >= 0),
  synced_books bigint not null check (synced_books > 0),
  storage_bytes bigint not null check (storage_bytes > 0),
  available boolean not null default true
);
create table public.saas_plan_features (
  plan_id text not null references public.saas_plans(id),
  feature text not null check (feature ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled boolean not null,
  primary key (plan_id, feature)
);
insert into public.saas_plans values
  ('free','Free',0,100,524288000,true),
  ('pro','Pro',null,2000,10737418240,true);
insert into public.saas_plan_features
select p.id,f,true from public.saas_plans p cross join unnest(array[
  'local_reading','book_import','library_sync','progress_sync','study_sync',
  'organization_sync','private_storage','basic_study']) f;

-- Subscription ownership is independent of profiles.role and user_feature_overrides.
-- No client writes, no payment provider, no user metadata/JWT plan claims.
create table public.saas_account_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_id text not null default 'free' references public.saas_plans(id),
  status text not null default 'active' check (status in ('active','trialing','expired','revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  grant_source text not null default 'server_default' check (grant_source in ('server_default','trusted_backend')),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
-- Reserved for trusted, account-specific future features; never add-on billing/quotas.
create table public.saas_account_entitlements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature ~ '^[a-z][a-z0-9_]{1,63}$'),
  enabled boolean not null,
  ends_at timestamptz,
  primary key (user_id, feature)
);
create trigger saas_subscription_updated_at before update on public.saas_account_subscriptions
for each row execute function public.auth_profile_updated_at();

alter table public.saas_plans enable row level security;
alter table public.saas_plan_features enable row level security;
alter table public.saas_account_subscriptions enable row level security;
alter table public.saas_account_entitlements enable row level security;
revoke all on public.saas_plans,public.saas_plan_features,public.saas_account_subscriptions,public.saas_account_entitlements from public,anon,authenticated;
grant select on public.saas_plans,public.saas_plan_features,public.saas_account_subscriptions,public.saas_account_entitlements to authenticated;
grant select,insert,update,delete on public.saas_plans,public.saas_plan_features,public.saas_account_subscriptions,public.saas_account_entitlements to service_role;
create policy saas_catalog_read on public.saas_plans for select to authenticated using (public.library_account_active());
create policy saas_features_read on public.saas_plan_features for select to authenticated using (public.library_account_active());
create policy saas_subscription_own on public.saas_account_subscriptions for select to authenticated using (user_id=(select auth.uid()) and public.library_account_active());
create policy saas_entitlements_own on public.saas_account_entitlements for select to authenticated using (user_id=(select auth.uid()) and public.library_account_active());

create function saas_private.assign_free() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.account_status='active' then
    insert into public.saas_account_subscriptions(user_id) values(new.id) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function saas_private.assign_free() from public,anon,authenticated;
create trigger saas_assign_free after insert or update of account_status on public.profiles
for each row execute function saas_private.assign_free();
-- Progressive, additive backfill: no changes to library, files, profiles or outbox.
insert into public.saas_account_subscriptions(user_id)
select id from public.profiles where account_status='active' on conflict do nothing;

create function saas_private.effective_plan(p_user uuid) returns text
language sql stable security definer set search_path='' as $$
  select coalesce((select s.plan_id from public.saas_account_subscriptions s
    where s.user_id=p_user and s.status in ('active','trialing')
    and s.starts_at<=now() and (s.ends_at is null or s.ends_at>now())), 'free');
$$;
revoke all on function saas_private.effective_plan(uuid) from public,anon,authenticated;

-- Counts every live remote book; files include staged/orphan/tombstoned objects until
-- confirmed cleanup. Size is Storage server metadata, never book JSON/user_metadata.
create function public.saas_account_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  actor uuid := auth.uid(); p public.saas_plans; s public.saas_account_subscriptions;
  books bigint; bytes bigint; unknown_sizes bigint; features jsonb;
begin
  if not public.library_account_active() then raise exception 'active account required' using errcode='42501'; end if;
  select * into p from public.saas_plans where id=saas_private.effective_plan(actor);
  select * into s from public.saas_account_subscriptions where user_id=actor;
  select count(*) into books from public.user_library_items where user_id=actor and kind='book' and deleted_at is null;
  select coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,15}$' then (metadata->>'size')::bigint else 0 end),0),
    count(*) filter(where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]{1,15}$')
    into bytes,unknown_sizes from storage.objects where bucket_id='aldus-private-library' and split_part(name,'/',1)=actor::text;
  select coalesce(jsonb_object_agg(feature,enabled),'{}') into features from (
    select feature,enabled from public.saas_plan_features where plan_id=p.id
    and feature not in (select feature from public.saas_account_entitlements where user_id=actor and (ends_at is null or ends_at>now()))
    union all select feature,enabled from public.saas_account_entitlements where user_id=actor and (ends_at is null or ends_at>now())
  ) f;
  -- Product baseline cannot be revoked by premium configuration or overrides.
  features := features || '{"local_reading":true,"book_import":true,"library_sync":true,"progress_sync":true,"study_sync":true,"organization_sync":true,"private_storage":true,"basic_study":true}'::jsonb;
  return jsonb_build_object('version',1,'userId',actor,'source','server_database','effectivePlan',p.id,
    'plan',jsonb_build_object('id',p.id,'name',p.name,'priceBrlCentavos',p.price_brl_centavos),
    'limits',jsonb_build_object('syncedBooks',p.synced_books,'storageBytes',p.storage_bytes),
    'usage',jsonb_build_object('syncedBooks',books,'storageBytes',case when unknown_sizes=0 then bytes else null end),
    'remaining',jsonb_build_object('syncedBooks',greatest(0,p.synced_books-books),'storageBytes',case when unknown_sizes=0 then greatest(0,p.storage_bytes-bytes) else null end),
    'features',features,'subscription',jsonb_build_object('planId',s.plan_id,'status',case
      when s.ends_at<=now() and s.status in ('active','trialing') then 'expired' else s.status end,
      'startsAt',s.starts_at,'endsAt',s.ends_at,'grantSource',s.grant_source));
end $$;
revoke all on function public.saas_account_snapshot() from public,anon,authenticated;
grant execute on function public.saas_account_snapshot() to authenticated;

-- Trigger protects RPCs AND future write paths. Lock one durable account row to serialize
-- quota growth across devices/books. READ COMMITTED is required by the Data API.
create function saas_private.enforce_book_quota() returns trigger
language plpgsql security definer set search_path='' as $$
declare max_books bigint; current_books bigint;
begin
  if new.kind<>'book' or new.deleted_at is not null then return new; end if;
  if tg_op='UPDATE' then
    if old.kind='book' and old.deleted_at is null and old.user_id=new.user_id then return new; end if;
  end if;
  perform 1 from public.profiles where id=new.user_id and account_status='active' for update;
  if not found then raise exception 'active account required' using errcode='42501'; end if;
  select synced_books into max_books from public.saas_plans where id=saas_private.effective_plan(new.user_id);
  select count(*) into current_books from public.user_library_items where user_id=new.user_id and kind='book' and deleted_at is null;
  if current_books>max_books then raise exception 'synced book quota exceeded' using errcode='P0001'; end if;
  return new;
end $$;
revoke all on function saas_private.enforce_book_quota() from public,anon,authenticated;
-- AFTER avoids charging the attempted INSERT side of an existing-book UPSERT.
create trigger saas_book_quota after insert or update on public.user_library_items
for each row execute function saas_private.enforce_book_quota();

create function saas_private.enforce_storage_quota() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid; bytes bigint; old_bytes bigint := 0; max_bytes bigint; used_bytes bigint; unknown_sizes bigint;
begin
  if new.bucket_id<>'aldus-private-library' then return new; end if;
  actor := split_part(new.name,'/',1)::uuid;
  perform 1 from public.profiles where id=actor and account_status='active' for update;
  if not found then raise exception 'active account required' using errcode='42501'; end if;
  if new.metadata->>'size' is null or new.metadata->>'size' !~ '^[0-9]{1,15}$' then
    raise exception 'trusted storage size required' using errcode='22023';
  end if;
  bytes := (new.metadata->>'size')::bigint;
  if tg_op='UPDATE' then
    if old.bucket_id=new.bucket_id and old.name=new.name and old.metadata->>'size' ~ '^[0-9]{1,15}$' then
      old_bytes := (old.metadata->>'size')::bigint;
      if bytes<=old_bytes then return new; end if;
    end if;
  end if;
  select storage_bytes into max_bytes from public.saas_plans where id=saas_private.effective_plan(actor);
  select coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,15}$' then (metadata->>'size')::bigint else 0 end),0),
    count(*) filter(where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]{1,15}$')
    into used_bytes,unknown_sizes from storage.objects where bucket_id='aldus-private-library' and split_part(name,'/',1)=actor::text
    and id<>new.id;
  if unknown_sizes>0 or used_bytes+bytes>max_bytes then
    raise exception 'private storage quota exceeded or usage unknown' using errcode='P0001';
  end if;
  return new;
end $$;
revoke all on function saas_private.enforce_storage_quota() from public,anon,authenticated;
-- Storage probes INSERT authorization inside a rolled-back savepoint before bytes exist.
-- Deferred events are discarded with that probe; only durable completion checks actual
-- server size. Never authorize byte consumption from request contentLength/user_metadata.
-- AFTER sees the new row, excluded from the aggregate above to avoid double charging.
create constraint trigger saas_storage_quota after insert or update on storage.objects
deferrable initially deferred
for each row execute function saas_private.enforce_storage_quota();
notify pgrst, 'reload schema';
commit;
