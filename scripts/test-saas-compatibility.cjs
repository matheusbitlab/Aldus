// Existing Sync journal + OpenBook use case remain usable after SaaS quota rejection.
const assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const {loader,sqliteAdapter}=require('./library-test-utils.cjs');
(async()=>{
 const db=new DatabaseSync(':memory:');db.exec('create table library_sync_state(user_id text primary key,state_json text not null)');
 const load=loader({'react-native':{Platform:{OS:'android'}},'@/src/data/database/connection/database':{getDatabase:async()=>sqliteAdapter(db)}});
 const scope=new(load('src/data/library/LibraryAccountScope.ts').LibraryAccountScope)();scope.set('A');
 const persistence=new(load('src/data/library/LibrarySyncPersistence.ts').DurableLibrarySyncPersistence)();
 let quota=true,revision=0;
 const remote={pull:async()=>[],apply:async(owner,e)=>{
  if(quota)throw new Error('synced book quota exceeded');
  return {accepted:true,row:{user_id:owner,kind:e.kind,id:e.id,book_id:e.bookId,payload:e.payload,revision:++revision,updated_at:new Date().toISOString(),deleted_at:null}};
 }};
 const makeEngine=()=>new(load('src/data/library/LibrarySyncService.ts').LibrarySyncService)(persistence,remote,async()=>{},scope);
 const engine=makeEngine();
 const book={id:'local',title:'Local EPUB',format:'epub',filePath:'file:///local.epub',importComplete:true};
 let localWrites=0;
 await engine.change('book','local','local',book,false,async()=>{localWrites++});
 await assert.rejects(engine.sync(),/quota exceeded/);
 const saved=await persistence.read('A');assert.equal(saved.entries['book:local'].dirty,true);assert.equal(localWrites,1);
 const stored=db.prepare('select state_json from library_sync_state where user_id=?').get('A').state_json;
 assert.ok(stored.includes('local'),'Quota failure keeps durable SQLite outbox');
 const {OpenBookUseCase}=load('src/domain/usecases/OpenBookUseCase.ts');
 for(const format of ['epub','pdf']){
  const current={...book,format};let reads=0;
  const open=new OpenBookUseCase({findById:async()=>current},{listByBookId:async()=>{reads++;return [{id:'chapter',content:'Local content'}]}},{findByBookId:async()=>({bookId:'local',percentage:.5})});
  const opened=await open.execute('local');assert.equal(opened.book.format,format);assert.equal(opened.chapters.length,1);assert.equal(reads,1);
 }
 const restarted=makeEngine();quota=false;await restarted.sync();
 assert.equal(restarted.status.pending,0,'Trusted backend capacity/retry can drain same journal');
 assert.equal(localWrites,1,'No duplicate import after quota retry');
 db.close();console.log('PASS SaaS compatibility: actual existing SQLite journal preserves local writes/outbox across quota failure and service restart; existing EPUB/PDF OpenBook reads local content without plan/backend lookup. Controlled repositories, not device QA.');
})().catch(error=>{console.error(error);process.exitCode=1});
