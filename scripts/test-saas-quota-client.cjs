const assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const {loader,sqliteAdapter}=require('./library-test-utils.cjs');
(async()=>{
 const db=new DatabaseSync(':memory:');db.exec('create table library_sync_state(user_id text primary key,state_json text not null)');
 const load=loader({'react-native':{Platform:{OS:'android'}},'@/src/data/database/connection/database':{getDatabase:async()=>sqliteAdapter(db)}});
 const scope=new(load('src/data/library/LibraryAccountScope.ts').LibraryAccountScope)();scope.set('A');
 const persistence=new(load('src/data/library/LibrarySyncPersistence.ts').DurableLibrarySyncPersistence)();
 const {QuotaError,parseQuota}=load('src/domain/saas/quota.ts');
 let offline=false,cap=1,revision=0,rejected=0;const rows=new Map(),local=new Map();
 const snapshot=()=>({version:1,userId:'A',source:'server_database',effectivePlan:cap===1?'free':'pro',limits:{syncedBooks:cap,storageBytes:10},usage:{syncedBooks:[...rows.values()].filter(r=>r.kind==='book').length,storageBytes:10,reservedBytes:0,reservedUploads:0,objects:1},remaining:{syncedBooks:Math.max(0,cap-[...rows.values()].filter(r=>r.kind==='book').length),storageBytes:0},overLimit:false});
 const adapter={quota:async()=>{if(offline)throw Error('offline');return parseQuota(snapshot(),'A');},pull:async()=>{if(offline)throw Error('offline');return structuredClone([...rows.values()]);},apply:async(owner,e)=>{
  assert.equal(owner,'A');if(offline)throw Error('offline');
  if(e.kind==='book'&&!rows.has(e.key)&&snapshot().usage.syncedBooks>=cap){rejected++;throw new QuotaError('books');}
  const row={user_id:owner,kind:e.kind,id:e.id,book_id:e.bookId,payload:e.payload,revision:++revision,updated_at:new Date().toISOString(),deleted_at:null};rows.set(e.key,row);return {accepted:true,row};
 }};
 const make=()=>new(load('src/data/library/LibrarySyncService.ts').LibrarySyncService)(persistence,adapter,async(_,e)=>local.set(e.key,e),scope);
 let engine=make();const change=(kind,id,book,payload)=>engine.change(kind,id,book,payload,false,async()=>local.set(kind+':'+id,payload));
 await change('book','old','old',{title:'Existing',format:'epub'});await engine.sync();
 offline=true;await change('book','new','new',{title:'Local',format:'pdf'});await change('bookmark','pending-note','new',{note:'Unpublished child preserved'});await change('progress','position','old',{percentage:.8});await assert.rejects(engine.sync(),/offline/);assert.equal(engine.status.pending,3);
 offline=false;await engine.sync();assert.equal(rejected,1);assert.equal(rows.get('progress:position').payload.percentage,.8);assert.equal(rows.has('bookmark:pending-note'),false);assert.equal(engine.status.pending,2);assert.ok(local.has('book:new'));
 const first=await persistence.read('A');const operation=first.entries['book:new'].operationId;assert.ok(first.quotaBlocks['book:new']);
 engine=make();for(let i=0;i<3;i++)await engine.sync();assert.equal(rejected,1,'persisted block prevents background retry loop after restart');
 await change('highlight','h','old',{text:'Continue studying'});await engine.sync();assert.ok(rows.has('highlight:h'));assert.equal(rejected,1);
 await engine.blockQuota('file:old',new QuotaError('storage').message);await engine.sync();assert.ok(await engine.quotaBlock('file:old'));
 await engine.retryQuota();await engine.sync();assert.equal(rejected,2,'explicit manual retry is bounded and preserves same operation');assert.equal((await persistence.read('A')).entries['book:new'].operationId,operation);
 cap=3;await engine.sync();assert.equal(engine.status.pending,0);assert.ok(rows.has('book:new'));assert.ok(rows.has('bookmark:pending-note'));assert.equal(await engine.quotaBlock('file:old'),null);
 scope.set('B');assert.equal(engine.quota,null);assert.equal(await engine.quotaBlock('book:new'),null);assert.equal((await persistence.read('A')).entries['book:new'].dirty,false);
 scope.set('A');adapter.quota=async()=>{const e=Error('missing quota RPC');e.code='contract';throw e;};
 await change('progress','position','old',{percentage:.9});await engine.sync();assert.equal(rows.get('progress:position').payload.percentage,.9);assert.equal(engine.quota,null,'missing quota backend does not invent a plan');
 scope.set('A');let release;adapter.quota=()=>new Promise(resolve=>{release=resolve;});
 const late=engine.sync();late.catch(()=>{});await new Promise(setImmediate);scope.set('B');release(snapshot());await assert.rejects(late,/conta mudou|cancel/i);assert.equal(engine.quota,null,'late quota response cannot restore A snapshot in B scope');
 assert.throws(()=>parseQuota({...snapshot(),userId:'B'},'A'),/Contrato/);assert.throws(()=>parseQuota({...snapshot(),remaining:{syncedBooks:999,storageBytes:999}},'A'),/Contrato/);
 db.close();console.log('PASS quota client + real SQLite: offline/reconnect, durable blocked outbox/restart, existing notes/progress continue at full storage, child dependency, no background retry loop, bounded manual retry, upgrade recovery, A/B scope and typed contract validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
