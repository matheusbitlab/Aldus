const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
const baseline=process.argv.includes('--baseline'),cache=new Map(),mocks={};
mocks['@/src/data/sources/sourceCatalogDependencies']={sourceCatalogs:{load:async()=>{},view:()=>({catalog:null})}};
mocks['@/src/data/drive/driveDependencies']={googleDrive:{list:async()=>{throw Error('Drive not connected in legacy source test');}}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const input=baseline&&['SearchBooksUseCase.ts','NetworkFetcherService.ts','searchStore.ts','ThrottleQueue.ts'].some(x=>file.endsWith(x))?cp.execFileSync('git',['show','77c490c:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');const code=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','exports',code)(name=>{if(name in mocks)return mocks[name];if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name);return load(base+'.ts');}return require(name);},exports);return exports;}
const tick=()=>new Promise(setImmediate),deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const good={name:'Gutendex',skipLinkValidation:true,getSearchEndpoint:()=> 'https://gutendex.com/books/',parseResults:()=>[{url:'https://example.org/book.epub',title:'Book',sourceSite:'Gutendex',format:'epub',estimatedSize:null}]};
(async()=>{
 const {SearchBooksUseCase}=load('src/domain/usecases/SearchBooksUseCase.ts'),{NetworkFetcherService}=load('src/data/scraping/NetworkFetcherService.ts');
 let historyStarted=false,finished=false;const historyGate=deferred();
 const search=new SearchBooksUseCase([good],{getText:async()=>''},{canFetch:async()=>true},{waitFor:async()=>{}},{validate:async x=>x},{save:()=>{historyStarted=true;return historyGate.promise;}});
 const task=search.executeDetailed('book').then(r=>{finished=true;return r;});await tick();assert.equal(historyStarted,true);
 assert.equal(finished,!baseline);historyGate.resolve();assert.equal((await task).results.length,1);
 console.log(baseline?'REPRODUCED history.save blocks finished search':'PASS finished search independent from history write');
 const slow=deferred(),updates=[];const all=new SearchBooksUseCase([good],{getText:async url=>url.includes('slow')?slow.promise:''},{canFetch:async()=>true},{waitFor:async()=>{}},{validate:async x=>x},{save:async()=>{}});
 const pending=all.executeDetailed('book',[good,{...good,name:'Slow',getSearchEndpoint:()=> 'https://slow.example/'}],{},undefined,{onPartial:x=>updates.push(x)});await tick();
 assert.equal(updates.some(x=>x.results.length===1&&x.pendingSources?.includes('Slow')),!baseline);slow.resolve('');await pending;
 console.log(baseline?'REPRODUCED Promise.all hides completed source':'PASS partial result before slow source completes');
 const originalFetch=global.fetch;const body=deferred();let outcome='pending';
 global.fetch=async()=>({ok:true,text:()=>body.promise});
 const bodyTask=new NetworkFetcherService().getText('https://body.example/',{timeoutMs:10,retries:0}).then(()=>outcome='success',()=>outcome='error');
 await new Promise(r=>setTimeout(r,30));assert.equal(outcome,baseline?'pending':'error');body.resolve('late');await bodyTask;global.fetch=originalFetch;
 console.log(baseline?'REPRODUCED response body ignores abort and remains pending':'PASS existing deadline/cancel rejects even noncooperative body');
 if(baseline)return;
 let listed=0;const source={id:'json',name:'JSON',kind:'json',url:'https://json.example/books',enabled:true,status:'active',createdAt:1};
 mocks['@/src/data/sources/UserSourceRepository']={UserSourceRepository:class{async list(){listed++;return [source];}}};
 const requests=[];mocks['@/src/presentation/services/dependencies']={appDependencies:{searchBooks:{executeDetailed:(query,plugins,_overrides,signal,options)=>new Promise(resolve=>requests.push({query,plugins,signal,options,resolve}))}}};
 const {useSearchStore:store}=load('src/presentation/stores/searchStore.ts');store.getState().setQuery('Book');
 const gut=store.getState().search('Gutendex');await tick();assert.equal(listed,0);assert.deepEqual(requests.at(-1).plugins.map(x=>x.name),['Gutendex']);
 requests.at(-1).resolve({results:good.parseResults(),sources:[{sourceName:'Gutendex',status:'success'}]});await gut;assert.equal(store.getState().status,'success');
 const allTask=store.getState().search('Todos');await tick();const stale=requests.at(-1);assert.deepEqual(stale.plugins.map(x=>x.name),process.env.EXPO_PUBLIC_CATALOG_CONTACT?['Gutendex','Gutenberg','JSON']:['Gutendex','JSON']);
 stale.options.onPartial({results:good.parseResults(),sources:[{sourceName:'Gutendex',status:'success'}],pendingSources:['JSON']});assert.equal(store.getState().status,'partial');assert.equal(store.getState().isSearching,true);
 const jsonTask=store.getState().search('JSON');await tick();assert.equal(stale.signal.aborted,true);const current=requests.at(-1);assert.deepEqual(current.plugins.map(x=>x.name),['JSON']);
 current.resolve({results:[],sources:[{sourceName:'JSON',status:'error',error:'invalid catalog'}]});await jsonTask;assert.equal(store.getState().status,'error');assert.equal(store.getState().isSearching,false);
 stale.resolve({results:good.parseResults(),sources:[{sourceName:'Gutendex',status:'success'}]});await allTask;assert.equal(store.getState().status,'error');
 const cancelTask=store.getState().search('Todos');await tick();assert.ok(store.getState().sourceStatuses.every(s=>s.status==='loading'));store.getState().cancel();await cancelTask;assert.ok(store.getState().sourceStatuses.every(s=>s.status==='cancelled'));assert.equal(store.getState().status,'cancelled');assert.equal(store.getState().isSearching,false);assert.equal(requests.at(-1).signal.aborted,true);
 // Cancellation while repository.list itself is pending.
 const Repo=mocks['@/src/data/sources/UserSourceRepository'].UserSourceRepository;const old=Repo.prototype.list;Repo.prototype.list=()=>new Promise(()=>{});
 const stuck=store.getState().search('JSON');await tick();store.getState().cancel();await stuck;assert.equal(store.getState().isSearching,false);Repo.prototype.list=old;
 const {ThrottleQueue}=load('src/data/scraping/ThrottleQueue.ts');const queue=new ThrottleQueue(1000);await queue.waitFor('domain');const c=new AbortController(),queued=queue.waitFor('domain',c.signal);c.abort();await assert.rejects(queued,/cancelada/);
 console.log('PASS Gutendex isolation (no source storage), all/JSON selection, partial state, invalid/unavailable, supersession/stale response, cancel pending search/list/throttle');
 const {UserSourceSearchPlugin}=load('src/data/scraping/UserSourceSearchPlugin.ts');
 const server=require('node:http').createServer((req,res)=>{
   if(req.url==='/unavailable'){res.writeHead(503);res.end();return;}
   res.setHeader('Content-Type','application/json');res.end(req.url==='/invalid'?'not JSON':JSON.stringify({books:[{title:'Book',url:'/book.epub'}]}));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base=`http://127.0.0.1:${server.address().port}`;
 const plugins=['valid','invalid','unavailable'].map(route=>new UserSourceSearchPlugin({...source,name:route,url:base+'/'+route}));
 const real=new SearchBooksUseCase(plugins,new NetworkFetcherService(),{canFetch:async()=>true},new ThrottleQueue(0),{validate:async x=>x},{save:async()=>{}});
 const result=await real.executeDetailed('Book');assert.deepEqual(result.sources.map(s=>s.status),['success','error','error']);assert.equal(result.results.length,1);
 console.log('PASS real HTTP local JSON active/invalid/503 with actual fetcher/adapters/aggregation');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
 if(process.argv.includes('--live')){
   const {GutendexSearchPlugin}=load('src/data/scraping/GutendexSearchPlugin.ts');
   const live=new SearchBooksUseCase([new GutendexSearchPlugin()],new NetworkFetcherService(),{canFetch:async()=>true},new ThrottleQueue(0),{validate:async x=>x},{save:async()=>{}});
   const result=await live.executeDetailed('Dickens');console.log('LIVE Gutendex',JSON.stringify({status:result.sources[0].status,results:result.results.length,error:result.sources[0].error}));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
