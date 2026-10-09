// Runs the actual migration/RPC in PostgreSQL WASM, isolated from the remote project.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(path.resolve('.expo/flashcard-db-test/node_modules/@electric-sql/pglite'));
const uidA='00000000-0000-4000-8000-000000000001',uidB='00000000-0000-4000-8000-000000000002',uidC='00000000-0000-4000-8000-000000000003';
const card=(owner,i)=>({id:`${owner}-${i}`,deckId:'deck',title:`${owner} ${i}`,statement:`Afirmação ${i}`,isTrue:i%2===0,explanation:`Explicação ${owner} ${i}`,status:'approved',imageUrl:null,drawing:null,front:`Afirmação ${i}`,back:`Explicação ${i}`});
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(fs.readFileSync('supabase/migrations/202610060001_profiles_and_features.sql','utf8'));
 for(const [uid,name] of [[uidA,'alice'],[uidB,'bob'],[uidC,'outsider']]){await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('update public.profiles set username=$1,display_name=$1 where id=$2',[name,uid]);}
 await db.exec(fs.readFileSync('supabase/migrations/202610090001_flashcard_battles.sql','utf8'));
 const rpc=async(uid,action,payload={})=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);return (await db.query('select public.flashcard_battle($1,$2::jsonb) as state',[action,JSON.stringify(payload)])).rows[0].state;};
 const upload=(uid,n=15)=>rpc(uid,'upload',{deckId:'deck',title:'Deck '+uid,cards:Array.from({length:n},(_,i)=>card(uid,i))});
 await upload(uidA,2);await assert.rejects(()=>rpc(uidA,'join',{deckId:'deck',count:3}),/insuficiente/);
 await assert.rejects(()=>rpc(uidA,'join',{deckId:'deck',count:4}),/Escolha/);
 await upload(uidA);await upload(uidB);
 await assert.rejects(()=>rpc(uidA,'upload',{deckId:'deck',title:'Bad drawing',cards:[{...card(uidA,0),drawing:{strokes:[]}}]}),/Desenho inválido/);
 await rpc(uidA,'join',{deckId:'deck',count:3});assert.equal((await rpc(uidA,'get')).status,'searching');assert.equal((await rpc(uidA,'cancel')).status,'idle');
 await rpc(uidA,'join',{deckId:'deck',count:3});const pending=await rpc(uidB,'join',{deckId:'deck',count:3});await rpc(uidA,'confirm',{matchId:pending.id});await rpc(uidB,'cancel');assert.equal((await rpc(uidA,'get')).status,'cancelled');assert.equal((await rpc(uidB,'get')).card,null);await rpc(uidA,'leave');await rpc(uidB,'leave');
 await db.exec('set role anon');await assert.rejects(()=>db.query("select public.flashcard_battle('get','{}')"),/permission denied/);await db.exec('reset role');
 for(const n of [3,5,10,15]){
  await upload(uidA);await upload(uidB);
  await rpc(uidA,'join',{deckId:'deck',count:n});let b=await rpc(uidB,'join',{deckId:'deck',count:n});assert.equal(b.status,'confirmation');assert.equal(b.card,null);const id=b.id;
  let a=await rpc(uidA,'confirm',{matchId:id});assert.equal(a.me.confirmed,true);assert.equal(a.status,'confirmation');b=await rpc(uidB,'confirm',{matchId:id});a=await rpc(uidA,'get');assert.equal(a.status,'active');
  assert.equal(a.card.isTrue,undefined);assert.equal(a.card.explanation,undefined);assert.equal(a.card.back,undefined);assert.equal(a.history,null);
  const firstStatement=a.card.statement;await upload(uidB,15); // Replace deck with edited content: frozen items stay unchanged.
  await rpc(uidB,'upload',{deckId:'deck',title:'Editado',cards:Array.from({length:15},(_,i)=>({...card(uidB,i),statement:'Editado '+i,explanation:'Alterada '+i,isTrue:!card(uidB,i).isTrue}))});
  a=await rpc(uidA,'get');assert.equal(a.card.statement,firstStatement);
  await assert.rejects(()=>rpc(uidC,'answer',{matchId:id,ordinal:1,choice:'XX'}),/inválida/);
  await assert.rejects(()=>rpc(uidA,'advance',{matchId:id,ordinal:1}),/Responda/);
  await assert.rejects(()=>rpc(uidA,'answer',{matchId:id,ordinal:2,choice:'XX'}),/inválida/);
  let sumA=0,sumB=0;const seenA=new Set(),seenB=new Set();
  for(const uid of [uidA,uidB]){
   const truthCounts={true:0,false:0},coverage=new Set();
   for(let ord=1;ord<=n;ord++){
    let state=await rpc(uid,'get');const shown=state.card;const owner=uid===uidA?uidB:uidA;assert.ok(shown.id.startsWith(owner));const seen=uid===uidA?seenA:seenB;assert.ok(!seen.has(shown.id));seen.add(shown.id);
    const truth=Number(shown.id.split('-').at(-1))%2===0;
    const choices=['XX','X','CHECK','DOUBLE_CHECK'];const choice=choices[truthCounts[truth]++%4];coverage.add(`${truth}:${choice}`);const correct=['CHECK','DOUBLE_CHECK'].includes(choice)===truth;const points=(choice==='XX'||choice==='DOUBLE_CHECK'?10:5)*(correct?1:-1);
    state=await rpc(uid,'answer',{matchId:id,ordinal:ord,choice});assert.equal(state.answer.isCorrect,correct);assert.equal(state.answer.points,points);assert.equal(state.card.isTrue,truth);assert.ok(state.card.explanation.startsWith('Explicação'));
    const score=state.me.score;const repeated=await rpc(uid,'answer',{matchId:id,ordinal:ord,choice:'XX'});assert.equal(repeated.me.score,score);assert.equal(repeated.answer.choice,choice);
    const reconnect=await rpc(uid,'get');assert.deepEqual(reconnect.answer,state.answer);assert.equal(reconnect.me.score,score);
    if(uid===uidA)sumA+=points;else sumB+=points;
    await rpc(uid,'advance',{matchId:id,ordinal:ord});const advanced=await rpc(uid,'advance',{matchId:id,ordinal:ord});assert.equal(advanced.me.cursor,ord+1);
   }
   if(n===15)assert.equal(coverage.size,8,'All eight combinations must run in the actual backend');
   if(uid===uidA)assert.equal((await rpc(uidA,'get')).status,'waiting');
  }
  a=await rpc(uidA,'get');b=await rpc(uidB,'get');assert.equal(a.status,'complete');assert.equal(b.status,'complete');assert.equal(a.me.score,sumA);assert.equal(b.me.score,sumB);assert.equal(a.winner,b.winner);assert.equal(a.winner,sumA===sumB?null:sumA>sumB?uidA:uidB);assert.equal(a.history.length,n);assert.equal(b.history.length,n);
  assert.equal((await rpc(uidC,'get')).status,'idle');
  await rpc(uidA,'leave');await rpc(uidB,'leave');console.log('PASS battle',n,'per participant: exchange, freeze, concealment, idempotency, reconnect, waiting and final scores',sumA,sumB);
 }
 await db.exec('reset role');
 await db.exec(fs.readFileSync('supabase/tests/flashcard_battles_manual.sql','utf8'));
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from flashcard_private.items'),/permission denied/);await assert.rejects(()=>db.query('select flashcard_private.state($1)',[uidA]),/permission denied/);
 await db.exec('reset role');await db.query("update public.profiles set account_status='disabled' where id=$1",[uidC]);await assert.rejects(()=>rpc(uidC,'get'),/disponíveis/);
 await db.exec('reset role');await db.query("update public.profiles set account_status='active' where id=$1",[uidC]);await db.query("insert into public.user_feature_overrides(user_id,feature_key,enabled) values($1,'flashcards',false)",[uidC]);await assert.rejects(()=>rpc(uidC,'get'),/disponíveis/);await db.exec('reset role');await db.query("update public.profiles set role='master' where id=$1",[uidC]);assert.equal((await rpc(uidC,'get')).status,'idle');
 await db.close();console.log('PASS real PostgreSQL RPC authorization and authoritative scoring. Not a remote two-user test.');
})().catch(e=>{console.error(e.message,e.detail||'');process.exit(1);});
