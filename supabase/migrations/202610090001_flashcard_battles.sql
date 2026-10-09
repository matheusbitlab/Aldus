-- Additive: existing Reader/Auth/local decks are not modified.
-- Only the RPC is exposed. Secret snapshots and authoritative results remain private.
begin;
create schema if not exists flashcard_private;
revoke all on schema flashcard_private from public, anon, authenticated;

create table flashcard_private.decks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  title text not null,
  cards jsonb not null check (jsonb_typeof(cards) = 'array'),
  primary key (owner_id, local_id)
);
create table flashcard_private.scoring_rules (
  version integer primary key,
  high_points integer not null check(high_points>0),
  low_points integer not null check(low_points>0 and low_points<high_points)
);
insert into flashcard_private.scoring_rules values(1,10,5);
create table flashcard_private.matches (
  id uuid primary key default gen_random_uuid(),
  count integer not null check (count in (3,5,10,15)),
  status text not null check (status in ('confirmation','active','complete','cancelled')),
  scoring_version integer not null default 1 references flashcard_private.scoring_rules(version),
  created_at timestamptz not null default now()
);
create table flashcard_private.members (
  match_id uuid not null references flashcard_private.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id text not null,
  deck_title text not null,
  confirmed boolean not null default false,
  cursor integer not null default 1 check (cursor >= 1),
  primary key (match_id,user_id)
);
create table flashcard_private.queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  deck_id text not null,
  count integer not null check (count in (3,5,10,15)),
  match_id uuid references flashcard_private.matches(id),
  created_at timestamptz not null default now()
);
create table flashcard_private.items (
  match_id uuid not null,
  receiver_id uuid not null,
  ordinal integer not null check (ordinal >= 1),
  card jsonb not null,
  choice text check (choice in ('XX','X','CHECK','DOUBLE_CHECK')),
  correct boolean,
  points integer,
  answered_at timestamptz,
  primary key(match_id,receiver_id,ordinal),
  foreign key(match_id,receiver_id) references flashcard_private.members(match_id,user_id) on delete cascade
);
alter table flashcard_private.decks enable row level security;
alter table flashcard_private.matches enable row level security;
alter table flashcard_private.members enable row level security;
alter table flashcard_private.queue enable row level security;
alter table flashcard_private.items enable row level security;
alter table flashcard_private.scoring_rules enable row level security;
revoke all on flashcard_private.decks, flashcard_private.matches, flashcard_private.members,
  flashcard_private.queue, flashcard_private.items, flashcard_private.scoring_rules from public, anon, authenticated;

create function flashcard_private.valid_drawing(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare stroke jsonb; point jsonb; points_count integer:=0; width numeric; height numeric;
begin
  if value is null or value='null'::jsonb then return true; end if;
  if jsonb_typeof(value)<>'object' or jsonb_typeof(value->'width') is distinct from 'number' or jsonb_typeof(value->'height') is distinct from 'number'
    or jsonb_typeof(value->'strokes') is distinct from 'array' or pg_catalog.octet_length(value::text)>200000 then return false; end if;
  width:=(value->>'width')::numeric; height:=(value->>'height')::numeric;
  if width not between 1 and 2048 or height not between 1 and 2048 then return false; end if;
  for stroke in select v from jsonb_array_elements(value->'strokes') s(v) loop
    if jsonb_typeof(stroke)<>'array' then return false; end if;
    points_count:=points_count+jsonb_array_length(stroke);
    if points_count>2500 then return false; end if;
    for point in select v from jsonb_array_elements(stroke) s(v) loop
      if jsonb_typeof(point)<>'object' or jsonb_typeof(point->'x') is distinct from 'number' or jsonb_typeof(point->'y') is distinct from 'number' then return false; end if;
      if (point->>'x')::numeric not between 0 and width or (point->>'y')::numeric not between 0 and height then return false; end if;
    end loop;
  end loop;
  return true;
end;
$$;

create function flashcard_private.evaluation(item flashcard_private.items)
returns jsonb language sql immutable set search_path = '' as $$
  select case when item.choice is null then null else jsonb_build_object(
    'cardId', item.card->>'id', 'choice', item.choice,
    'symbol',case item.choice when 'CHECK' then '✓' when 'DOUBLE_CHECK' then '✓✓' else item.choice end,
    'userJudgment',item.choice in ('CHECK','DOUBLE_CHECK'),
    'confidence',case when item.choice in ('XX','DOUBLE_CHECK') then 'HIGH' else 'LOW' end,
    'isCorrect',item.correct,'points',item.points,'mode','battle',
    'answeredAt',extract(epoch from item.answered_at)*1000) end;
$$;

create function flashcard_private.state(uid uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare q flashcard_private.queue; m flashcard_private.matches; member flashcard_private.members;
  opponent flashcard_private.members; current_item flashcard_private.items;
  mine jsonb; theirs jsonb; my_answers int; their_answers int; my_score int; their_score int;
begin
  select * into q from flashcard_private.queue where user_id=uid;
  if not found then return jsonb_build_object('status','idle'); end if;
  if q.match_id is null then return jsonb_build_object('status','searching','count',q.count); end if;
  select * into m from flashcard_private.matches where id=q.match_id;
  select * into member from flashcard_private.members where match_id=m.id and user_id=uid;
  if not found then raise exception 'Você não participa desta partida.'; end if;
  select * into opponent from flashcard_private.members where match_id=m.id and user_id<>uid;
  select count(*) filter(where choice is not null),coalesce(sum(points),0) into my_answers,my_score from flashcard_private.items where match_id=m.id and receiver_id=uid;
  select count(*) filter(where choice is not null),coalesce(sum(points),0) into their_answers,their_score from flashcard_private.items where match_id=m.id and receiver_id=opponent.user_id;
  select jsonb_build_object('id',member.user_id,'name',coalesce(nullif(p.display_name,''),p.username,'Participante'),
    'deckTitle',member.deck_title,'confirmed',member.confirmed,'answered',my_answers,'score',my_score,'cursor',member.cursor,
    'correct',(select count(*) from flashcard_private.items where match_id=m.id and receiver_id=uid and correct)) into mine from public.profiles p where p.id=uid;
  select jsonb_build_object('id',opponent.user_id,'name',coalesce(nullif(p.display_name,''),p.username,'Adversário'),
    'deckTitle',opponent.deck_title,'confirmed',opponent.confirmed,'answered',their_answers,'score',their_score,'cursor',opponent.cursor,
    'correct',(select count(*) from flashcard_private.items where match_id=m.id and receiver_id=opponent.user_id and correct)) into theirs from public.profiles p where p.id=opponent.user_id;
  select * into current_item from flashcard_private.items where match_id=m.id and receiver_id=uid and ordinal=member.cursor;
  return jsonb_build_object(
    'status',case when m.status='active' and member.cursor>m.count then 'waiting' else m.status end,
    'id',m.id,'count',m.count,'me',mine,'opponent',theirs,
    'card',case when current_item.ordinal is null then null when current_item.choice is null then
      jsonb_build_object('id',current_item.card->>'id','title',current_item.card->>'title','statement',current_item.card->>'statement',
        'front',current_item.card->>'statement','imageUrl',current_item.card->'imageUrl','drawing',current_item.card->'drawing')
      else current_item.card end,
    'answer',flashcard_private.evaluation(current_item),
    'winner',case when m.status<>'complete' or my_score=their_score then null when my_score>their_score then uid else opponent.user_id end,
    'history',case when m.status='complete' then (select coalesce(jsonb_agg(jsonb_build_object('card',i.card,'answer',flashcard_private.evaluation(i)) order by i.ordinal),'[]'::jsonb) from flashcard_private.items i where i.match_id=m.id and i.receiver_id=uid) else null end);
end;
$$;

create function public.flashcard_battle(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); q flashcard_private.queue; peer flashcard_private.queue;
  m flashcard_private.matches; member flashcard_private.members; opponent flashcard_private.members;
  d flashcard_private.decks; item flashcard_private.items; c jsonb; quantity int; selected_choice text;
  new_match_id uuid; magnitude int; answer_correct boolean; ord int; high_points int; low_points int; safe_cards jsonb;
begin
  if uid is null then raise exception 'Entre na sua conta para participar.'; end if;
  if not exists(select 1 from public.profiles p where p.id=uid and p.account_status='active' and p.username is not null
    and (p.role='master' or coalesce((select enabled from public.user_feature_overrides where user_id=uid and feature_key='flashcards'),true))) then
    raise exception 'Flashcards não estão disponíveis para esta conta.';
  end if;
  -- One transactional coordinator: join/cancel/confirmation/answer races serialize.
  perform pg_catalog.pg_advisory_xact_lock(610090001);
  select * into q from flashcard_private.queue where user_id=uid;
  if action='get' then return flashcard_private.state(uid); end if;
  if action='upload' then
    if length(coalesce(payload->>'deckId','')) not between 1 and 160 or length(coalesce(payload->>'title','')) not between 1 and 240
      or jsonb_typeof(payload->'cards') is distinct from 'array' or pg_catalog.octet_length(payload::text)>16000000 then raise exception 'Deck inválido ou muito grande (máximo 16 MB).'; end if;
    if jsonb_array_length(payload->'cards') not between 1 and 500 then raise exception 'Envie entre 1 e 500 flashcards completos.'; end if;
    for c in select value from jsonb_array_elements(payload->'cards') loop
      if jsonb_typeof(c->'title') is distinct from 'string' or jsonb_typeof(c->'statement') is distinct from 'string'
        or jsonb_typeof(c->'explanation') is distinct from 'string' then raise exception 'Use texto no título, afirmação e explicação.'; end if;
      if length(trim(coalesce(c->>'id',''))) not between 1 and 160 or length(trim(coalesce(c->>'title',''))) not between 1 and 240
        or length(trim(coalesce(c->>'statement',''))) not between 1 and 20000 or length(trim(coalesce(c->>'explanation',''))) not between 1 and 30000
        or jsonb_typeof(c->'isTrue') is distinct from 'boolean' or c->>'status' is distinct from 'approved'
        or c->>'deckId' is distinct from payload->>'deckId' then raise exception 'Revise os campos obrigatórios dos flashcards.'; end if;
      if c->>'imageUrl' is not null and c->>'imageUrl'<>'' and (length(c->>'imageUrl')>4300000 or not (c->>'imageUrl' ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$')) then raise exception 'Reanexe a imagem para disponibilizá-la nesta batalha.'; end if;
      if not flashcard_private.valid_drawing(c->'drawing') then raise exception 'Desenho inválido.'; end if;
    end loop;
    if (select count(distinct value->>'id') from jsonb_array_elements(payload->'cards'))<>jsonb_array_length(payload->'cards') then raise exception 'Flashcards duplicados no deck.'; end if;
    -- Whitelist fields: never publish caller-supplied source metadata or executable markup.
    select jsonb_agg(jsonb_build_object('id',v->>'id','deckId',payload->>'deckId','title',v->>'title',
      'statement',v->>'statement','front',v->>'statement','isTrue',v->'isTrue','explanation',v->>'explanation','back',v->>'explanation',
      'imageUrl',v->'imageUrl','drawing',v->'drawing','status','approved','source',jsonb_build_object('kind','manual'))) into safe_cards from jsonb_array_elements(payload->'cards') s(v);
    insert into flashcard_private.decks(owner_id,local_id,title,cards) values(uid,payload->>'deckId',payload->>'title',safe_cards)
      on conflict(owner_id,local_id) do update set title=excluded.title,cards=excluded.cards;
    return flashcard_private.state(uid);
  elsif action='join' then
    if q.user_id is not null then return flashcard_private.state(uid); end if;
    quantity:=(payload->>'count')::int;
    if quantity is null or quantity not in (3,5,10,15) then raise exception 'Escolha 3, 5, 10 ou 15 flashcards.'; end if;
    select * into d from flashcard_private.decks where owner_id=uid and local_id=payload->>'deckId';
    if not found or jsonb_array_length(d.cards)<quantity then raise exception 'Deck insuficiente. Escolha outro deck ou uma quantidade menor.'; end if;
    select waiting.* into peer from flashcard_private.queue waiting join flashcard_private.decks decks on decks.owner_id=waiting.user_id and decks.local_id=waiting.deck_id
      join public.profiles p on p.id=waiting.user_id where waiting.match_id is null and waiting.user_id<>uid and waiting.count=quantity
      and jsonb_array_length(decks.cards)>=quantity and p.account_status='active'
      and (p.role='master' or coalesce((select enabled from public.user_feature_overrides where user_id=p.id and feature_key='flashcards'),true)) order by waiting.created_at limit 1;
    if peer.user_id is null then
      insert into flashcard_private.queue(user_id,deck_id,count) values(uid,d.local_id,quantity);
    else
      insert into flashcard_private.matches(count,status) values(quantity,'confirmation') returning id into new_match_id;
      insert into flashcard_private.members(match_id,user_id,deck_id,deck_title) values(new_match_id,uid,d.local_id,d.title),
        (new_match_id,peer.user_id,peer.deck_id,(select title from flashcard_private.decks where owner_id=peer.user_id and local_id=peer.deck_id));
      update flashcard_private.queue set match_id=new_match_id where user_id=peer.user_id;
      insert into flashcard_private.queue(user_id,deck_id,count,match_id) values(uid,d.local_id,quantity,new_match_id);
    end if;
    return flashcard_private.state(uid);
  elsif action='leave' then
    if q.match_id is not null and exists(select 1 from flashcard_private.matches where id=q.match_id and status not in ('complete','cancelled')) then raise exception 'A partida pode ser retomada. Não há regra de abandono automático.'; end if;
    if q.match_id is null and q.user_id is not null then raise exception 'Cancele a busca antes de sair.'; end if;
    delete from flashcard_private.queue where user_id=uid; return flashcard_private.state(uid);
  elsif action='cancel' then
    if q.match_id is not null then
      select * into m from flashcard_private.matches where id=q.match_id;
      if m.status<>'confirmation' and m.status<>'cancelled' then raise exception 'A partida iniciada permanece disponível para retomada.'; end if;
      update flashcard_private.matches set status='cancelled' where id=m.id;
    else delete from flashcard_private.queue where user_id=uid; end if;
    return flashcard_private.state(uid);
  end if;
  if q.match_id is null or q.match_id::text is distinct from payload->>'matchId' then raise exception 'Partida inválida para esta conta.'; end if;
  select * into m from flashcard_private.matches where id=q.match_id;
  select * into member from flashcard_private.members where match_id=m.id and user_id=uid;
  if not found then raise exception 'Você não participa desta partida.'; end if;
  if action='confirm' then
    if m.status<>'confirmation' then return flashcard_private.state(uid); end if;
    update flashcard_private.members set confirmed=true where match_id=m.id and user_id=uid;
    if (select count(*) from flashcard_private.members where match_id=m.id and confirmed)=2 then
      for member in select * from flashcard_private.members where match_id=m.id loop
        select * into opponent from flashcard_private.members where match_id=m.id and user_id<>member.user_id;
        select * into d from flashcard_private.decks where owner_id=opponent.user_id and local_id=opponent.deck_id;
        if not found or jsonb_array_length(d.cards)<m.count then raise exception 'Deck insuficiente. Cancele e escolha outra configuração.'; end if;
        insert into flashcard_private.items(match_id,receiver_id,ordinal,card)
          select m.id,member.user_id,row_number() over(),selected.value from
            (select value from jsonb_array_elements(d.cards) order by pg_catalog.random() limit m.count) selected;
      end loop;
      update flashcard_private.matches set status='active' where id=m.id;
    end if;
  elsif action='answer' then
    ord:=(payload->>'ordinal')::int; selected_choice:=payload->>'choice';
    select * into item from flashcard_private.items where match_id=m.id and receiver_id=uid and ordinal=ord;
    if not found then raise exception 'Flashcard fora da sequência.'; end if;
    if item.choice is not null then return flashcard_private.state(uid); end if;
    if m.status<>'active' or ord<>member.cursor or selected_choice is null or selected_choice not in ('XX','X','CHECK','DOUBLE_CHECK') then raise exception 'Resposta inválida.'; end if;
    answer_correct:=((selected_choice in ('CHECK','DOUBLE_CHECK'))=(item.card->>'isTrue')::boolean);
    select r.high_points,r.low_points into high_points,low_points from flashcard_private.scoring_rules r where version=m.scoring_version;
    magnitude:=case when selected_choice in ('XX','DOUBLE_CHECK') then high_points else low_points end;
    update flashcard_private.items set choice=selected_choice,correct=answer_correct,
      points=case when answer_correct then magnitude else -magnitude end,answered_at=now() where match_id=m.id and receiver_id=uid and ordinal=ord;
    if (select count(*) from flashcard_private.items where match_id=m.id and choice is not null)=m.count*2 then
      update flashcard_private.matches set status='complete' where id=m.id;
    end if;
  elsif action='advance' then
    ord:=(payload->>'ordinal')::int;
    if m.status not in ('active','complete') then raise exception 'A partida não está em andamento.'; end if;
    if ord=member.cursor then
      if not exists(select 1 from flashcard_private.items where match_id=m.id and receiver_id=uid and ordinal=ord and choice is not null) then raise exception 'Responda antes de avançar.'; end if;
      update flashcard_private.members set cursor=cursor+1 where match_id=m.id and user_id=uid;
    end if;
  else raise exception 'Operação desconhecida.';
  end if;
  return flashcard_private.state(uid);
end;
$$;
revoke all on function flashcard_private.valid_drawing(jsonb), flashcard_private.state(uuid),
  flashcard_private.evaluation(flashcard_private.items) from public, anon, authenticated;
revoke all on function public.flashcard_battle(text,jsonb) from public, anon, authenticated;
grant execute on function public.flashcard_battle(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
