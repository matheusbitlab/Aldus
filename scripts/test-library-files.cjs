const assert=require('node:assert/strict'),crypto=require('node:crypto'),JSZip=require('jszip');
const {loader}=require('./library-test-utils.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const clone=x=>structuredClone(x);
(async()=>{
 let user=A,offline=false,lost=false,corrupt=false,hold,gets=0,duplicateStatus=409,duplicateBody=''; const objects=new Map();
 const previousFetch=global.fetch;
 process.env.EXPO_PUBLIC_SUPABASE_URL='https://private.example.test';process.env.EXPO_PUBLIC_SUPABASE_KEY='public-test-key';
 global.fetch=async(url,options={})=>{
   if(offline)throw Error('offline'); if(hold)await hold;
   assert.equal(options.headers.Authorization,`Bearer jwt-${A}`,'JWT stays frozen to the operation owner');
   const path=decodeURIComponent(new URL(url).pathname.split('/aldus-private-library/')[1]??'');
   assert.ok(path.startsWith(A+'/'),'private own prefix');
   if(options.method==='POST'){if(objects.has(path))return new Response(duplicateBody,{status:duplicateStatus});objects.set(path,options.body);if(lost){lost=false;throw Error('lost response');}return new Response('',{status:200});}
   gets++;const file=objects.get(path);if(!file)return new Response('',{status:404});
   return new Response(corrupt?new Blob(['corrupt']):file,{status:200});
 };
 const platform={OS:'web'},nativeFiles={createUploadTask:()=>({uploadAsync:async()=>({status:400,body:duplicateBody}),cancelAsync:async()=>{}}),FileSystemUploadType:{BINARY_CONTENT:0}};
 const load=loader({'react-native':{Platform:platform},'expo-file-system/legacy':nativeFiles,'expo-file-system':{},
   '@/src/data/remote/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:user},access_token:`jwt-${user}`}}})}}},
   '@/src/presentation/services/PdfThumbnailGenerator':{pdfThumbnailGenerator:{generate:async()=>null}}});
 const {libraryAccountScope:scope}=load('src/data/library/LibraryAccountScope.ts');scope.set(A);
 const {hashBookFile,BOOK_FILE_CHUNK}=load('src/data/library/BookFileIntegrity.ts');
 const bytes=crypto.randomBytes(BOOK_FILE_CHUNK*3+37);let reads=0;
 assert.equal(await hashBookFile(bytes.length,async(offset,length)=>{reads++;assert.ok(length<=BOOK_FILE_CHUNK);return bytes.subarray(offset,offset+length);}),crypto.createHash('sha256').update(bytes).digest('hex'));
 assert.equal(reads,4);await assert.rejects(hashBookFile(10,async()=>new Uint8Array(9)),/incompleto/);
 function device(){
   const values=new Map(),files=new Map(),chapters=new Map();let failSave=false;
   const raw={listAll:async()=>[...values.values()].map(clone),listActive:async()=>[...values.values()].filter(b=>!b.isDeleted).map(clone),findById:async id=>{const b=values.get(id);return b&&!b.isDeleted?clone(b):null;},save:async book=>{if(failSave)throw Error('disk full');values.set(book.id,clone(book));},softDelete:async id=>{values.get(id).isDeleted=true;}};
   const books=new(load('src/data/library/AccountBookRepository.ts').AccountBookRepository)(raw);
   const chapterStore={listByBookId:async id=>chapters.get(id)||[],replaceForBook:async(id,data)=>chapters.set(id,data)};
   const webFiles={get:async id=>files.get(id)||null,save:async(id,_name,file)=>files.set(id,file),delete:async id=>files.delete(id)};
   const driver=new(load('src/data/library/SupabaseBookFileDriver.ts').SupabaseBookFileDriver)(webFiles);
   const service=new(load('src/data/library/PrivateBookFileService.ts').PrivateBookFileService)(books,chapterStore,driver);
   return {books,values,files,chapters,driver,service,fail:v=>failSave=v};
 }
 const book=(id,format='pdf')=>({ownerUserId:A,id,title:'X',author:'Author',fileName:`x.${format}`,filePath:`web-${format}://${id}`,fileHash:null,mimeType:format==='pdf'?'application/pdf':'application/epub+zip',fileSize:0,coverImagePath:null,totalChapters:1,totalWords:0,addedDate:1,lastOpenedDate:null,isDeleted:false,progress:.42,importComplete:true});
 const document=await require('pdf-lib').PDFDocument.create();document.addPage([300,400]).drawText('Real PDF fixture for private sync');
 const a=device(),b=device();const pdf=new Blob([await document.save()],{type:'application/pdf'});
 await a.books.save(book('x'));a.files.set('x',pdf);
 offline=true;await assert.rejects(a.service.upload('x'),/offline/);assert.equal((await a.books.findById('x')).filePath,'web-pdf://x');assert.equal(a.service.states.get('x').state,'ERROR');
 offline=false;lost=true;await assert.rejects(a.service.upload('x'),/lost response/);await a.service.upload('x');assert.equal(objects.size,1,'lost upload response retry does not duplicate files');
 const published=await a.books.findById('x');assert.equal(published.fileSize,pdf.size);assert.match(published.fileHash,/^[a-f0-9]{64}$/);
 duplicateStatus=400;
 for(const body of [{statusCode:'409',error:'Duplicate',message:'The resource already exists'},{code:'ResourceAlreadyExists'}, {code:'KeyAlreadyExists'}, {code:'already_exists'}]) {
   duplicateBody=JSON.stringify(body);assert.equal(await a.driver.upload(A,published.remotePath,{blob:pdf,size:pdf.size,uri:''},'application/pdf',new AbortController().signal),'exists');
 }
 duplicateBody=JSON.stringify({code:'InvalidMimeType'});await assert.rejects(a.driver.upload(A,published.remotePath,{blob:pdf,size:pdf.size,uri:''},'application/pdf',new AbortController().signal),/Falha na transferência/);
 duplicateBody='not JSON';await assert.rejects(a.driver.upload(A,published.remotePath,{blob:pdf,size:pdf.size,uri:''},'application/pdf',new AbortController().signal),/Falha na transferência/);
 platform.OS='android';duplicateBody=JSON.stringify({error:'Duplicate'});assert.equal(await a.driver.upload(A,published.remotePath,{size:pdf.size,uri:'controlled://file'},'application/pdf',new AbortController().signal),'exists');
 duplicateBody=JSON.stringify({code:'AccessDenied'});await assert.rejects(a.driver.upload(A,published.remotePath,{size:pdf.size,uri:'controlled://file'},'application/pdf',new AbortController().signal),/Falha na transferência/);platform.OS='web';
 // Exercise the whole lost-response recovery for HTTP 400, including SHA verification.
 await a.books.save(book('legacy'));a.files.set('legacy',pdf);lost=true;await assert.rejects(a.service.upload('legacy'),/lost response/);duplicateBody=JSON.stringify({error:'Duplicate'});
 corrupt=true;await assert.rejects(a.service.upload('legacy'),/incompleto|integridade/);assert.ok(!(await a.books.findById('legacy')).remotePath,'HTTP 400 duplicate must not publish corrupt remote bytes');corrupt=false;
 await a.service.upload('legacy');assert.ok((await a.books.findById('legacy')).remotePath);duplicateStatus=409;duplicateBody='';
 await b.books.save({...published,filePath:'',coverImagePath:null});assert.equal(b.files.size,0,'metadata only does not download a book');
 b.fail(true);await assert.rejects(b.service.ensureLocal('x'),/disk full/);assert.equal((await b.books.findById('x')).filePath,'','failed publication must not expose an incomplete local book');b.fail(false);
 const local=await b.service.ensureLocal('x');assert.equal(local.filePath,'web-pdf://x');assert.equal(local.progress,.42);assert.equal(b.chapters.get('x').length,1);assert.equal(await b.files.get('x').text(),await pdf.text());assert.equal((await require('pdf-lib').PDFDocument.load(await b.files.get('x').arrayBuffer())).getPageCount(),1);
 await b.service.removeDeviceCopy('x');assert.equal((await b.books.findById('x')).filePath,'');assert.equal(b.files.size,0);assert.equal(objects.size,2);await b.service.ensureLocal('x');assert.equal(b.files.size,1);
 await b.service.removeDeviceCopy('x');corrupt=true;await assert.rejects(b.service.ensureLocal('x'),/incompleto|integridade/);assert.equal((await b.books.findById('x')).filePath,'');assert.equal(b.files.size,0);corrupt=false;
 let release;hold=new Promise(r=>release=r);const late=b.service.ensureLocal('x');await new Promise(r=>setTimeout(r,5));scope.set(B);user=B;release();await assert.rejects(late,/conta mudou|cancel/i);assert.equal(await b.books.findById('x'),null);assert.equal(b.files.size,0);hold=null;scope.set(A);user=A;
 // The actual EPUB ZIP/XML parser builds chapters with the same stable book identity.
 const zip=new JSZip();zip.file('mimetype','application/epub+zip');zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');
 zip.file('OPS/book.opf','<package><metadata><title>EPUB X</title><creator>Author</creator></metadata><manifest><item id="c" href="c.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c"/></spine></package>');zip.file('OPS/c.xhtml','<html><body><h1>Chapter</h1><p>Real parser controlled content.</p></body></html>');
 const epub=new Blob([await zip.generateAsync({type:'uint8array'})],{type:'application/epub+zip'});await a.books.save(book('epub','epub'));a.files.set('epub',epub);await a.service.upload('epub');const remoteEpub=await a.books.findById('epub');await b.books.save({...remoteEpub,filePath:''});
 await b.service.ensureLocal('epub');assert.ok(b.chapters.get('epub')[0].html.includes('Real parser'));assert.ok(b.chapters.get('epub')[0].id.startsWith('epub:'));
 // A valid checksum alone cannot make the wrong file format a valid local book.
 const bad=book('bad');await a.books.save(bad);a.files.set('bad',new Blob(['NOT A PDF']));await a.service.upload('bad');await b.books.save({...await a.books.findById('bad'),filePath:''});await assert.rejects(b.service.ensureLocal('bad'),/PDF válido/);assert.equal(b.files.has('bad'),false);
 await a.books.softDelete('x');await assert.rejects(a.service.ensureLocal('x'),/disponível/);
 assert.ok(gets>=5);global.fetch=previousFetch;
 console.log('PASS private files controlled HTTP + actual importers: bounded SHA-256 interoperates with Node, offline local preservation, lost-upload retry, cloud-only metadata, PDF/EPUB on-demand validation, device-only remove/reopen, corrupt/invalid bytes rejected, stale-account download cancelled. Storage HTTP real pending.');
})().catch(error=>{console.error(error);process.exitCode=1});
