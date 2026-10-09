const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const {indexedDB,IDBDatabase}=require(path.resolve('.expo/flashcard-db-test/node_modules/fake-indexeddb'));
function load(file,deps){const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>deps[name]??require(name),exports);return exports;}
(async()=>{
 const legacy=new Map([['account-A','legacy-A'],['account-B','legacy-B']]);const old={getItem:async key=>legacy.get(key)??null};
 global.indexedDB=indexedDB;
 const web=load('src/data/local/flashcardStorage.web.ts',{'@react-native-async-storage/async-storage':old}).flashcardStorage;
 assert.equal(await web.getItem('account-A'),'legacy-A');assert.equal(legacy.get('account-A'),'legacy-A');assert.equal(await web.getItem('account-B'),'legacy-B');
 const large='data:image/png;base64,'+'A'.repeat(8*1024*1024);await web.setItem('account-A',large);assert.equal(await web.getItem('account-A'),large);assert.equal(await web.getItem('account-B'),'legacy-B');
 const transaction=IDBDatabase.prototype.transaction;
 IDBDatabase.prototype.transaction=function(...args){const tx=transaction.apply(this,args);if(args[1]==='readwrite')queueMicrotask(()=>tx.abort());return tx;};
 await assert.rejects(()=>web.setItem('account-A','lost'),/Falha ao salvar/);IDBDatabase.prototype.transaction=transaction;assert.equal(await web.getItem('account-A'),large);
 assert.equal(legacy.get('account-A'),'legacy-A');
 console.log('PASS Web IndexedDB adapter: copy-only legacy migration, isolated accounts, 8 MB payload, completion acknowledgement and aborted write rollback (fake-indexeddb).');
 const db=new DatabaseSync(':memory:');db.exec('create table kv(key text primary key,value text not null)');
 class SQLiteStorage{constructor(name){assert.equal(name,'kindle-flashcards.db');}async getItem(key){return db.prepare('select value from kv where key=?').get(key)?.value??null;}async setItem(key,value){const next=typeof value==='function'?value(await this.getItem(key)):value;db.prepare('insert into kv(key,value) values(?,?) on conflict(key) do update set value=excluded.value').run(key,next);}}
 const native=load('src/data/local/flashcardStorage.native.ts',{'@react-native-async-storage/async-storage':old,'expo-sqlite/kv-store':{SQLiteStorage}}).flashcardStorage;
 assert.equal(await native.getItem('account-A'),'legacy-A');await native.setItem('account-A',large);assert.equal(await native.getItem('account-A'),large);assert.equal(await native.getItem('account-B'),'legacy-B');assert.equal(legacy.get('account-A'),'legacy-A');
 db.exec("create trigger injected before update on kv when new.value='failure' begin select raise(abort,'failure'); end");await assert.rejects(()=>native.setItem('account-A','failure'),/failure/);assert.equal(await native.getItem('account-A'),large);db.close();
 console.log('PASS Native storage adapter with real Node SQLite: copy-only migration, account separation, large payload and failed write preservation. Expo Native bridge not tested.');
})().catch(e=>{console.error(e);process.exitCode=1;});
