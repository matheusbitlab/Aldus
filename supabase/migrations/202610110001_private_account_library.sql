-- Incremental user library. Audit remote inventory before applying.
begin;
create sequence public.user_library_revision_seq;
create table public.user_library_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('book','progress','bookmark','highlight','organization','pdf_position')),
  id text not null check (length(id) between 1 and 200 and id !~ '[/\\]'),
  book_id text not null check (length(book_id) between 1 and 200 and book_id !~ '[/\\]'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 262144),
  revision bigint not null default nextval('public.user_library_revision_seq'),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, kind, id),
  check (kind <> 'book' or id = book_id)
);
create index user_library_items_book_idx on public.user_library_items(user_id,book_id);
create index user_library_items_revision_idx on public.user_library_items(user_id,revision);
create table public.user_library_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id,operation_id)
);
alter table public.user_library_items enable row level security;
alter table public.user_library_operations enable row level security;
revoke all on public.user_library_items, public.user_library_operations from public, anon, authenticated;
revoke all on sequence public.user_library_revision_seq from public, anon, authenticated;
grant select on public.user_library_items to authenticated;
create policy library_own_select on public.user_library_items for select to authenticated using ((select auth.uid()) = user_id);
-- Client writes go through CAS + receipts + server revision, never direct REST upsert.
create function public.library_apply(
  p_operation_id uuid, p_book_id text, p_kind text, p_entity_id text,
  p_expected_revision bigint, p_payload jsonb, p_deleted boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  previous public.user_library_items;
  result public.user_library_items;
  receipt public.user_library_operations;
  request jsonb := jsonb_build_object('book',p_book_id,'kind',p_kind,'id',p_entity_id,'base',p_expected_revision,'payload',p_payload,'deleted',p_deleted);
  answer jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_operation_id is null or p_deleted is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'invalid operation' using errcode='22023'; end if;
  -- Serialize all mutations of a book, including delete vs child mutation/receipt races.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || '/' || p_book_id,0));
  select * into receipt from public.user_library_operations where user_id=actor and operation_id=p_operation_id;
  if found then
    if receipt.request <> request then raise exception 'operation identity reused' using errcode='22023'; end if;
    return receipt.response;
  end if;
  select * into previous from public.user_library_items where user_id=actor and kind=p_kind and id=p_entity_id;
  if found and (previous.book_id <> p_book_id or previous.revision <> p_expected_revision or previous.deleted_at is not null) then
    return jsonb_build_object('accepted',false,'row',to_jsonb(previous));
  end if;
  if previous.id is null and p_expected_revision <> 0 then raise exception 'unknown revision' using errcode='22023'; end if;
  if p_kind <> 'book' and not exists(select 1 from public.user_library_items where user_id=actor and kind='book' and id=p_book_id and deleted_at is null) then
    raise exception 'book unavailable' using errcode='42501';
  end if;
  if p_kind='book' then
    if p_payload->>'format' is null or p_payload->>'format' not in ('epub','pdf') or p_payload->>'title' is null or p_entity_id <> p_book_id then raise exception 'invalid book' using errcode='22023'; end if;
    if p_payload ? 'remotePath' and p_payload->>'remotePath' is not null and
      (split_part(p_payload->>'remotePath','/',1) <> actor::text or split_part(p_payload->>'remotePath','/',2) <> p_book_id
       or p_payload->>'remotePath' !~ '^[a-f0-9-]{36}/[^/\\]{1,200}/[a-f0-9]{64}\.(epub|pdf)$') then
      raise exception 'invalid private path' using errcode='22023';
    end if;
  end if;
  insert into public.user_library_items(user_id,kind,id,book_id,payload,deleted_at)
    values(actor,p_kind,p_entity_id,p_book_id,p_payload,case when p_deleted then now() else null end)
  on conflict(user_id,kind,id) do update set payload=excluded.payload,deleted_at=excluded.deleted_at,
    revision=nextval('public.user_library_revision_seq'),updated_at=now()
  returning * into result;
  answer := jsonb_build_object('accepted',true,'row',to_jsonb(result));
  insert into public.user_library_operations(user_id,operation_id,request,response) values(actor,p_operation_id,request,answer);
  return answer;
end $$;
revoke all on function public.library_apply(uuid,text,text,text,bigint,jsonb,boolean) from public, anon;
grant execute on function public.library_apply(uuid,text,text,text,bigint,jsonb,boolean) to authenticated;

-- Never silently repurpose an existing public bucket.
do $$ begin
  if exists(select 1 from storage.buckets where id='aldus-private-library' and public) then
    raise exception 'Audit existing bucket before deploying private library';
  end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('aldus-private-library','aldus-private-library',false,536870912,array['application/epub+zip','application/pdf'])
  on conflict(id) do nothing;
create function public.library_object_allowed(p_name text,p_upload boolean) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and split_part(p_name,'/',1)=auth.uid()::text
    and exists(select 1 from public.user_library_items b where b.user_id=auth.uid() and b.kind='book'
      and b.id=split_part(p_name,'/',2) and b.deleted_at is null and (p_upload or b.payload->>'remotePath'=p_name));
$$;
revoke all on function public.library_object_allowed(text,boolean) from public;
grant execute on function public.library_object_allowed(text,boolean) to anon,authenticated;
create policy aldus_library_read on storage.objects for select to authenticated using (
  bucket_id='aldus-private-library' and split_part(name,'/',1)=(select auth.uid())::text
  and exists(select 1 from public.user_library_items b where b.user_id=(select auth.uid()) and b.kind='book'
    and b.id=split_part(name,'/',2) and b.deleted_at is null and b.payload->>'remotePath'=name)
);
create policy aldus_library_insert on storage.objects for insert to authenticated with check (
  bucket_id='aldus-private-library' and split_part(name,'/',1)=(select auth.uid())::text
  and name ~ '^[a-f0-9-]{36}/[^/\\]{1,200}/[a-f0-9]{64}\.(epub|pdf)$'
  and exists(select 1 from public.user_library_items b where b.user_id=(select auth.uid()) and b.kind='book'
    and b.id=split_part(name,'/',2) and b.deleted_at is null)
);
-- No UPDATE policy: content addressed objects are immutable, upload uses upsert=false.
create policy aldus_library_delete on storage.objects for delete to authenticated using (
  bucket_id='aldus-private-library' and split_part(name,'/',1)=(select auth.uid())::text
);
-- Restrictive fences also constrain unrelated pre-existing permissive Storage policies.
create policy aldus_library_read_fence on storage.objects as restrictive for select to public using (
  bucket_id <> 'aldus-private-library' or public.library_object_allowed(name,false)
);
create policy aldus_library_insert_fence on storage.objects as restrictive for insert to public with check (
  bucket_id <> 'aldus-private-library' or (
    split_part(name,'/',1)=(select auth.uid())::text
    and name ~ '^[a-f0-9-]{36}/[^/\\]{1,200}/[a-f0-9]{64}\.(epub|pdf)$'
    and public.library_object_allowed(name,true))
);
create policy aldus_library_update_fence on storage.objects as restrictive for update to public
  using (bucket_id <> 'aldus-private-library') with check (bucket_id <> 'aldus-private-library');
create policy aldus_library_delete_fence on storage.objects as restrictive for delete to public using (
  bucket_id <> 'aldus-private-library' or split_part(name,'/',1)=(select auth.uid())::text
);
commit;
