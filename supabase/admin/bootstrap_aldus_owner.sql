-- PREPARED ONLY. Requires explicit production authorization + migration inventory first.
-- Run through a trusted database connection, never the client/Data API.
-- Set aldus.bootstrap_owner_uuid to the real Auth UUID after independent identity review.
-- No account creation, email confirmation or fallback to another identity.
begin;
do $$ declare owner_id uuid; begin
 owner_id:=nullif(current_setting('aldus.bootstrap_owner_uuid',true),'')::uuid;
 if owner_id is null then raise exception 'Set the independently verified Auth UUID first'; end if;
 perform aldus_admin_private.bootstrap_owner('matheusborbaifc@gmail.com',owner_id);
end $$;
commit;
