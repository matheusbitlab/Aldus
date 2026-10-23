// Real progress use case/repository and SQLite; no second progress store or remote writes.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'aldus-location-')),'progress.db');
let db=new DatabaseSync(file);db.exec('CREATE TABLE reading_progress(id TEXT PRIMARY KEY,book_id TEXT UNIQUE,current_chapter_id TEXT,cfi_position TEXT,percentage REAL,page_number INTEGER,updated_at INTEGER)');
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>name.endsWith('/connection/database')?{getDatabase:async()=>({getFirstAsync:async(sql,...args)=>db.prepare(sql).get(...args),runAsync:async(sql,...args)=>db.prepare(sql).run(...args)})}:load(name.startsWith('@/')?name.slice(2)+'.ts':path.join(path.dirname(file),name)+'.ts'),exports);return exports;}
(async()=>{try{
 const {encodeReaderLocation,decodeReaderLocation}=load('src/domain/types/readerLocation.ts');
 const anchor={version:1,kind:'epub-text',chapterId:'synthetic-chapter',start:12,end:23,quote:'Texto de QA',prefix:'',suffix:'',path:[0,1]};
 const encoded=encodeReaderLocation('epub',anchor);assert.deepEqual(decodeReaderLocation(encoded,'epub'),anchor);
 assert.equal(decodeReaderLocation(encoded,'pdf-reflow'),null);
 for(const value of [null,'epubcfi(/6/2)','{','{}','x'.repeat(20001),JSON.stringify({...JSON.parse(encoded),version:2}),JSON.stringify({...JSON.parse(encoded),anchor:{...anchor,end:999}})])assert.equal(decodeReaderLocation(value,'epub'),null);
 const {SqliteReadingProgressRepository}=load('src/data/repositories/SqliteReadingProgressRepository.ts');const repo=new SqliteReadingProgressRepository();
 const {UpdateReadingProgressUseCase}=load('src/domain/usecases/UpdateReadingProgressUseCase.ts');const update=new UpdateReadingProgressUseCase(repo);
 await update.execute({bookId:'synthetic-A',currentChapterId:anchor.chapterId,cfiPosition:encoded,percentage:.25,pageNumber:3});
 db.close();db=new DatabaseSync(file);const restored=await repo.findByBookId('synthetic-A');assert.deepEqual(decodeReaderLocation(restored.cfiPosition,'epub'),anchor);assert.equal(restored.pageNumber,3);assert.equal(restored.percentage,.25);
 await update.execute({bookId:'synthetic-B',currentChapterId:null,percentage:0,pageNumber:1});assert.equal((await repo.findByBookId('synthetic-B')).cfiPosition,null);assert.equal((await repo.findByBookId('synthetic-A')).cfiPosition,encoded);
 assert.equal((await repo.findByBookId('synthetic-A')).id,'progress-synthetic-A');
 console.log('PASS versioned textual location, legacy/invalid/mode isolation, actual SQLite cold reopen and existing progress identity');
 }finally{db.close();fs.unlinkSync(file);fs.rmdirSync(path.dirname(file));}})().catch(e=>{console.error(e);process.exitCode=1});
