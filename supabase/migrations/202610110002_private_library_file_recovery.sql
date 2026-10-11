-- Own unpublished objects must be verifiable after a lost upload response.
-- Own tombstoned objects must be SELECTable for Storage's safe DELETE API.
-- Access remains private to the account; upload still requires an active book.
begin;
create or replace function public.library_object_allowed(p_name text,p_upload boolean) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and split_part(p_name,'/',1)=auth.uid()::text
    and p_name ~ '^[a-f0-9-]{36}/[^/\\]{1,200}/[a-f0-9]{64}\.(epub|pdf)$'
    and exists(select 1 from public.user_library_items b where b.user_id=auth.uid() and b.kind='book'
      and b.id=split_part(p_name,'/',2) and (not p_upload or b.deleted_at is null));
$$;
drop policy aldus_library_read on storage.objects;
create policy aldus_library_read on storage.objects for select to authenticated using (
  bucket_id='aldus-private-library' and public.library_object_allowed(name,false)
);
commit;
