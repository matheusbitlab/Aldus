// Actual generated document functions; image events controlled. Physical WebView
// and Chromium evidence are separate from this deterministic regression.
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),ts=require('typescript'),vm=require('node:vm');
const load=require('./community-test-loader.cjs')();
let documentModule=load('src/presentation/components/EpubReaderDocument.ts');
if(process.argv.includes('--baseline')){
  const original=cp.execFileSync('git',['show','f851b3a:src/presentation/components/EpubReaderDocument.ts'],{encoding:'utf8'});
  const module={exports:{}};
  new Function('require','module','exports',ts.transpileModule(original,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name.startsWith('@/')?load(name.slice(2)):require(name),module,module.exports);
  documentModule=module.exports;
}
const html=documentModule.createEpubReaderDocument([{id:'synthetic',title:'Synthetic images',html:'<p>Text</p><img src="data:image/png;base64,fixture"/>'}],{fontSize:16,fontFamily:'System',marginSize:24,textColor:'#111111',backgroundColor:'#ffffff'});
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const parsed=ts.createSourceFile('reader.js',script,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declarations=[];
function visit(node){if(ts.isFunctionDeclaration(node))declarations.push(node);ts.forEachChild(node,visit);}visit(parsed);
const functions=['waitForImage','signalInitialLayoutReady'].map(name=>{const declaration=declarations.find(node=>node.name?.text===name);assert.ok(declaration,name+' belongs to generated document');return declaration.getText(parsed);}).join('\n');
class ImageFixture {
  constructor(loading,complete=false,event='load'){this._loading=loading;this.complete=complete;this.event=event;this.events=new Map();this.loads=0;}
  get loading(){return this._loading;}
  set loading(value){this._loading=value;if(value==='eager'&&!this.complete){assert.ok(this.events.has('load')&&this.events.has('error'),'Attach both events before triggering an immediately cached image');this.loads++;this.complete=true;this.emit(this.event);}}
  addEventListener(type,fn){this.events.set(type,fn);}
  emit(type){this.events.get(type)?.();}
}
(async()=>{
 const complete=new ImageFixture('lazy',true),offscreen=new ImageFixture('lazy'),broken=new ImageFixture('lazy',false,'error'),eager=new ImageFixture('eager');
 const reasons=[],context={Promise,console:{log(){}},performance,document:{images:[complete,offscreen,broken,eager],fonts:{ready:Promise.resolve()}},initialLayoutReadinessScheduled:false,initialLayoutReady:false,totalPages:1,currentPage:1,restorationPending:true,requestAnimationFrame:fn=>fn(),recalculateLayout:reason=>reasons.push(reason)};
 vm.runInNewContext(functions,context);
 context.signalInitialLayoutReady();context.signalInitialLayoutReady();
 eager.complete=true;eager.emit('load');
 await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(context.initialLayoutReady,true,'Offscreen lazy images must not deadlock layoutReady and initial restoration');
 assert.equal(offscreen.loads,1);assert.equal(broken.loads,1);assert.equal(complete.loads,0);
 assert.deepEqual(reasons,['initial-resources-ready']);
 broken.emit('error');offscreen.emit('load');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(reasons.length,1,'Late/duplicate image events do not repeat the readiness barrier');
 assert.match(html,/src="data:image\/png;base64,fixture"/,'Keep original image bytes/reference');
 console.log('PASS generated EPUB readiness: offscreen lazy images requested, load/error race, complete/eager images, idempotence and preserved image source. Controlled events; browser/Android separate.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
