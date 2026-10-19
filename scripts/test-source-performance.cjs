// Production catalog/cache contracts with isolated synthetic metadata; not physical Android proof.
const assert=require('node:assert/strict'),load=require('./community-test-loader.cjs')();
const {SourceCatalogService,querySourceCatalog,querySourceCatalogAsync}=load('src/data/sources/SourceCatalogService.ts');
const {sourceIdentity}=load('src/domain/types/sourceCatalog.ts');
const {sourceTreeIndex}=load('src/domain/sources/sourceTree.ts');
const source={id:'fixture-source',kind:'json',name:'Fixture',url:'https://fixture.invalid/library.json',enabled:true,createdAt:1};
const books=n=>Array.from({length:n},(_,i)=>({sourceId:source.id,remoteBookId:String(i),title:'Estudos de literatura '+String(n-i).padStart(5,'0'),author:'Autor sintético',url:'https://fixture.invalid/'+i+'.epub',format:'epub',estimatedSize:null,sourceSite:'Fixture'}));
(async()=>{
 let current=source,reads=0;
 const snapshot={sourceId:source.id,sourceType:source.kind,sourceName:source.name,sourceIdentity:sourceIdentity(source),items:books(713),lastUpdated:1};
 const repo={get:async()=>{reads++;return structuredClone(snapshot);},save:async()=>{},links:async()=>[],link:async()=>{},remove:async()=>{}};
 const service=new SourceCatalogService(repo,{list:async()=>{throw Error('Reopening must not fetch');},authorizationRequired:()=>false},async()=>current);
 await service.load(source);const first=service.view(source.id).catalog;
 await service.load(source);assert.equal(reads,1);assert.equal(service.view(source.id).catalog,first);
 current={...source,name:'Renamed'};await service.load(current);assert.equal(reads,1);assert.equal(service.view(source.id).catalog.items,first.items);
 assert.equal(sourceTreeIndex(first),sourceTreeIndex(first),'tree index is reused');
 current=undefined;await service.load(source);assert.equal(service.view(source.id).catalog,null,'cache never bypasses source ownership lookup');
 service.clearSession();current=source;await service.load(source);assert.equal(reads,2,'new session requires a fresh durable read');
 const report=[];
 for(const n of[1000,5000,10000]){
  const items=books(n),start=performance.now(),az=querySourceCatalog(items,'','az'),firstMs=performance.now()-start;
  assert.equal(az.length,n);assert.equal(az[0].title,'Estudos de literatura 00001');
  assert.equal(querySourceCatalog(items,'','az'),az,'same immutable input reuses sort');
  assert.equal(querySourceCatalog(items,'','za')[0].title,'Estudos de literatura '+String(n).padStart(5,'0'));
  const searchStart=performance.now(),result=querySourceCatalog(items,'estudos literatura','az');assert.equal(result.length,n);
  assert.equal(items[0].title,'Estudos de literatura '+String(n).padStart(5,'0'),'never mutate the persisted source array');
  report.push({items:n,firstMs:Math.round(firstMs),searchMs:Math.round(performance.now()-searchStart)});
 }
 console.log('PASS ownership-checked reopen reuses snapshot without SQLite/JSON/network; rename keeps item identity; revoked source hidden; new session rereads disk; sort/search/tree reuse with 1000/5000/10000 records.');
 console.log(JSON.stringify({environment:'isolated Node fixtures, not Redmi timings',measurements:report}));
 const large=books(10000);let heartbeats=0;const pulse=setInterval(()=>heartbeats++,0);
 try {
  const result=await querySourceCatalogAsync(large,'estudos literatura','az');
  assert.equal(result.length,10000);assert.ok(heartbeats>5,'cooperative tokenization/search returns control to the event loop');
  assert.deepEqual(result.map(row=>row.remoteBookId),querySourceCatalog(large,'estudos literatura','az').map(row=>row.remoteBookId));
  const cancelled=new AbortController(), pending=querySourceCatalogAsync(books(5000),'estudos','az',cancelled.signal);cancelled.abort();
  await assert.rejects(pending,{name:'AbortError'});
 }finally{clearInterval(pulse);}
 console.log('PASS cooperative 10000-record search yields event-loop heartbeats, matches synchronous ranking and cancels obsolete 5000-record queries.');
})().catch(error=>{console.error(error);process.exitCode=1;});
