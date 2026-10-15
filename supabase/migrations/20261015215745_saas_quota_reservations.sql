begin;
-- Additive ledger. Reservations never delete user data or Storage objects.
create table saas_private.upload_reservations (
 user_id uuid not null references public.profiles(id), path text not null,
 token uuid not null default gen_random_uuid(), bytes bigint not null check(bytes>0 and bytes<=536870912),
 expires_at timestamptz not null, state text not null check(state in ('reserved','cancelled','committed')),
 primary key(user_id,path)
);
alter table saas_private.upload_reservations enable row level security;
revoke all on saas_private.upload_reservations from public,anon,authenticated;
create index saas_reservations_active on saas_private.upload_reservations(user_id,expires_at) where state='reserved';
-- Legacy objects, unpublished uploads and orphans all count once by Storage object row.
create function saas_private.quota_usage(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with objects as (
  select name,metadata from storage.objects where bucket_id='aldus-private-library' and split_part(name,'/',1)=p_user::text
 ), reservations as (
  select r.bytes from saas_private.upload_reservations r where r.user_id=p_user and r.state='reserved'
  and r.expires_at>clock_timestamp() and not exists(select 1 from objects o where o.name=r.path)
 ) select jsonb_build_object(
  'syncedBooks',(select count(*) from public.user_library_items where user_id=p_user and kind='book' and deleted_at is null),
  'storageBytes',(select case when count(*) filter(where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]{1,15}$')=0
    then coalesce(sum(case when metadata->>'size' ~ '^[0-9]{1,15}$' then (metadata->>'size')::bigint else 0 end),0) else null end from objects),
  'objects',(select count(*) from objects),'reservedBytes',(select coalesce(sum(bytes),0) from reservations),
  'reservedUploads',(select count(*) from reservations));
$$;
revoke all on function saas_private.quota_usage(uuid) from public,anon,authenticated;
create function public.saas_quota_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.saas_plans; u jsonb;
begin
 if not public.library_account_active() then raise exception 'active account required' using errcode='42501'; end if;
 select * into p from public.saas_plans where id=saas_private.effective_plan(actor);
 u:=saas_private.quota_usage(actor);
 return jsonb_build_object('version',1,'userId',actor,'source','server_database','effectivePlan',p.id,
 'limits',jsonb_build_object('syncedBooks',p.synced_books,'storageBytes',p.storage_bytes),'usage',u,
 'remaining',jsonb_build_object('syncedBooks',greatest(0,p.synced_books-(u->>'syncedBooks')::bigint),
  'storageBytes',case when u->>'storageBytes' is null then null else greatest(0,p.storage_bytes-(u->>'storageBytes')::bigint-(u->>'reservedBytes')::bigint) end),
 'overLimit',(u->>'syncedBooks')::bigint>p.synced_books or coalesce((u->>'storageBytes')::bigint+(u->>'reservedBytes')::bigint>p.storage_bytes,false));
end $$;
revoke all on function public.saas_quota_snapshot() from public,anon,authenticated;
grant execute on function public.saas_quota_snapshot() to authenticated;

create function public.saas_reserve_upload(p_path text,p_bytes bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r saas_private.upload_reservations; u jsonb; cap bigint; actual bigint;
begin
 if not public.library_account_active() then raise exception 'active account required' using errcode='42501'; end if;
 -- One lock for every reservation and durable Storage completion of this account.
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'quota growth requires read committed' using errcode='25001'; end if;
 perform 1 from public.profiles where id=actor and account_status='active' for update;
 if not found then raise exception 'active account required' using errcode='42501'; end if;
 if p_path is null or not public.library_object_allowed(p_path,true) or p_bytes is null or p_bytes<=0 or p_bytes>536870912 then
  raise exception 'invalid private upload' using errcode='22023'; end if;
 select case when metadata->>'size' ~ '^[0-9]{1,15}$' then (metadata->>'size')::bigint end into actual
 from storage.objects where bucket_id='aldus-private-library' and name=p_path;
 if found then
  if actual is distinct from p_bytes then raise exception 'stored size mismatch' using errcode='22023'; end if;
  return jsonb_build_object('state','exists','token',null,'bytes',actual);
 end if;
 select * into r from saas_private.upload_reservations where user_id=actor and path=p_path;
 if found and r.state='reserved' and r.expires_at>clock_timestamp() then
  if r.bytes<>p_bytes then raise exception 'reservation identity reused' using errcode='22023'; end if;
  select storage_bytes into cap from public.saas_plans where id=saas_private.effective_plan(actor);
  u:=saas_private.quota_usage(actor);
  if u->>'storageBytes' is null or (u->>'storageBytes')::bigint+(u->>'reservedBytes')::bigint>cap then
   raise exception 'private storage quota exceeded' using errcode='PQL02'; end if;
  return jsonb_build_object('state','reserved','token',r.token,'bytes',r.bytes,'expiresAt',r.expires_at);
 end if;
 select storage_bytes into cap from public.saas_plans where id=saas_private.effective_plan(actor);
 u:=saas_private.quota_usage(actor);
 if u->>'storageBytes' is null or (u->>'storageBytes')::bigint+(u->>'reservedBytes')::bigint+p_bytes>cap then
  raise exception 'private storage quota exceeded or usage unknown' using errcode='PQL02'; end if;
 insert into saas_private.upload_reservations(user_id,path,bytes,expires_at,state)
 values(actor,p_path,p_bytes,clock_timestamp()+interval '15 minutes','reserved')
 on conflict(user_id,path) do update set token=gen_random_uuid(),bytes=excluded.bytes,expires_at=excluded.expires_at,state='reserved' returning * into r;
 return jsonb_build_object('state','reserved','token',r.token,'bytes',r.bytes,'expiresAt',r.expires_at);
end $$;
revoke all on function public.saas_reserve_upload(text,bigint) from public,anon,authenticated;
grant execute on function public.saas_reserve_upload(text,bigint) to authenticated;

create function public.saas_finish_upload(p_path text,p_token uuid,p_cancel boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); r saas_private.upload_reservations; actual bigint;
begin
 if not public.library_account_active() then raise exception 'active account required' using errcode='42501'; end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'quota growth requires read committed' using errcode='25001'; end if;
 perform 1 from public.profiles where id=actor and account_status='active' for update;
 if not found or split_part(p_path,'/',1) is distinct from actor::text then raise exception 'owner required' using errcode='42501'; end if;
 select * into r from saas_private.upload_reservations where user_id=actor and path=p_path;
 if not found or r.token is distinct from p_token then raise exception 'reservation unavailable' using errcode='22023'; end if;
 select case when metadata->>'size' ~ '^[0-9]{1,15}$' then (metadata->>'size')::bigint end into actual from storage.objects where bucket_id='aldus-private-library' and name=p_path;
 if found then
  if actual is distinct from r.bytes then raise exception 'stored size mismatch' using errcode='22023'; end if;
  update saas_private.upload_reservations set state='committed' where user_id=actor and path=p_path;
  return jsonb_build_object('state','committed','bytes',actual);
 end if;
 if p_cancel is true then
  update saas_private.upload_reservations set state='cancelled' where user_id=actor and path=p_path;
  return jsonb_build_object('state','cancelled');
 end if;
 raise exception 'upload not durably stored' using errcode='22023';
end $$;
revoke all on function public.saas_finish_upload(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.saas_finish_upload(text,uuid,boolean) to authenticated;

create function public.saas_upload_reserved(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.library_account_active() and split_part(p_path,'/',1)=auth.uid()::text and exists(
 select 1 from saas_private.upload_reservations where user_id=auth.uid() and path=p_path and state='reserved' and expires_at>clock_timestamp());
$$;
revoke all on function public.saas_upload_reserved(text) from public,anon,authenticated;
grant execute on function public.saas_upload_reserved(text) to authenticated;
create policy saas_upload_reservation_fence on storage.objects as restrictive for insert to authenticated with check (
 bucket_id<>'aldus-private-library' or public.saas_upload_reserved(name));

create or replace function saas_private.enforce_storage_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid; r saas_private.upload_reservations; u jsonb; cap bigint; actual bigint;
begin
 if new.bucket_id<>'aldus-private-library' then return new; end if;
 actor:=split_part(new.name,'/',1)::uuid;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'quota growth requires read committed' using errcode='25001'; end if;
 perform 1 from public.profiles where id=actor and account_status='active' for update;
 if not found then raise exception 'active account required' using errcode='42501'; end if;
 if new.metadata->>'size' is null or new.metadata->>'size' !~ '^[0-9]{1,15}$' then raise exception 'trusted storage size required' using errcode='22023'; end if;
 actual:=(new.metadata->>'size')::bigint;
 -- Unchanged legacy objects can be maintained even during downgrade; immutable client UPDATE remains forbidden.
 if tg_op='UPDATE' then
  if old.name=new.name and old.bucket_id=new.bucket_id and old.metadata->>'size' ~ '^[0-9]{1,15}$' and actual<=(old.metadata->>'size')::bigint then return new; end if;
 end if;
 select * into r from saas_private.upload_reservations where user_id=actor and path=new.name;
 if not found or r.state<>'reserved' or r.expires_at<=clock_timestamp() or actual<>r.bytes then
  raise exception 'active reservation and actual matching size required' using errcode='22023'; end if;
 select storage_bytes into cap from public.saas_plans where id=saas_private.effective_plan(actor);
 u:=saas_private.quota_usage(actor); -- Includes this object; excludes its reservation, preventing double charge.
 if u->>'storageBytes' is null or (u->>'storageBytes')::bigint+(u->>'reservedBytes')::bigint>cap then
  raise exception 'private storage quota exceeded' using errcode='PQL02'; end if;
 update saas_private.upload_reservations set state='committed' where user_id=actor and path=new.name;
 return new;
end $$;
-- Existing deferred constraint trigger is retained: Storage's rolled-back authorization probe never consumes a reservation.
create or replace function saas_private.enforce_book_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare cap bigint; used bigint;
begin
 if new.kind<>'book' or new.deleted_at is not null then return new; end if;
 if tg_op='UPDATE' then if old.kind='book' and old.deleted_at is null and old.user_id=new.user_id then return new; end if; end if;
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'quota growth requires read committed' using errcode='25001'; end if;
 perform 1 from public.profiles where id=new.user_id and account_status='active' for update;
 if not found then raise exception 'active account required' using errcode='42501'; end if;
 select synced_books into cap from public.saas_plans where id=saas_private.effective_plan(new.user_id);
 select count(*) into used from public.user_library_items where user_id=new.user_id and kind='book' and deleted_at is null;
 if used>cap then raise exception 'synced book quota exceeded' using errcode='PQL01'; end if;
 return new;
end $$;
notify pgrst, 'reload schema';
commit;
