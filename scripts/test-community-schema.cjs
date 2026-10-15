// Runs only in local PostgreSQL WASM. Never connects to Supabase.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { PGlite } = require(path.resolve('.expo/flashcard-db-test/node_modules/@electric-sql/pglite'));
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
(async()=>{
  const db=new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;");
    await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
    await db.exec(fs.readFileSync('supabase/migrations/202610130001_community_foundation.sql','utf8'));
    const actor=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await db.exec('set role '+role);};
    await actor(a);
    await db.query("insert into public.community_profiles(user_id,username,display_name) values($1,'alice','Alice')",[a]);
    await assert.rejects(()=>db.query("insert into public.community_profiles(user_id,username,display_name) values($1,'bob','Bob')",[b]),/row-level security/);
    await db.exec("update public.community_profiles set bio='Dona do perfil'");
    const created=(await db.query('select created_at from public.community_profiles')).rows[0].created_at;
    await db.exec("update public.community_profiles set created_at='2000-01-01'");
    assert.deepEqual((await db.query('select created_at from public.community_profiles')).rows[0].created_at,created);
    assert.equal((await db.query('select * from public.community_profiles')).rows.length,1);
    await actor(b);assert.equal((await db.query('select * from public.community_profiles')).rows.length,0);
    assert.equal((await db.query("update public.community_profiles set bio='intruso' returning *")).rows.length,0);
    await db.query("insert into public.community_profiles(user_id,username,display_name,privacy) values($1,'bob','Bob','FOLLOWERS')",[b]);
    await actor(a);assert.equal((await db.query('select * from public.community_profiles')).rows.length,1);
    await db.exec("update public.community_profiles set privacy='PUBLIC'");
    await assert.rejects(()=>db.query('update public.community_profiles set user_id=$1',[b]),/row-level security|duplicate key/);
    await db.exec('reset role');
    await db.query("insert into public.community_reading_stats(user_id,completed) values($1,1)",[a]);
    await db.query("insert into public.community_progression_awards(user_id,event_key,event_type,points) values($1,'completion-one','BOOK_COMPLETED',100)",[a]);
    await db.query("insert into public.community_achievements(user_id,achievement_id) values($1,'first-completion')",[a]);
    await db.query("insert into public.community_activities(user_id,id,type,book_title,privacy) values($1,'public','finished_book','Público','PUBLIC'),($1,'private','finished_book','Privado','PRIVATE'),($1,'followers','finished_book','Seguidores','FOLLOWERS')",[a]);
    await actor(b);assert.equal((await db.query('select * from public.community_activities')).rows.length,1);
    for(const table of ['community_reading_stats','community_progression_awards','community_achievements'])assert.equal((await db.query('select * from public.'+table)).rows.length,0);
    await actor(null,'anon');assert.equal((await db.query('select * from public.community_profiles')).rows.length,1);assert.equal((await db.query('select * from public.community_activities')).rows.length,1);
    await assert.rejects(()=>db.query('select * from public.community_reading_stats'),/permission denied/);
    await actor(a);assert.equal((await db.query('select * from public.community_activities')).rows.length,3);
    for(const sql of [
      "update public.community_progression_awards set points=1000000",
      "insert into public.community_progression_awards(user_id,event_key,event_type,points) values('"+a+"','spoof','BOOK_COMPLETED',100)",
      "update public.community_reading_stats set completed=1000000",
      "delete from public.community_activities",
      "insert into public.community_achievements(user_id,achievement_id) values('"+a+"','spoof')",
    ])await assert.rejects(()=>db.exec(sql),/permission denied/);
    await db.exec("update public.community_profiles set privacy='PRIVATE'");
    await actor(b);assert.equal((await db.query('select * from public.community_activities')).rows.length,0);
    await actor(a);await assert.rejects(()=>db.exec("update public.community_profiles set privacy='OPEN'"),/check constraint/);
    await assert.rejects(()=>db.exec("update public.community_profiles set goal_year=2026,goal_books=0"),/check constraint/);
    await assert.rejects(()=>db.exec("update public.community_profiles set goal_year=2026"),/check constraint/);
    await actor('00000000-0000-4000-8000-000000000003');
    await assert.rejects(()=>db.exec("insert into public.community_profiles(user_id,username,display_name) values('00000000-0000-4000-8000-000000000003','missing','Sem Auth')"),/foreign key constraint/);
    await db.exec('reset role');
    await assert.rejects(()=>db.query("insert into public.community_progression_awards(user_id,event_key,event_type,points) values($1,'completion-one','BOOK_COMPLETED',100)",[a]),/duplicate key/);
    await assert.rejects(()=>db.query("insert into public.community_progression_awards(user_id,event_key,event_type,points) values($1,'bad','BOOK_COMPLETED',999)",[a]),/check constraint/);
    console.log('PASS community actual local PostgreSQL migration/RLS: owner, outsider, anon, PUBLIC/FOLLOWERS/PRIVATE, private events, owner edits, FK/checks, duplicate awards, no client autopromotion or derived writes. NOT APPLIED REMOTELY.');
  } finally {await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
