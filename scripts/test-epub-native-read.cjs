// Actual Native importer; only filesystem, parser and account boundaries are controlled.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ts = require('typescript'), cp = require('node:child_process');
const baseline = process.argv.includes('--baseline'), cache = new Map();
let reads = 0, legacyReads = 0, parses = 0, atobCharacters = 0, pending, fail = false;
const bytes = new Uint8Array(8 * 1024 * 1024); bytes.set([80, 75, 3, 4]);
const nativeFiles = { File: class {
  constructor(uri) { assert.equal(uri, 'file:///app/fixture%20book.epub'); }
  async bytes() { reads++; if (fail) throw Error('native read failed'); return pending ? pending.promise : bytes; }
}};
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const source = baseline && file.endsWith('EpubFileImporter.ts') ? cp.execFileSync('git', ['show', '3df3f5b:'+file], {encoding:'utf8'}) : fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','exports',code)(name => {
    if(name==='react-native') return {Platform:{OS:'android'}};
    if(name==='expo-file-system') return nativeFiles;
    if(name==='expo-file-system/legacy') return {getInfoAsync:async()=>({exists:true,size:bytes.length}),readAsStringAsync:async()=>{legacyReads++;return Buffer.from(pending ? await pending.promise : bytes).toString('base64')}};
    if(name.includes('epubOpenMetrics')) return new Proxy({}, {get:()=>()=>0});
    if(name.includes('LibraryAccountScope')) return {libraryAccountScope:{capture:()=>({check(){}})}};
    if(name.startsWith('@/')) return load(name.slice(2)+'.ts');
    return require(name);
  }, exports); return exports;
}
const defer=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)}};
(async()=>{
  const originalAtob=global.atob;global.atob=value=>{atobCharacters+=value.length;return originalAtob(value)};
  const {EpubFileImporter}=load('src/data/epub/EpubFileImporter.ts');
  const importer=new EpubFileImporter({execute:async input=>{parses++;assert.deepEqual(input.bytes,bytes);return {id:'fixture'}},validateBytes:async()=>{parses++}});
  const run=signal=>importer.importFromUri('file:///app/fixture book.epub','fixture.epub',undefined,'fixture',{signal});
  const started=performance.now();await run();
  console.log(JSON.stringify({fixtureBytes:bytes.length,nativeByteReads:reads,base64Reads:legacyReads,atobCharacters,elapsedMs:Math.round(performance.now()-started)}));
  assert.equal(legacyReads,0,'Native import must not materialize Base64 and a binary JS string');
  assert.equal(atobCharacters,0);assert.equal(reads,1);assert.equal(parses,1);
  const aborted=new AbortController();aborted.abort();await assert.rejects(run(aborted.signal),{name:'AbortError'});assert.equal(reads,1);
  pending=defer();const mid=new AbortController();const work=run(mid.signal);await new Promise(setImmediate);mid.abort();await assert.rejects(work,{name:'AbortError'});
  pending.resolve(bytes);await new Promise(setImmediate);pending=null;assert.equal(parses,1,'Late non-interruptible Native read must never start parsing');
  fail=true;await assert.rejects(run(),/native read failed/);fail=false;await run();assert.equal(parses,2);
  global.atob=originalAtob;
  console.log('PASS Native byte read, no Base64/atob copy, immediate/mid cancellation, late result, IO failure and retry. Controlled filesystem, not Android proof.');
})().catch(error=>{console.error(error);process.exitCode=1});
