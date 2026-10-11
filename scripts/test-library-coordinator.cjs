const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {device,backend}=require('./test-library-reading-sync.cjs');
const owner='11111111-1111-4111-8111-111111111111';
(async()=>{
 const remote=backend(),a=await device(remote),b=await device(remote),objects=new Map();
 let downloads=0,deletes=0,uploads=0;
 function wire(d){const local=new Map();const driver={
  local:async book=>local.has(book.filePath)?{uri:book.filePath,size:local.get(book.filePath).length}:null,
  hash:async file=>crypto.createHash('sha256').update(file.bytes??local.get(file.uri)).digest('hex'),
  upload:async(user,path,file)=>{assert.equal(user,owner);assert.ok(remote.rows.get(owner+'book:cloud-book'),'metadata must exist before Storage upload');uploads++;objects.set(path,local.get(file.uri));return 'created';},
  download:async(user,path)=>{assert.equal(user,owner);downloads++;assert.ok(objects.has(path));return{uri:'temp',size:objects.get(path).length,bytes:objects.get(path)};},
  validate:async(file,book)=>({book,chapters:[{id:'chapter',bookId:book.id,chapterIndex:0,title:'Chapter',html:'<p>Reading</p>',characterCount:7,startCfi:null,endCfi:null}]}),
  promote:async(file,book)=>{const uri='local-'+book.id;local.set(uri,file.bytes);return uri;},dispose:async()=>{},removeLocal:async book=>local.delete(book.filePath),
  removeRemote:async(user,path)=>{assert.equal(user,owner);assert.ok(remote.rows.get(owner+'book:cloud-book').deleted_at,'remote delete requires acknowledged tombstone');deletes++;objects.delete(path);},
  listBookObjects:async(user,bookId)=>{assert.equal(user,owner);return [...objects.keys()].filter(path=>path.startsWith(user+'/'+bookId+'/'));},
 };
 const Files=d.load('src/data/library/PrivateBookFileService.ts').PrivateBookFileService,Coordinator=d.load('src/data/library/LibrarySyncCoordinator.ts').LibrarySyncCoordinator;
 const files=new Files(d.books,d.chapters,driver,d.scope),sync=new Coordinator(d.books,d.replica,d.sync,files,d.scope);return{local,files,sync};}
 const x=wire(a),y=wire(b);x.sync.start();y.sync.start();remote.offline(true);
 const book={id:'cloud-book',ownerUserId:owner,importComplete:true,title:'Cloud',author:'Writer',filePath:'local-original',fileName:'cloud.pdf',mimeType:'application/pdf',fileSize:8,fileHash:null,coverImagePath:null,totalChapters:0,totalWords:0,addedDate:1,lastOpenedDate:null,isDeleted:false,progress:0};
 x.local.set(book.filePath,Buffer.from('%PDF-1.7'));await a.books.save(book);await x.sync.refresh();assert.equal(x.sync.availability(book),'SYNC_PENDING');await assert.rejects(x.sync.syncNow(),/offline/);assert.ok(x.local.has(book.filePath));
 remote.offline(false);await x.sync.syncNow();await y.sync.syncNow();assert.equal(uploads,1);assert.equal(downloads,0,'sync metadata must not download files');let cloud=await b.books.findById(book.id);assert.equal(y.sync.availability(cloud),'CLOUD_ONLY');
 const Open=b.load('src/domain/usecases/OpenBookUseCase.ts').OpenBookUseCase;const open=new Open(b.books,b.chapters,b.progress,b.org,(id,signal)=>y.files.ensureLocal(id,signal));
 const opened=await open.execute(book.id);assert.ok(opened.book.filePath);assert.equal(opened.chapters.length,1);await y.sync.syncNow();assert.equal(y.sync.availability(opened.book),'SYNCED');
 await y.sync.removeDeviceCopy(book.id);cloud=await b.books.findById(book.id);assert.equal(cloud.filePath,'');assert.equal(y.sync.availability(cloud),'CLOUD_ONLY');await open.execute(book.id);assert.equal(deletes,0);
 objects.set(owner+'/'+book.id+'/'+'0'.repeat(64)+'.pdf',Buffer.from('lost upload response orphan'));
 await a.books.softDelete(book.id);await x.sync.syncNow();assert.equal(deletes,2,'cleanup also finds unacknowledged private objects');await y.sync.syncNow();assert.equal(await b.books.findById(book.id),null);assert.equal((await b.books.listActive()).length,0);
 x.sync.stop();y.sync.stop();a.scope.set(null);await x.sync.refresh();assert.equal(x.sync.status.pendingFiles,0);a.scope.set('22222222-2222-4222-8222-222222222222');assert.equal((await a.books.listActive()).length,0);assert.equal(x.sync.engine.status.pending,0);
 a.db.close();b.db.close();console.log('PASS coordinator with actual SQLite: offline import, publish-before-upload, publish-after-upload, no eager download, OpenBook on-demand, verified device-only eviction/reopen, acknowledged remote cleanup/tombstones and account revocation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
