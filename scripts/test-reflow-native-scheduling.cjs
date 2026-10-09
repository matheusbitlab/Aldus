// Match installed RN's immediateShim: setImmediate queues a microtask.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports',code)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(require('path').posix.join(require('path').posix.dirname(file),name)+'.ts'):require(name),exports);return exports;}
const task=setImmediate,clearTask=clearImmediate;const idle=new Set();
global.setImmediate=callback=>queueMicrotask(callback);
global.requestIdleCallback=process.argv.includes('--baseline')?undefined:callback=>{let id=task(()=>{idle.delete(id);callback({didTimeout:false,timeRemaining:()=>10});});idle.add(id);return id;};
global.cancelIdleCallback=id=>{idle.delete(id);clearTask(id);};
(async()=>{
 const build=load('src/data/local/PdfReflowDocumentBuilder.ts').buildPdfReflowDocumentAsync;
 const pages=Array.from({length:40},(_,i)=>({pageNumber:i+1,pageWidth:500,pageHeight:700,textItems:[{text:'A readable paragraph about native scheduling. '.repeat(10),x:20,y:600,width:300,height:12}],images:[]}));
 const controller=new AbortController();const result=build(pages,40,controller.signal);task(()=>controller.abort());
 if(process.argv.includes('--baseline')){await result;assert.equal(controller.signal.aborted,false);await new Promise(task);console.log('REPRODUCED RN microtask immediate: entire build completes before queued Native input can cancel');return;}
 await assert.rejects(result,/cancelado/);assert.equal(controller.signal.aborted,true);assert.equal(idle.size,0,'Abort must remove pending Native idle work');
 const valid=await build(pages,40,new AbortController().signal);assert.equal(valid.pageCount,40);assert.equal(idle.size,0);
 console.log('PASS Native task can cancel between pages; idle continuation released on abort; complete build still validates');
})().catch(e=>{console.error(e);process.exitCode=1;});
