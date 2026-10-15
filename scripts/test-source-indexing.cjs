// Real catalog coordinator/store; deferred IO and network are controlled.
const assert = require('node:assert/strict');
const makeLoader = require('./community-test-loader.cjs');
const load = makeLoader();
const { SourceCatalogService } = load('src/data/sources/SourceCatalogService.ts');
const source = {id:'source',name:'Fixture',url:'https://fixture.invalid/catalog.json',kind:'json',enabled:true,createdAt:1};
const item = n => ({title:`Book ${n}`,url:`https://fixture.invalid/${n}.epub`,format:'epub',estimatedSize:null,sourceSite:source.name});
const deferred = () => { let resolve; const promise=new Promise(r=>resolve=r);return {promise,resolve}; };
const tick = () => new Promise(resolve=>setImmediate(resolve));
const terminal = view => assert.ok(!['loading','refreshing'].includes(view.status), `nonterminal ${view.status}`);
function setup(find=async()=>source, custom={}) {
  const state={stored:null,saves:0};
  const repo={get:async()=>state.stored,save:async value=>{state.saves++;state.stored=value;},remove:async()=>{},links:async()=>[],link:async()=>{},...custom};
  const adapter={list:async()=>[item(1)],authorizationRequired:()=>false};
  return {state,repo,adapter,service:new SourceCatalogService(repo,adapter,find)};
}
(async()=>{
  const missing=setup(async()=>undefined);await missing.service.refresh(source);
  assert.equal(missing.state.saves,0);assert.equal(missing.service.view(source.id).status,'error');
  for (const changed of [{...source,enabled:false},{...source,url:'https://other.invalid'}]) {
    const test=setup(async()=>changed);await test.service.refresh(source);terminal(test.service.view(source.id));assert.equal(test.state.saves,0);
  }
  const success=setup();await success.service.refresh(source);assert.equal(success.service.view(source.id).status,'ready');
  const old=success.state.stored, gate=deferred();let adapterSignal;
  success.adapter.list=async(_source,signal)=>{adapterSignal=signal;return gate.promise;};
  const controller=new AbortController();const operation=success.service.refresh(source,controller.signal);
  await tick();controller.abort();await operation;terminal(success.service.view(source.id));assert.equal(adapterSignal.aborted,true);
  assert.equal(success.service.view(source.id).catalog,old);assert.equal(success.service.view(source.id).error,null);
  gate.resolve([item(2)]);await tick();assert.equal(success.state.stored,old,'late crawl cannot save after cancellation');
  const already=new AbortController();already.abort();let requests=0;
  success.adapter.list=async()=>{requests++;return[];};await success.service.refresh(source,already.signal);assert.equal(requests,0);

  const findGate=deferred(), waiting=setup(()=>findGate.promise), findAbort=new AbortController();
  const waitingOperation=waiting.service.refresh(source,findAbort.signal);await tick();findAbort.abort();await waitingOperation;
  terminal(waiting.service.view(source.id));findGate.resolve(source);await tick();assert.equal(waiting.state.saves,0);
  const readGate=deferred(), reading=setup(undefined,{get:()=>readGate.promise}), readAbort=new AbortController();
  const loadOperation=reading.service.load(source,readAbort.signal);readAbort.abort();await loadOperation;terminal(reading.service.view(source.id));
  readGate.resolve(null);

  const saveGate=deferred(), entered=deferred();let lastSaved=null, writes=0;
  const queued=setup(undefined,{save:async value=>{if(++writes===1){entered.resolve();await saveGate.promise;}lastSaved=value;}});
  const firstAbort=new AbortController(), first=queued.service.refresh(source,firstAbort.signal);await entered.promise;
  firstAbort.abort();await first;terminal(queued.service.view(source.id));
  queued.adapter.list=async()=>[item(3)];const second=queued.service.refresh(source);await tick();assert.equal(writes,1,'new save stays behind late native write');
  saveGate.resolve();await second;assert.equal(lastSaved.items[0].title,'Book 3');assert.equal(queued.service.view(source.id).status,'ready');

  const failing=setup();await failing.service.refresh(source);const snapshot=failing.state.stored;
  failing.adapter.list=async()=>{throw new Error('unsafe provider token');};await failing.service.refresh(source);
  assert.equal(failing.service.view(source.id).status,'stale');assert.equal(failing.state.stored,snapshot);assert.doesNotMatch(failing.service.view(source.id).error,/unsafe provider token/);

  const storage=new Map(), inner=setup();let innerSignal;
  inner.adapter.list=async(_source,signal)=>{innerSignal=signal;return new Promise(()=>{});};
  let store;
  inner.service=new SourceCatalogService(inner.repo,inner.adapter,async id=>store.getState().sources.find(s=>s.id===id));
  const storeLoad=makeLoader({
    '@react-native-async-storage/async-storage':{getItem:async key=>storage.get(key)||null,setItem:async(key,value)=>storage.set(key,value)},
    '@/src/data/drive/driveDependencies':{googleDrive:{clearIndex:()=>{},disconnect:async()=>{}}},
    '@/src/data/sources/sourceCatalogDependencies':{sourceCatalogs:inner.service},
  });
  store=storeLoad('src/presentation/stores/sourceStore.ts').useSourceStore;
  const storeAbort=new AbortController(), add=store.getState().add(source,storeAbort.signal);
  for(let n=0;n<20&&!innerSignal;n++)await tick();assert.ok(innerSignal);storeAbort.abort();await add;
  assert.equal(innerSignal.aborted,true);terminal(inner.service.view(source.id));assert.equal(store.getState().sources.length,1,'cancel preserves saved root');
  console.log('PASS indexing terminal states, disappeared/changed source, external abort through store, ignored abort/late results, held lookup/read/save, serialized late writes, snapshot/error preservation. Real Drive API and Android pending.');
})().catch(error=>{console.error(error);process.exitCode=1;});
