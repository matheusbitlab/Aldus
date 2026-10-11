const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {device,backend}=require('./test-library-reading-sync.cjs');
const owner='11111111-1111-4111-8111-111111111111';
(async()=>{
 const directory=fs.mkdtempSync(path.resolve('.expo/library-restart-')),remote=backend(),aPath=path.join(directory,'a.sqlite'),bPath=path.join(directory,'b.sqlite');let a=await device(remote,{path:aPath});
 const book={id:'restart-book',ownerUserId:owner,importComplete:true,title:'Durable offline',author:'Writer',filePath:'local-original',fileName:'x.epub',mimeType:'application/epub+zip',fileSize:50,fileHash:null,coverImagePath:null,totalChapters:0,totalWords:0,addedDate:1,lastOpenedDate:null,isDeleted:false,progress:0};
 await a.books.save(book);remote.offline(true);await assert.rejects(a.synchronize(),/offline/);
 const progress={id:'progress-restart-book',bookId:book.id,currentChapterId:null,cfiPosition:'reread-anchor',percentage:.12,pageNumber:4,updatedAt:9999999999999};
 await assert.rejects(a.sync.change('progress',book.id,book.id,a.load('src/data/library/LibrarySyncPayload.ts').progressSyncPayload(progress),false,async()=>{throw Error('interrupted local write');}),/interrupted/);
 a.scope.set(null);a.db.close();a=await device(remote,{path:aPath});assert.equal((await a.books.listActive()).length,1);let state=await a.sync.snapshot();assert.ok(state.entries['book:'+book.id].dirty);assert.equal(state.entries['progress:'+book.id].ready,false);
 remote.offline(false);await a.synchronize();assert.equal((await a.progress.findByBookId(book.id)).percentage,.12);const b=await device(remote,{path:bPath});await b.synchronize();assert.equal((await b.books.findById(book.id)).filePath,'');assert.equal((await b.progress.findByBookId(book.id)).cfiPosition,'reread-anchor');
 await b.books.softDelete(book.id);await b.synchronize();await a.synchronize();a.scope.set(null);a.db.close();a=await device(remote,{path:aPath});await a.synchronize();assert.equal(await a.books.findById(book.id),null);assert.ok((await a.books.listOwned())[0].isDeleted);
 const validate=a.load('src/domain/types/librarySync.ts').validateRemoteRow,row=[...remote.rows.values()][0];for(const id of ['../book','__proto__','constructor',{},'x'.repeat(201)])assert.throws(()=>validate({...row,id,book_id:id},owner),/inválida/);assert.throws(()=>validate({...row,payload:JSON.parse('{"__proto__":{"polluted":true}}')},owner),/inválida/);assert.equal({}.polluted,undefined);
 a.scope.set(null);a.db.close();b.scope.set(null);b.db.close();console.log('PASS two file-backed SQLite databases: close/reopen offline import/outbox, replay interrupted local write, metadata-only device B, reread anchor, durable permanent tombstone and malicious remote IDs/prototype rejected. Databases kept only under ignored .expo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
