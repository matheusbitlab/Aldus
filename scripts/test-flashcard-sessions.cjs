const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,deps={}){const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>deps[name]??require(name),exports);return exports;}
const types=load('src/domain/types/flashcards.ts'),srs=load('src/domain/study/flashcardSrs.ts'),scoring=load('src/domain/study/flashcardScoring.ts',{'../types/flashcards':types});
const memory=new Map();let fail=false;const storage={getItem:async key=>memory.get(key)??null,setItem:async(key,value)=>{if(fail)throw Error('quota');memory.set(key,value);}};
const {LocalFlashcardRepository}=load('src/data/local/FlashcardRepository.ts',{'./flashcardStorage':{flashcardStorage:storage},'@/src/domain/types/flashcards':types,'@/src/domain/study/flashcardSrs':srs,'@/src/domain/study/flashcardScoring':scoring});
(async()=>{
 const repo=new LocalFlashcardRepository(storage,'test-account-A'),other=new LocalFlashcardRepository(storage,'test-account-B');
 const deck={id:'deck',title:'Teste',description:'',category:'',bookIds:[],isGenerated:false,createdAt:0,updatedAt:0};await repo.createDeck(deck);
 const base={id:'card',deckId:'deck',title:'Título',statement:'Afirmação',isTrue:false,explanation:'Explicação',front:'Afirmação',back:'Explicação',status:'approved',difficulty:'MEDIUM',tags:[],interval:1,repetition:0,easeFactor:2.5,dueAt:0,source:types.newFlashcardSource(),createdAt:0,updatedAt:0};
 await repo.createCards([{...base,id:'incomplete',isTrue:undefined},{...base,id:'draft',status:'draft'}]);await assert.rejects(()=>repo.studySession('deck'),/completos/);
 await repo.createCards([base,{...base,id:'second',isTrue:true},base]);assert.equal((await repo.load()).cards.filter(c=>c.id==='card').length,1);
 const session=await repo.studySession('deck');assert.equal(session.cards.length,2);assert.equal(session.score,0);
 await repo.updateCard({...base,isTrue:true,explanation:'Editada'});assert.equal((await repo.studySession('deck')).cards[0].isTrue,false);
 await Promise.all(Array.from({length:8},()=>repo.answerStudy(session.id,'card','DOUBLE_CHECK')));
 let resumed=await new LocalFlashcardRepository(storage,'test-account-A').studySession('deck');assert.equal(resumed.score,-10);assert.equal(resumed.answers.length,1);assert.equal((await repo.load()).reviews.length,1);assert.equal(resumed.index,0);
 await repo.answerStudy(session.id,'card','XX');assert.equal((await repo.studySession('deck')).answers[0].choice,'DOUBLE_CHECK');
 await Promise.all([repo.advanceStudy(session.id,'card'),repo.advanceStudy(session.id,'card')]);resumed=await repo.studySession('deck');assert.equal(resumed.index,1);
 await assert.rejects(()=>repo.advanceStudy(session.id,'second'),/Responda/);
 fail=true;await assert.rejects(()=>repo.answerStudy(session.id,'second','CHECK'),/quota/);fail=false;assert.equal((await repo.studySession('deck')).answers.length,1);
 await repo.answerStudy(session.id,'second','CHECK');resumed=await repo.advanceStudy(session.id,'second');assert.equal(resumed.completed,true);assert.equal(resumed.score,-5);assert.equal(resumed.answers.length,2);
 assert.equal((await repo.studySession('deck')).completed,true);assert.equal((await other.load()).sessions,undefined);assert.equal((await other.load()).cards.length,0);
 const restart=await repo.studySession('deck',true);assert.notEqual(restart.id,session.id);assert.equal(restart.score,0);assert.equal(restart.answers.length,0);assert.equal(restart.cards[0].isTrue,true);
 console.log('PASS study: atomic/idempotent answers and advance, negative scores, frozen snapshots, remount persistence, storage failure, legacy eligibility, isolated accounts and restart.');
})().catch(e=>{console.error(e);process.exitCode=1;});
