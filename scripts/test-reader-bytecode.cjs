// Hermes serializes functions as "function name(a0) { [bytecode] }".
// Exercise the actual document generator with that representation, then verify
// that its embedded boundaries retain font and safe-anchor semantics.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),ts=require('typescript'),vm=require('node:vm');
const cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const original=process.argv.includes('--baseline')&&/\/(EpubReaderDocument|ReaderAnchorDocument)\.ts$/.test(file)?cp.execFileSync('git',['show','77c490c:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');const code=ts.transpileModule(original,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports',code)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),exports);return exports;}
const domain=load('src/domain/types/readingAnchor.ts'),doc=load('src/presentation/components/EpubReaderDocument.ts');
for(const fn of [domain.parseReadingAnchor,domain.resolveTextAnchor,doc.readerCssFontFamily])fn.toString=()=>`function ${fn.name}(a0,a1) { [bytecode] }`;
const html=doc.createEpubReaderDocument([{id:'c',title:'Chapter',html:'<p>Text</p>',characterCount:4}],{fontSize:16,fontFamily:'System',marginSize:24,textColor:'#111111',backgroundColor:'#ffffff'});
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const names=['readerCssFontFamily','parseStudyAnchor','resolveStudyAnchor'];const embedded={};
for(const name of names){const prefix=new RegExp('(?:var '+name+' = |function '+name+'\\()');const start=script.search(prefix);assert.ok(start>=0,name+' embedded');const node=ts.createSourceFile('document.js',script.slice(start),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).statements[0];const statement=script.slice(start,start+node.end);const context={};vm.runInNewContext(statement,context);embedded[name]=context[name];}
if(process.argv.includes('--baseline')){assert.throws(()=>embedded.readerCssFontFamily('System'),/bytecode is not defined/);assert.throws(()=>embedded.parseStudyAnchor({}),/bytecode is not defined/);console.log('REPRODUCED actual document generator: Hermes function serialization breaks typography and anchor boundaries');process.exit(0);}
assert.doesNotMatch(script,/\[bytecode\]/);
for(const font of ['System','Verdana','Georgia','serif','sans-serif','', 'A";<bad>'])assert.equal(embedded.readerCssFontFamily(font),doc.readerCssFontFamily(font));
const a={version:1,kind:'epub-text',chapterId:'c',start:0,end:5,quote:'hello',prefix:'',suffix:'',path:[0]};
for(const value of [a,{version:1,kind:'pdf-page',sourcePage:2},null,{}, {...a,end:4},{...a,path:[-1]},{...a,prefix:'x'.repeat(129)}]){let expected;try{expected=domain.parseReadingAnchor(value);}catch(e){assert.throws(()=>embedded.parseStudyAnchor(value),{message:e.message});continue;}assert.deepEqual(JSON.parse(JSON.stringify(embedded.parseStudyAnchor(value))),expected);}
for(const text of ['hello world','moved hello world','hello hello','missing'])assert.deepEqual(JSON.parse(JSON.stringify(embedded.resolveStudyAnchor(text,a))),domain.resolveTextAnchor(text,a));
console.log('PASS document independent of Function.toString/Hermes bytecode; embedded typography and exact/relocated/ambiguous/missing anchors preserve behavior');
