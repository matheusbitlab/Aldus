const assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const {loader,sqliteAdapter}=require('./library-test-utils.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const clone=x=>structuredClone(x);
function backend(){let revision=0;const rows=new Map(),receipts=new Map();let offline=false;
 return {rows,writes:()=>revision,offline:v=>offline=v,adapter:{pull:async owner=>{if(offline)throw Error('offline');return [...rows.values()].filter(r=>r.user_id===owner).map(clone);},apply:async(owner,e)=>{
   if(offline)throw Error('offline');const receipt=receipts.get(owner+e.operationId);if(receipt)return clone(receipt);
   const key=owner+e.key,old=rows.get(key);if(old&&(old.revision!==e.baseRevision||old.deleted_at))return {accepted:false,row:clone(old)};
   if(e.kind!=='book')assert.ok(rows.get(owner+'book:'+e.bookId)&&!rows.get(owner+'book:'+e.bookId).deleted_at);
   const row={user_id:owner,kind:e.kind,id:e.id,book_id:e.bookId,payload:clone(e.payload),revision:++revision,updated_at:new Date().toISOString(),deleted_at:e.deleted?new Date().toISOString():null};rows.set(key,row);const result={accepted:true,row};receipts.set(owner+e.operationId,clone(result));return result;
 }}};}
async function device(remote){
 const db=new DatabaseSync(':memory:'),kv=new Map(),storage={getItem:async k=>kv.get(k)||null,setItem:async(k,v)=>kv.set(k,v)};
 const load=loader({'react-native':{Platform:{OS:'android'}},'@react-native-async-storage/async-storage':storage,'@/src/data/database/connection/database':{getDatabase:async()=>sqliteAdapter(db)}});
 await load('src/data/database/migrations/MigrationRunner.ts').runMigrations(sqliteAdapter(db));db.exec('PRAGMA foreign_keys=ON');
 const scope=new(load('src/data/library/LibraryAccountScope.ts').LibraryAccountScope)();scope.set(A);
 const instantiate=(file,name,...args)=>new(load(file)[name])(...args);
 const raw=instantiate('src/data/repositories/SqliteBookRepository.ts','SqliteBookRepository');
 const chapters=instantiate('src/data/repositories/SqliteChapterRepository.ts','SqliteChapterRepository');
 const progress=instantiate('src/data/repositories/SqliteReadingProgressRepository.ts','SqliteReadingProgressRepository');
 const marks=instantiate('src/data/repositories/SqliteBookmarkRepository.ts','SqliteBookmarkRepository');
 const highlights=instantiate('src/data/repositories/SqliteHighlightRepository.ts','SqliteHighlightRepository');
 const organization=instantiate('src/data/local/LibraryOrganizationStore.ts','LibraryOrganizationStore',storage);
 const pdf=instantiate('src/data/local/PdfReaderSettingsStore.ts','PdfReaderSettingsStore');
 const replica=instantiate('src/data/library/LibraryLocalReplica.ts','LibraryLocalReplica',raw,progress,marks,highlights,organization,pdf,scope);
 const persistence=instantiate('src/data/library/LibrarySyncPersistence.ts','DurableLibrarySyncPersistence');
 const sync=instantiate('src/data/library/LibrarySyncService.ts','LibrarySyncService',persistence,remote.adapter,(owner,e)=>replica.apply(owner,e),scope);
 const account=load('src/data/library/AccountBookRepository.ts'),books=new account.AccountBookRepository(raw,scope);books.attachSync(sync);
 const journal=load('src/data/library/JournaledReadingData.ts');
 const guarded=(repo,kind)=>account.scopeBookData(journal.journalReadingData(repo,kind,sync,scope),books);
 const org=instantiate('src/data/library/AccountOrganizationRepository.ts','AccountOrganizationRepository',journal.journalOrganization(organization,sync,scope),books);
 return {db,scope,books,raw,chapters,progress:guarded(progress,'progress'),marks:guarded(marks,'bookmark'),highlights:guarded(highlights,'highlight'),org,pdf:guarded(pdf,'pdf_position'),sync,replica,persistence,load,synchronize:async()=>{await replica.seed(sync);await sync.sync();}};
}
(async()=>{
 const remote=backend(),a=await device(remote),b=await device(remote);
 const book={ownerUserId:A,id:'book-x',title:'X',author:'Writer',fileName:'x.epub',filePath:'file:///local/x.epub',fileHash:null,mimeType:'application/epub+zip',fileSize:12,coverImagePath:null,totalChapters:1,totalWords:8,addedDate:1,lastOpenedDate:null,isDeleted:false,progress:0,importComplete:false};
 await a.books.save(book);assert.equal(a.sync.status.pending,0);assert.equal((await a.books.listActive()).length,0,'incomplete import hidden');
 await a.chapters.replaceForBook(book.id,[{id:'book-x:chapter',bookId:book.id,chapterIndex:0,title:'Chapter',startCfi:null,endCfi:null,characterCount:8,html:'<p>Text</p>'}]);
 await a.books.save({...book,importComplete:true});assert.equal(a.sync.status.pending,1);assert.equal((await a.books.listActive()).length,1);
 remote.offline(true);await assert.rejects(a.synchronize(),/offline/);assert.ok(await a.books.findById(book.id));remote.offline(false);
 await a.synchronize();await b.synchronize();assert.equal((await b.books.findById(book.id)).filePath,'','B receives only cloud metadata');
 const progress=(percentage)=>({id:'progress-book-x',bookId:book.id,currentChapterId:'book-x:chapter',cfiPosition:'{"anchor":"confirmed"}',percentage,pageNumber:4,updatedAt:Date.now()});
 await a.progress.save(progress(.9));await a.synchronize();await b.synchronize();assert.equal((await b.progress.findByBookId(book.id)).percentage,.9);
 await b.progress.save(progress(.1));await b.synchronize();await a.synchronize();assert.equal((await a.progress.findByBookId(book.id)).percentage,.1);
 const mark=id=>({id,bookId:book.id,chapterId:'book-x:chapter',cfiPosition:'anchor',textPreview:'Excerpt',note:'Private note '+id,createdAt:1});
 await a.marks.save(mark('mark-a'));await b.marks.save(mark('mark-b'));await a.synchronize();await b.synchronize();await a.synchronize();assert.equal((await a.marks.listByBookId(book.id)).length,2);
 await b.marks.save({...mark('mark-a'),note:'Edited on B'});await b.synchronize();await a.synchronize();assert.equal((await a.marks.findById('mark-a')).note,'Edited on B');
 await a.highlights.save({id:'highlight-a',bookId:book.id,chapterId:'book-x:chapter',startCfi:JSON.stringify({comment:'Comment remains inside existing anchor payload'}),endCfi:'end',highlightedText:'Text',colorLabel:'yellow',createdAt:1});await a.synchronize();await b.synchronize();assert.ok((await b.highlights.findById('highlight-a')).startCfi.includes('Comment remains'));
 remote.offline(true);await b.marks.remove('mark-b');await b.highlights.remove('highlight-a');await assert.rejects(b.synchronize(),/offline/);remote.offline(false);await b.synchronize();await a.synchronize();assert.equal(await a.marks.findById('mark-b'),null);assert.equal(await a.highlights.findById('highlight-a'),null);
 const record={bookId:book.id,favorite:true,collections:['Classics'],tags:['study'],series:'Series',volume:2,readingStatus:'reading',updatedAt:1,revision:1};
 await a.org.save(record);await a.synchronize();await b.synchronize();assert.equal((await b.org.list())[book.id].favorite,true);assert.deepEqual((await b.org.list())[book.id].tags,['study']);
 const beforeConflict=await a.persistence.read(A);await assert.rejects(a.org.save({...record,tags:['stale']}),/outra janela/);assert.deepEqual((await a.persistence.read(A)).entries,beforeConflict.entries,'optimistic conflict never becomes a replayable write');
 await assert.rejects(a.org.merge({[book.id]:{...record,bookId:'foreign-book'}},'use-imported'),/fora desta conta/);
 const defaults=a.load('src/domain/types/pdfReader.ts').defaultPdfReaderSettings;
 await a.pdf.save(book.id,{...defaults,mode:'reflow',originalProgress:.8,reflowProgress:.2,fontSize:29});await a.synchronize();await b.synchronize();const settings=await b.pdf.get(book.id);assert.equal(settings.originalProgress,.8);assert.equal(settings.reflowProgress,.2);assert.equal(settings.mode,'reflow');assert.equal(settings.fontSize,defaults.fontSize,'appearance stays on device');
 const rev=remote.writes();await a.synchronize();await b.synchronize();assert.equal(remote.writes(),rev,'pull must not echo any additional mutation');assert.equal(a.sync.status.pending,0);assert.equal(b.sync.status.pending,0,'pull does not echo changes as dirty');
 // A backup merge journals only requested owned records, never another account's global organization map.
 await a.org.merge({[book.id]:{...record,tags:['restored']}},'use-imported');await a.synchronize();await b.synchronize();assert.deepEqual((await b.org.list())[book.id].tags,['restored']);
 await b.marks.save(mark('offline-note'));await a.books.softDelete(book.id);await a.synchronize();await b.synchronize();assert.equal(await b.books.findById(book.id),null);assert.equal((await b.books.listOwned())[0].isDeleted,true);assert.equal(b.sync.status.pending,0);assert.ok((await b.persistence.read(A)).entries['bookmark:offline-note'].conflict,'pending note retained as conflict archive');
 a.scope.set(B);assert.equal((await a.books.listActive()).length,0);await a.synchronize();assert.equal((await a.books.listActive()).length,0);a.scope.set(A);assert.equal((await a.books.listOwned()).length,1,'logout does not delete cached account rows');
 for(const d of [a,b])d.db.close();
 console.log('PASS reading sync with actual SQLite repositories: local import first, cloud metadata, bidirectional reread+anchor, independent marks/notes/comments, offline delete, favorites/collections/tags, separate PDF positions without appearance, atomic restore recovery, no pull echo, parent tombstone beats offline note, A/B isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
