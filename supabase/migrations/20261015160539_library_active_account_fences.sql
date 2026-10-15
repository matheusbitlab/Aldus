-- Incremental hardening only. Requires the already deployed library migrations.
-- Do NOT replay 202610090001 / 202610110001 / 202610110002 or rewrite their ledger.
begin;

create schema library_private;
revoke all on schema library_private from public, anon, authenticated;

-- No user argument: callers can only learn their own authorization bit.
create function public.library_account_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.account_status = 'active'
  );
$$;
revoke all on function public.library_account_active() from public, anon, authenticated;
-- anon needs to evaluate restrictive Storage fences; it always receives false.
grant execute on function public.library_account_active() to anon, authenticated;

-- Preserve the deployed CAS/receipt implementation without copying or changing it.
alter function public.library_apply(uuid,text,text,text,bigint,jsonb,boolean) set schema library_private;
revoke all on function library_private.library_apply(uuid,text,text,text,bigint,jsonb,boolean) from public, anon, authenticated;
create function public.library_apply(
  p_operation_id uuid, p_book_id text, p_kind text, p_entity_id text,
  p_expected_revision bigint, p_payload jsonb, p_deleted boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.library_account_active() then
    raise exception 'active account required' using errcode = '42501';
  end if;
  return library_private.library_apply(p_operation_id,p_book_id,p_kind,p_entity_id,
    p_expected_revision,p_payload,p_deleted);
end;
$$;
revoke all on function public.library_apply(uuid,text,text,text,bigint,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.library_apply(uuid,text,text,text,bigint,jsonb,boolean) to authenticated;

create policy library_active_account_select on public.user_library_items
as restrictive for select to public using (public.library_account_active());
create policy aldus_library_active_read on storage.objects as restrictive for select to public
using (bucket_id <> 'aldus-private-library' or public.library_account_active());
create policy aldus_library_active_insert on storage.objects as restrictive for insert to public
with check (bucket_id <> 'aldus-private-library' or public.library_account_active());
create policy aldus_library_active_update on storage.objects as restrictive for update to public
using (bucket_id <> 'aldus-private-library' or public.library_account_active())
with check (bucket_id <> 'aldus-private-library' or public.library_account_active());
create policy aldus_library_active_delete on storage.objects as restrictive for delete to public
using (bucket_id <> 'aldus-private-library' or public.library_account_active());

-- Trigger execution remains valid without exposing a callable client API.
revoke all on function public.auth_profile_updated_at() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
