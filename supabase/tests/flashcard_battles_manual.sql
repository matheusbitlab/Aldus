-- Run as database administrator in a TEST project after the migrations.
-- Replace the two UUIDs with distinct authenticated test accounts with active profiles/usernames.
-- Everything is rolled back; do not use accounts already in an active battle.
begin;
select set_config('flashcard_test.user_a','00000000-0000-4000-8000-000000000001',true);
select set_config('flashcard_test.user_b','00000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$
declare a uuid:=current_setting('flashcard_test.user_a')::uuid; b uuid:=current_setting('flashcard_test.user_b')::uuid;
  actor uuid; cards jsonb; state_a jsonb; state_b jsonb; match_id text; i integer; repeated jsonb;
begin
  if a=b then raise exception 'Use two different test accounts.'; end if;
  foreach actor in array array[a,b] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);
    if public.flashcard_battle('get')->>'status'<>'idle' then raise exception 'Test account already has a queue/match. Use idle test accounts.'; end if;
    select jsonb_agg(jsonb_build_object('id','fixture-'||g.card_number,'deckId','fixture-test','title','Flashcard '||g.card_number,'statement','Afirmação '||g.card_number,
      'isTrue',false,'explanation','Explicação '||g.card_number,'status','approved')) into cards from generate_series(1,3) g(card_number);
    perform public.flashcard_battle('upload',jsonb_build_object('deckId','fixture-test','title','Deck de teste','cards',cards));
    repeated:=public.flashcard_battle('join','{"deckId":"fixture-test","count":3}');
  end loop;
  match_id:=repeated->>'id';
  foreach actor in array array[a,b] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);
    perform public.flashcard_battle('confirm',jsonb_build_object('matchId',match_id));
  end loop;
  foreach actor in array array[a,b] loop
    perform set_config('request.jwt.claim.sub',actor::text,true);
    for i in 1..3 loop
      repeated:=public.flashcard_battle('get');
      if (repeated->'card') ? 'isTrue' or (repeated->'card') ? 'explanation' then raise exception 'Answer leaked before response.'; end if;
      repeated:=public.flashcard_battle('answer',jsonb_build_object('matchId',match_id,'ordinal',i,'choice','XX'));
      if (repeated->'answer'->>'points')::int<>10 then raise exception 'Invalid authoritative score.'; end if;
      state_a:=public.flashcard_battle('answer',jsonb_build_object('matchId',match_id,'ordinal',i,'choice','CHECK'));
      if state_a->'me'->'score'<>repeated->'me'->'score' or state_a->'answer'->>'choice'<>'XX' then raise exception 'Duplicate answer changed score or choice.'; end if;
      perform public.flashcard_battle('advance',jsonb_build_object('matchId',match_id,'ordinal',i));
    end loop;
    if actor=a and public.flashcard_battle('get')->>'status'<>'waiting' then raise exception 'First participant should wait.'; end if;
  end loop;
  perform set_config('request.jwt.claim.sub',a::text,true); state_a:=public.flashcard_battle('get');
  perform set_config('request.jwt.claim.sub',b::text,true); state_b:=public.flashcard_battle('get');
  if state_a->>'status'<>'complete' or state_b->>'status'<>'complete' or state_a->'winner'<>'null'::jsonb
    or state_b->'winner'<>'null'::jsonb or (state_a->'me'->>'score')::int<>30 or (state_b->'me'->>'score')::int<>30 then raise exception 'Final tie inconsistent.'; end if;
  raise notice 'PASS backend transactional exchange, hidden answers, idempotency, waiting and final tie. This is not a two-device app test.';
end;
$$;
rollback;
