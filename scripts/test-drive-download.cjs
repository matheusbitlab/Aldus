const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function loader(platform,files={}) {
 const mocks={'react-native':{Platform:{OS:platform}},'expo-file-system/legacy':files,'@/src/data/downloads/StorageValidator':{assertStorageAvailable:async()=>{}},'@/src/data/downloads/NetworkStatusService':{NetworkStatusService:class{async assertConnected(){}}}},cache=new Map();
 function load(file){if(cache.has(file))return cache.get(file);const out={};cache.set(file,out);new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(n=>n in mocks?mocks[n]:n.startsWith('@/')?load(n.slice(2)+'.ts'):n.startsWith('.')?load(path.posix.join(path.posix.dirname(file),n)+'.ts'):require(n),out);return out;}return load;
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}, tick=()=>new Promise(setImmediate);
function job(format,op='download-fixture'){return {id:'book-'+format,url:'https://www.googleapis.com/drive/v3/files/file1?alt=media',format,drive:{sourceId:'source1',fileId:'file1'},fileName:'Book.'+format,operationId:op,status:'queued',progress:0,localUri:null,error:null,attempts:0};}
(async()=>{
 const original=global.fetch;
 try{
  const load=loader('web'),{DownloadManager}=load('src/data/downloads/DownloadManager.ts'),{assertDriveResponse}=load('src/data/drive/DriveErrors.ts');
  let resolved=0,epubs=0,pdfs=0;
  const resolver={resolve:async j=>{assert.equal(j.drive.fileId,'file1');resolved++;return {url:j.url,headers:{Authorization:'Bearer fixture-only','X-Goog-Drive-Resource-Keys':'file1/key'}};},checkStatus:(_j,s)=>assertDriveResponse(s)};
  const epub={importFromUri:async(_u,_n,blob,_id,opts)=>{assert.equal(blob.type,'application/epub+zip');epubs++;opts.onPhase({phase:'persisting',cancellable:false});return {id:'imported-epub',filePath:'web-epub://imported'};}};
  const pdf={importFromUri:async(_u,name,id,blob,opts)=>{assert.equal(name,'Book.pdf');assert.equal(id,undefined);assert.equal(blob.type,'application/pdf');pdfs++;opts.onPhase({phase:'persisting',cancellable:false});return {id:'imported-pdf',filePath:'web-pdf://imported'};}};
  const manager=new DownloadManager(epub,undefined,pdf,resolver);
  const total=8*1024*1024,chunkSize=256*1024;
  global.fetch=async(url,options)=>{assert.match(url,/alt=media/);assert.equal(options.headers.Authorization,'Bearer fixture-only');let sent=0;return new Response(new ReadableStream({pull(c){if(sent===total){c.close();return;}c.enqueue(new Uint8Array(chunkSize));sent+=chunkSize;}}),{headers:{'content-length':String(total)}});};
  for(const format of ['epub','pdf']){const updates=[];const done=await manager.download(job(format),u=>updates.push(u));assert.equal(done.status,'completed');assert.equal(done.importedBookId,'imported-'+format);const percentages=updates.filter(u=>u.phase==='downloading'&&u.progressKnown).map(u=>u.progress);assert.ok(percentages.length>1);assert.equal(percentages.at(-1),1);assert.ok(percentages.every((p,i)=>i===0||p>=percentages[i-1]));assert.ok(updates.every(u=>!JSON.stringify(u).includes('fixture-only')),'Headers must not leak into stores');}
  assert.equal(epubs,1);assert.equal(pdfs,1);assert.equal(resolved,2);
  console.log('PASS Drive EPUB/PDF dispatch to existing importer, 8 MiB streamed real progress, no credentials in jobs');
  for(const [status,code] of [[401,'expired'],[403,'api'],[404,'not-found'],[429,'rate-limit'],[500,'api']]){const updates=[];global.fetch=async()=>new Response('not a book',{status});await assert.rejects(manager.download(job('pdf','error-'+status),u=>updates.push(u)),e=>e.code===code);assert.equal(updates.at(-1).status,'failed');assert.doesNotMatch(updates.at(-1).error,/inválido|corrompido/i);}
  assert.equal(pdfs,1,'HTTP errors must never reach parser');
  console.log('PASS Drive errors before parser including expired token, not corrupt-file misclassification');
  const gate=deferred(),updates=[];global.fetch=()=>gate.promise;
  const cancelled=manager.download(job('pdf','cancel-bytes'),u=>updates.push(u));await tick();await manager.cancel('book-pdf');await assert.rejects(cancelled,e=>e.name==='AbortError');gate.resolve(new Response(new Uint8Array(8)));await tick();assert.equal(updates.at(-1).status,'cancelled');assert.equal(pdfs,1);
  const authGate=deferred();const authManager=new DownloadManager(epub,undefined,pdf,{...resolver,resolve:()=>authGate.promise});const preparing=authManager.download(job('epub','cancel-auth'),()=>{});await tick();await authManager.cancel('book-epub');await assert.rejects(preparing,e=>e.name==='AbortError');authGate.resolve({url:job('epub').url,headers:{Authorization:'Bearer late'}});await tick();assert.equal(epubs,1);
  console.log('PASS cancel preparation/transfer, ignored late credentials/response, no import after cancel');
  const deleted=[],pending=deferred();let status=200,nativeCancels=0;
  const files={documentDirectory:'file:///app/',makeDirectoryAsync:async()=>{},createDownloadResumable:(_url,uri,options,progress)=>{assert.equal(options.headers.Authorization,'Bearer fixture-only');return {downloadAsync:async()=>{if(status===0){await pending.promise;}progress({totalBytesWritten:100,totalBytesExpectedToWrite:100});return {uri,status:status||200};},cancelAsync:async()=>{nativeCancels++;}};},getInfoAsync:async()=>({exists:true,size:100}),moveAsync:async()=>{},deleteAsync:async uri=>{deleted.push(uri);}};
  const {DownloadManager:NativeManager}=loader('android',files)('src/data/downloads/DownloadManager.ts');
  const nativePdf={importFromUri:async(uri,name,_id,blob,opts)=>{assert.match(uri,/books\/imported\//);assert.equal(name,'Book.pdf');assert.equal(blob,undefined);opts.onPhase({phase:'persisting',cancellable:false});return {id:'native-imported-pdf',filePath:uri};}};
  const nativeManager=new NativeManager(epub,undefined,nativePdf,resolver);
  const nativeDone=await nativeManager.download(job('pdf','native-pdf'),()=>{}); assert.equal(nativeDone.status,'completed'); assert.equal(nativeDone.importedBookId,'native-imported-pdf');
  status=401;await assert.rejects(nativeManager.download(job('pdf','native-401'),()=>{}),e=>e.code==='expired');assert.ok(deleted.some(p=>p.includes('/books/temp/')));assert.ok(deleted.some(p=>p.includes('/books/imported/')));
  status=200;const fails=new NativeManager(epub,undefined,{importFromUri:async()=>{throw Error('PDF storage failed');}},resolver);await assert.rejects(fails.download(job('pdf','native-import-fail'),()=>{}));assert.ok(deleted.some(p=>p.includes('native-import-fail')));
  status=0;const nativeLate=nativeManager.download(job('pdf','native-late'),()=>{});await tick();await nativeManager.cancel('book-pdf');await assert.rejects(nativeLate,e=>e.name==='AbortError');const count=deleted.length;pending.resolve();await tick();await tick();assert.ok(deleted.length>count,'Late native completion must clean files again');assert.ok(nativeCancels>0);
  console.log('PASS Android mock headers/PDF import/HTTP rejection/temp+moved cleanup/late native write cleanup');
 } finally {global.fetch=original;}
})().catch(e=>{console.error(e);process.exitCode=1;});
