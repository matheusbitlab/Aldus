-- Immediate fail-closed lockdown for the six legacy tables flagged CRITICAL.
-- Do not add client policies until the live ownership/FK audit is reviewed.
do $$
declare table_name text;
begin
  foreach table_name in array array['users','decks','cards','card_reviews','study_sessions','battles'] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    end if;
  end loop;
end $$;
