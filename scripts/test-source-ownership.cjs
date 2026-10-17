// Real repository/store and SQLite transactions; synthetic identities, no device or remote credentials.
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const makeLoader = require('./community-test-loader.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; return { promise: new Promise(r => resolve = r), resolve: value => resolve(value) }; };
const source = { id:'legacy', name:'Biblioteca preservada', url:'https://fixture.invalid/books.json', kind:'json', enabled:true, status:'active', createdAt:42 };
(async () => {
  let raw = JSON.stringify([source]), readGate, commitFailure;
  const load = makeLoader({
    '@react-native-async-storage/async-storage': { getItem:async () => { const result=raw; if(readGate) await readGate.promise; return result; }, setItem:async (_key,value) => { raw=value; } },
    '@/src/data/drive/driveDependencies': { googleDrive:{ clearIndex(){}, disconnect:async()=>{} } },
    '@/src/data/sources/sourceCatalogDependencies': { sourceCatalogs:{ load:async()=>{},refresh:async()=>{},cancel(){},remove:async()=>{},commitPrepared:async()=>{if(commitFailure) throw commitFailure;} } },
  });
  const { libraryAccountScope: scope } = load('src/data/library/LibraryAccountScope.ts');
  const { UserSourceRepository: Repository } = load('src/data/sources/UserSourceRepository.ts');
  const repo = new Repository();
  assert.deepEqual(await repo.list(),[source]);
  scope.set('user-a'); assert.deepEqual(await repo.list(),[]);
  assert.equal((await repo.listLegacy())[0].id,source.id);
  await assert.rejects(repo.save(source),/vinculada/,'a generic save cannot silently adopt a legacy source');
  await repo.adoptLegacy(source.id);
  const adopted=(await repo.list())[0];
  assert.deepEqual(adopted,{...source,ownerId:'user-a'});
  scope.set('user-b'); assert.deepEqual(await repo.list(),[]); assert.deepEqual(await repo.listLegacy(),[]);
  await assert.rejects(repo.adoptLegacy(source.id));
  await assert.rejects(repo.save({...source,ownerId:'user-b'}));
  await repo.remove(source.id); assert.equal(JSON.parse(raw).length,1);
  await Promise.all([repo.save({...source,id:'b-one'}),new Repository().save({...source,id:'b-two'})]);
  assert.equal(JSON.parse(raw).length,3,'concurrent writes across repository instances retain all records');
  scope.set(null); assert.deepEqual(await repo.list(),[],'logout cannot expose an owned source');
  scope.set('user-a');
  const store=load('src/presentation/stores/sourceStore.ts').useSourceStore;
  await store.getState().load(); assert.equal(store.getState().sources[0].id,'legacy');
  readGate=deferred(); const stale=store.getState().load(); await tick();
  scope.set('user-b'); assert.deepEqual(store.getState().sources,[],'clear before any async account read');
  scope.set('user-a'); assert.deepEqual(store.getState().sources,[]);
  readGate.resolve(); readGate=null; await stale; await tick();
  assert.equal(store.getState().sources[0].ownerId,'user-a','A → B → A cannot publish older generations');
  commitFailure=new Error('synthetic disk failure'); const beforeFailure=raw;
  await assert.rejects(store.getState().update('legacy',{name:'Incomplete rename'},undefined,{prepared:{}}));
  assert.equal(raw,beforeFailure,'failed prepared commit restores the existing configuration');
  await assert.rejects(store.getState().add({...source,id:'incomplete-draft'},undefined,{prepared:{}}));
  assert.equal(raw,beforeFailure,'failed draft never leaves a duplicate configured library'); commitFailure=null;
  const old=raw; raw='{invalid'; await assert.rejects(repo.save({...source,id:'corrupt-overwrite'}));
  assert.equal(raw,'{invalid','corrupt storage never becomes an empty overwrite'); raw=old;
  const cancelled=new AbortController(); cancelled.abort(); await assert.rejects(repo.save({...source,id:'cancelled'},cancelled.signal),{name:'AbortError'});
  assert.equal(raw,old);
  console.log('PASS explicit legacy adoption, stable identity/configuration, A/B/logout isolation, concurrent repositories, late A → B → A reads, corruption and pre-abort preservation');

  // Use real SQLite to demonstrate rollback if cancellation arrives after UPSERT but before commit.
  const db=new DatabaseSync(':memory:'); db.exec('CREATE TABLE source_catalogs(source_id TEXT PRIMARY KEY,snapshot_json TEXT NOT NULL)');
  let abortAfterWrite;
  const adapter={
    getFirstAsync:async(sql,...args)=>db.prepare(sql).get(...args),
    runAsync:async(sql,...args)=>{ const result=db.prepare(sql).run(...args); abortAfterWrite?.abort(); return result; },
    withExclusiveTransactionAsync:async action=>{ db.exec('BEGIN'); try { await action(adapter); db.exec('COMMIT'); } catch(error) { db.exec('ROLLBACK'); throw error; } },
  };
  const sqlite=makeLoader({'@/src/data/database/connection/database':{getDatabase:async()=>adapter}});
  const catalogRepo=new (sqlite('src/data/sources/SqliteSourceCatalogRepository.ts').SqliteSourceCatalogRepository)();
  const before={sourceId:'s',items:[{title:'previous'}]}; await catalogRepo.save(before);
  abortAfterWrite=new AbortController();
  await assert.rejects(catalogRepo.save({...before,items:[]},abortAfterWrite.signal),{name:'AbortError'});
  assert.deepEqual(await catalogRepo.get('s'),before); db.close();
  console.log('PASS real isolated SQLite rollback preserves prior catalog when cancellation occurs during persistence');
})().catch(error=>{console.error(error);process.exitCode=1;});
