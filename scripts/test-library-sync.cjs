const assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const {loader,sqliteAdapter}=require('./library-test-utils.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
function device(remote,owner='A') {
 const db=new DatabaseSync(':memory:');db.exec('create table library_sync_state(user_id text primary key,state_json text not null)');
 const load=loader({'react-native':{Platform:{OS:'android'}},'@/src/data/database/connection/database':{getDatabase:async()=>sqliteAdapter(db)}});
 const scope=new(load('src/data/library/LibraryAccountScope.ts').LibraryAccountScope)();scope.set(owner);
 const persistence=new(load('src/data/library/LibrarySyncPersistence.ts').DurableLibrarySyncPersistence)();
 const local=new Map();let failLocal=false;
 const service=new(load('src/data/library/LibrarySyncService.ts').LibrarySyncService)(persistence,remote,async(user,e)=>{if(failLocal)throw Error('disk full');assert.equal(user,scope.userId);local.set(e.key,clone(e));},scope);
 return {db,scope,persistence,local,service,setFail:v=>failLocal=v,load};
}
function server() {
 let revision=0;const records=new Map(),receipts=new Map();let offline=false,loseResponse=false,delay;
 const key=(owner,e)=>`${owner}/${e.kind}:${e.id}`;
 const adapter={
  pull:async(owner,signal)=>{if(offline)throw Error('offline');if(delay)await delay; if(signal.aborted)throw Error('aborted');return clone([...records.values()].filter(r=>r.user_id===owner));},
  apply:async(owner,e,signal)=>{if(offline)throw Error('offline');if(signal.aborted)throw Error('aborted');const receipt=receipts.get(owner+'/'+e.operationId);if(receipt)return clone(receipt);
   const previous=records.get(key(owner,e));if(previous&&(previous.revision!==e.baseRevision||previous.deleted_at))return {accepted:false,row:clone(previous)};
   const row={user_id:owner,kind:e.kind,id:e.id,book_id:e.bookId,payload:clone(e.payload),revision:++revision,updated_at:'server-order-'+revision,deleted_at:e.deleted?'deleted':null};records.set(key(owner,e),row);
   const result={accepted:true,row};receipts.set(owner+'/'+e.operationId,clone(result));if(loseResponse){loseResponse=false;throw Error('lost response');}return clone(result);
  }
 };return {adapter,records,offline:v=>offline=v,lose:()=>loseResponse=true,delay:v=>delay=v};
}
(async()=>{
 const remote=server(),a=device(remote.adapter),b=device(remote.adapter);
 const change=(d,kind,id,payload,deleted=false)=>d.service.change(kind,id,'book',payload,deleted,async()=>d.local.set(`${kind}:${id}`,{payload,deleted}));
 remote.offline(true);await change(a,'book','book',{title:'X',format:'epub'});await assert.rejects(a.service.sync(),/offline/);assert.equal(a.service.status.pending,1);
 remote.offline(false);remote.lose();await assert.rejects(a.service.sync(),/lost response/);assert.equal(a.service.status.pending,1);
 await a.service.sync();await b.service.sync();assert.equal(remote.records.size,1);assert.equal(b.local.get('book:book').payload.title,'X');
 await change(a,'progress','position',{percentage:.9});await a.service.sync();await b.service.sync();
 await change(b,'progress','position',{percentage:.1});await b.service.sync();await a.service.sync();assert.equal(a.local.get('progress:position').payload.percentage,.1);
 // Concurrent same-entity edits preserve local intent explicitly, with server revision winner.
 await change(a,'progress','position',{percentage:.2});await change(b,'progress','position',{percentage:.3});await a.service.sync();await b.service.sync();
 assert.equal(b.service.status.conflicts,1);assert.equal(b.local.get('progress:position').payload.percentage,.2);
 await b.service.resolveConflict('progress:position','local');await b.service.sync();await a.service.sync();assert.equal(a.local.get('progress:position').payload.percentage,.3);
 // Pending annotation on B must not block learning A's book tombstone.
 await change(b,'bookmark','mark',{note:'offline note'});await change(a,'book','book',{title:'X',format:'epub'},true);await a.service.sync();await b.service.sync();
 assert.equal(b.local.get('book:book').deleted,true);assert.equal(b.service.status.pending,0);await assert.rejects(change(b,'book','book',{title:'revive',format:'epub'}),/removido/);
 // Incomplete local write stays durable and replays after restart instead of reaching remote prematurely.
 const recovery=device(remote.adapter);await assert.rejects(recovery.service.change('book','new','new',{title:'New',format:'pdf'},false,async()=>{throw Error('disk full')}),/disk full/);
 const state=await recovery.persistence.read('A');assert.equal(state.entries['book:new'].ready,false);await recovery.service.sync();assert.equal(recovery.local.get('book:new').payload.title,'New');
 let release;remote.delay(new Promise(r=>release=r));const late=a.service.sync();a.scope.set('B');release();await assert.rejects(late,/conta mudou|cancel|aborted/i);assert.equal(a.service.status.lastSync,null);remote.delay(null);
 const foreign=device(remote.adapter,'B');await foreign.service.sync();assert.equal(foreign.local.size,0);
 for(const d of [a,b,recovery,foreign])d.db.close();
 console.log('PASS sync controlled devices + separate real SQLite DBs: durable offline outbox, retry/lost response idempotence, server revisions, reread, concurrent conflict preservation/resolution, tombstone beats offline child, crash-write replay, stale-account response discard, account isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
