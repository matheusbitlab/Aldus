const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');
const cache=new Map(),baseline=process.argv.includes('--baseline');let duringWrite;
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE pdf_reflow_cache (book_id TEXT PRIMARY KEY,source_signature TEXT,processor_version INTEGER,document_json TEXT,updated_at INTEGER)');
const adapter={runAsync:async(sql,...args)=>{db.prepare(sql).run(...args);duringWrite?.()},getFirstAsync:async(sql,...args)=>db.prepare(sql).get(...args),withExclusiveTransactionAsync:async fn=>{db.exec('BEGIN');try{await fn(adapter);db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
 const source=baseline&&file.endsWith('AccountBookRepository.ts')?cp.execFileSync('git',['show','3df3f5b:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports',code)(name=>{
 if(name.includes('/connection/database'))return {getDatabase:async()=>adapter};
 if(name.endsWith('BundledBookIdentity'))return {};
 if(name.endsWith('LibrarySyncPayload'))return {};
 if(name.startsWith('@/')||name.startsWith('.'))return load((name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name))+'.ts');return require(name);
 },exports);return exports;}
(async()=>{
 const builder=load('src/data/local/PdfReflowDocumentBuilder.ts'),quality=load('src/data/local/pdfReflowQuality.ts');
 const fixture=[{pageNumber:1,pageWidth:500,pageHeight:700,textItems:[{text:'Readable text for cache validation. '.repeat(100),x:20,y:600,width:300,height:12}],images:[]}];
 const document=builder.buildPdfReflowDocument(fixture,1),record={id:'owned',sourceSignature:'fixture',processorVersion:12,document,updatedAt:1};
 const {LibraryAccountScope}=load('src/data/library/LibraryAccountScope.ts'),scope=new LibraryAccountScope();scope.set('A');
 const repo=new (load('src/data/repositories/SqlitePdfReflowCacheRepository.ts').SqlitePdfReflowCacheRepository)();
 const guarded=load('src/data/library/AccountBookRepository.ts').scopeBookData(repo,{scope,findById:async id=>id==='owned'?{id,ownerUserId:'A'}:null});
 await guarded.save(record);assert.deepEqual((await guarded.findByBookId('owned')).document,document,'Cache record.id is the book ID, not a missing record.bookId');
 await assert.rejects(guarded.save({...record,id:'foreign'}),/conta/);
 const abort=new AbortController();duringWrite=()=>abort.abort();await assert.rejects(repo.save({...record,updatedAt:2},abort.signal));duringWrite=null;
 assert.equal((await repo.findByBookId('owned')).updatedAt,1,'Cancelled Native write must roll back, preserving prior valid cache');
 await assert.rejects(repo.save({...record,document:{...document,extractionQuality:undefined}}),/qualidade/);assert.equal((await repo.findByBookId('owned')).updatedAt,1);
 const fake=require('../.expo/flashcard-db-test/node_modules/fake-indexeddb');global.indexedDB=fake.indexedDB;global.IDBKeyRange=fake.IDBKeyRange;
 const web=new (load('src/data/repositories/IndexedDbPdfReflowCacheRepository.ts').IndexedDbPdfReflowCacheRepository)();
 await web.save(record);assert.deepEqual((await web.findByBookId('owned')).document,document);
 // Simulate a quota/commit failure AFTER the put request, the old success boundary.
 const originalPut=fake.IDBObjectStore.prototype.put;
 fake.IDBObjectStore.prototype.put=function(value,...args){const request=originalPut.call(this,value,...args);request.addEventListener('success',()=>this.transaction.abort());return request};
 await assert.rejects(web.save({...record,updatedAt:2}));
 fake.IDBObjectStore.prototype.put=originalPut;
 assert.equal((await web.findByBookId('owned')).updatedAt,1,'Request success is not a committed IndexedDB cache');
 const serializer=load('src/data/local/reflowSerialization.ts').serializeReflowCache;
 const tricky={a:'x'.repeat(16383)+'😀\ud800\udc00\ud800\n\\"<',b:[undefined,null,1,NaN,true],skip:undefined};
 assert.equal(await serializer(tricky),JSON.stringify(tricky));
 const big={...document,chapters:[{id:'big',title:'Large',blocks:Array.from({length:20000},(_,i)=>({type:'paragraph',text:'Readable prose 😀 & < >. '.repeat(16),pageNumber:i+1}))}]};
 let beats=0;const timer=setInterval(()=>beats++,1),started=performance.now(),before=process.memoryUsage();
 assert.equal(await quality.isValidatedReflowDocumentAsync(big),true);const validationMs=performance.now()-started;const serialStart=performance.now();const serialized=await serializer(big);const serializationMs=performance.now()-serialStart;clearInterval(timer);
 assert.deepEqual(JSON.parse(serialized),big);assert.ok(beats>2,'Large validation/serialization must let host input execute');
 const controller=new AbortController(),work=serializer(big,controller.signal);setTimeout(()=>controller.abort(),0);await assert.rejects(work,{name:'AbortError'});
 const canceled=new AbortController();const validation=quality.isValidatedReflowDocumentAsync(big,canceled.signal);setTimeout(()=>canceled.abort(),0);await assert.rejects(validation,{name:'AbortError'});
 assert.deepEqual(await builder.toStoredReflowChaptersAsync('owned',document),builder.toStoredReflowChapters('owned',document));
 console.log(JSON.stringify({jsonBytes:Buffer.byteLength(serialized),validationMs:Math.round(validationMs),serializationMs:Math.round(serializationMs),hostTurns:beats,heapBefore:before.heapUsed,heapAfter:process.memoryUsage().heapUsed}));
 if(process.argv.includes('--pdfs')){
   const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
   for(const file of ['sobre-o-ocio.pdf','Weber-Etica.pdf','a-republica.pdf','weber-m-economia-e-sociedade-fundamentos-da-sociologia-compreensiva-volume-2.pdf']){
     const data=fs.readFileSync(path.join('assets','Livros',file));const start=performance.now(),task=pdfjs.getDocument({data:new Uint8Array(data),useSystemFonts:true});
     const pdf=await task.promise,opened=performance.now(),pages=[];
     try{
       for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);try{const text=await page.getTextContent(),vp=page.getViewport({scale:1});pages.push({pageNumber:n,pageWidth:vp.width,pageHeight:vp.height,textItems:text.items.filter(i=>typeof i.str==='string'&&i.transform).map(i=>({text:i.str,x:i.transform[4],y:i.transform[5],width:i.width,height:i.height,fontName:i.fontName,hasEOL:i.hasEOL})),images:[]})}finally{page.cleanup()}}
       const extracted=performance.now(),built=await builder.buildPdfReflowDocumentAsync(pages,pdf.numPages,new AbortController().signal),buildDone=performance.now();
       assert.equal(await quality.isValidatedReflowDocumentAsync(built),true);const validated=performance.now();
       const html=await builder.toStoredReflowChaptersAsync('owned',built);const converted=performance.now();
       await guarded.save({...record,document:built});const committed=performance.now();assert.deepEqual((await guarded.findByBookId('owned')).document,built);const read=performance.now();
       console.log('REAL_PDF_TEXT_ONLY',JSON.stringify({file,pages:pdf.numPages,pdfBytes:data.length,characters:built.characterCount,htmlBytes:Buffer.byteLength(html.map(c=>c.html).join('')),openMs:Math.round(opened-start),extractMs:Math.round(extracted-opened),buildMs:Math.round(buildDone-extracted),validateMs:Math.round(validated-buildDone),htmlMs:Math.round(converted-validated),serializeAndCommitMs:Math.round(committed-converted),cacheReadVerifyMs:Math.round(read-committed),heap:process.memoryUsage().heapUsed}));
     }finally{await task.destroy()}
   }
 }
 db.close();console.log('PASS account-scoped cache ID, real SQLite commit/rollback, quality/JSON parity, large CPU slices, cancellation, old cache preservation. Native IO remains controlled.');
})().catch(e=>{console.error(e);process.exitCode=1});
