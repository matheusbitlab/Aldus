const assert=require('node:assert/strict');
const {loader}=require('./library-test-utils.cjs');
const {backend,device}=require('./test-library-reading-sync.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
(async()=>{
 const load=loader({'@react-native-async-storage/async-storage':{}});
 const {LibraryOrganizationStore}=load('src/data/local/LibraryOrganizationStore.ts');
 const {organizeLibrarySelection:apply}=load('src/domain/usecases/OrganizeLibrarySelection.ts');
 const kv=new Map();let fail=false;
 const storage={getItem:async k=>kv.get(k)??null,setItem:async(k,v)=>{if(fail)throw Error('disk unavailable');kv.set(k,v)}};
 const store=new LibraryOrganizationStore(storage);
 const row=id=>({bookId:id,title:'Título '+id,author:'Autoria',coverImagePath:null,favorite:false,collections:['Antiga'],tags:['original'],series:'Série',volume:2,readingStatus:null,revision:1,updatedAt:1});
 await store.saveMany([row('one'),row('two')]);
 assert.equal(await apply(store,['one','two','one'],{kind:'add-collection',name:' Nova '}),2);
 assert.equal(await apply(store,['one','two'],{kind:'add-collection',name:'Nova'}),0,'idempotent retry');
 await apply(store,['one','two'],{kind:'rename-collection',name:'Antiga',replacement:'Nova'});
 await apply(store,['one','two'],{kind:'add-tag',name:'estudo'});
 await apply(store,['one'],{kind:'remove-tag',name:'original'});
 await apply(store,['one','two'],{kind:'favorite',value:true});
 await apply(store,['two'],{kind:'status',value:'completed'});
 let records=await new LibraryOrganizationStore(storage).list();
 assert.deepEqual(records.one.collections,['Nova']);assert.deepEqual(records.one.tags,['estudo']);assert.deepEqual(records.two.tags,['original','estudo']);
 for(const r of Object.values(records)){assert.equal(r.author,'Autoria');assert.equal(r.series,'Série');assert.equal(r.volume,2);assert.equal(r.coverImagePath,null);assert.equal(r.favorite,true)}
 const unchanged=JSON.stringify(records);
 await assert.rejects(store.saveMany([{...records.one,revision:records.one.revision+1,favorite:false},{...records.two,revision:1}]),/outra janela/);
 assert.equal(JSON.stringify(await store.list()),unchanged,'no partial local CAS commit');
 fail=true;await assert.rejects(apply(store,['one','two'],{kind:'favorite',value:false}),/disk unavailable/);fail=false;
 assert.equal(JSON.stringify(await store.list()),unchanged);
 await assert.rejects(apply(store,['one'],{kind:'add-tag',name:' '}));
 await assert.rejects(apply(store,['one'],{kind:'add-tag',name:'a'.repeat(121)}));
 const many=Array.from({length:1000},(_,i)=>'bulk-'+i);await apply(store,many,{kind:'add-collection',name:'Mil livros'});
 assert.equal(Object.keys(await store.list()).length,1002);await apply(store,many,{kind:'remove-collection',name:'Mil livros'});
 // Real SQLite/account/journal/sync composition, remote adapter is controlled.
 const remote=backend(),a=await device(remote),b=await device(remote);
 const book=id=>({ownerUserId:A,id,title:id,author:'QA',fileName:id+'.epub',filePath:'file:///qa/'+id,mimeType:'application/epub+zip',fileHash:null,fileSize:12,coverImagePath:null,totalChapters:1,totalWords:8,addedDate:1,lastOpenedDate:null,isDeleted:false,progress:0,importComplete:true});
 try{
  assert.equal(a.scope.userId,A);
  for(const id of ['first','second'])await a.books.save(book(id));
  remote.offline(true);await apply(a.org,['first','second'],{kind:'add-collection',name:'Offline'});
  assert.equal((await a.org.list()).first.collections[0],'Offline');
  assert.equal(Object.values((await a.persistence.read(A)).entries).filter(e=>e.kind==='organization'&&e.dirty&&e.ready).length,2);
  remote.offline(false);await a.synchronize();await b.synchronize();assert.equal((await b.org.list()).second.collections[0],'Offline');
  const before=await a.persistence.read(A),now=await a.org.list();
  await assert.rejects(a.org.saveMany([{...now.first,revision:now.first.revision+1,favorite:true},{...now.second,revision:1}]),/outra janela/);
  assert.deepEqual((await a.persistence.read(A)).entries,before.entries,'CAS restores prior outbox entries');
  assert.equal((await a.org.list()).first.favorite,false);
  const baseBatch=a.org.saveMany.bind(a.org);
  const raced={...a.org,list:()=>a.org.list(),saveMany:async(records,guard)=>{
    const current=await a.org.list();await a.org.save({...current.second,collections:['Other'],revision:current.second.revision+1});
    return baseBatch(records,guard);
  }};
  await assert.rejects(apply(raced,['first'],{kind:'rename-collection',name:'Offline',replacement:'Race'}),/coleção mudou|outra janela/);
  const afterRace=await a.org.list();assert.deepEqual(afterRace.first.collections,['Offline']);
  await a.org.save({...afterRace.second,collections:['Offline'],revision:afterRace.second.revision+1});
  const oldMutate=a.persistence.mutate.bind(a.persistence),priorEntries=(await a.persistence.read(A)).entries;let switchOnce=true;
  a.persistence.mutate=async(owner,operation)=>{
    const result=await oldMutate(owner,operation);
    if(switchOnce){switchOnce=false;a.scope.set(B);a.scope.set(A)}
    return result;
  };
  await assert.rejects(apply(a.org,['first','second'],{kind:'favorite',value:true}),/conta mudou/);
  a.persistence.mutate=oldMutate;
  assert.deepEqual((await a.persistence.read(A)).entries,priorEntries,'account change after write-ahead restores exact earlier queue');
  a.scope.set(B);await assert.rejects(apply(a.org,['first'],{kind:'favorite',value:true}),/fora desta conta/);a.scope.set(A);
  await assert.rejects(apply(a.org,['first','second'],{kind:'favorite',value:true},()=>{a.scope.set(B);a.scope.set(A);throw Error('account changed')}),/account changed/);
  assert.equal((await a.org.list()).first.favorite,false);
  await apply(a.org,['first','second'],{kind:'rename-collection',name:'Offline',replacement:'Revisão'});await a.synchronize();await b.synchronize();
  assert.deepEqual((await b.org.list()).first.collections,['Revisão']);assert.equal(a.sync.status.pending,0);
 }finally{a.db.close();b.db.close()}
 console.log('PASS bulk organization: atomic CAS, idempotent retry, 1000 books, old collections, rename collision, metadata preserved, disk failure, real SQLite/account/outbox offline and controlled bidirectional sync.');
})().catch(e=>{console.error(e);process.exitCode=1});
