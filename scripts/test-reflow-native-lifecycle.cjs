// Actual Native processor React lifecycle; WebView extraction and cache IO are controlled.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
const React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
const ocrBaseline=process.argv.includes('--ocr-temp-baseline'),nativeFiles={__esModule:true,cacheDirectory:'file:///controlled-cache/',writeAsStringAsync:async()=>{},deleteAsync:async()=>{}};
const cache=new Map();function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const source=ocrBaseline&&file.endsWith('PdfReflowProcessor.native.tsx')?cp.execFileSync('git',['show','e54bf50:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports',code)(name=>{if(name==='react')return React;if(name==='react/jsx-runtime')return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x}};if(name==='react-native-webview')return {WebView:'WebView'};if(name==='expo-file-system/legacy')return nativeFiles;if(name.endsWith('pdfOcr.native'))return {cancelPdfOcr:async()=>{},beginPdfOcr:async()=>{}};if(name.includes('reflowDiagnostics'))return {reflowDiagnostic(){}};if(name.startsWith('@/')||name.startsWith('.'))return load((name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name))+'.ts');return require(name)},exports);return exports;}
const defer=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:()=>resolve()}};
const message=payload=>({nativeEvent:{data:JSON.stringify({operationId:1,...payload})}});
(async()=>{
 const {PdfReflowProcessor}=load('src/presentation/components/PdfReflowProcessor.native.tsx');
 for(const mode of ocrBaseline?[]:['cancel-final','unmount-final','error-final','success']){
   let renderer,calls=0,cancelled=0,errors=0,signal;const gate=defer();
   await act(async()=>{renderer=create(React.createElement(PdfReflowProcessor,{uri:'data:application/pdf;base64,AAAA',onProgress(){},onCancel(){cancelled++},onError(){errors++},onComplete:async(document,runSignal)=>{calls++;signal=runSignal;assert.ok(document.characterCount>500);await gate.promise;if(mode==='error-final')throw Error('controlled cache failure')}}))});
   const web=renderer.root.findByType('WebView');
   await act(async()=>{await web.props.onMessage(message({type:'page',page:{pageNumber:1,pageWidth:500,pageHeight:700,textItems:[{text:'Readable prose for finalization. '.repeat(100),x:20,y:600,width:300,height:12}],images:[]} }));await web.props.onMessage(message({type:'complete',totalPages:1}))});
   for(let n=0;n<200&&!calls;n++)await act(async()=>new Promise(r=>setTimeout(r,1)));assert.equal(calls,1);
   assert.equal(signal.aborted,false,'Extraction complete must not finish the operation before cache IO');
   assert.equal(renderer.root.findAllByType('WebView').length,0,'Release extraction WebView/input while finalizing');
   if(mode==='cancel-final'){await act(async()=>renderer.root.findByType('Pressable').props.onPress());assert.equal(cancelled,1);assert.equal(signal.aborted,true)}
   if(mode==='unmount-final'){await act(async()=>renderer.unmount());assert.equal(signal.aborted,true)}
   await act(async()=>{gate.resolve();await new Promise(r=>setTimeout(r,5))});
   assert.equal(calls,1);assert.equal(errors,mode==='error-final'?1:0);assert.equal(cancelled,mode==='cancel-final'?1:0);
   if(mode!=='unmount-final')await act(async()=>renderer.unmount());
 }
 // Native cache write can finish AFTER unmount; its operation must still own cleanup.
 const gate=defer(),removed=[];let entered=false,target,renderer;
 Object.assign(nativeFiles,{cacheDirectory:'file:///controlled-cache/',writeAsStringAsync:async uri=>{target=uri;entered=true;await gate.promise},deleteAsync:async uri=>removed.push(uri)});
 const originalFetch=global.fetch;global.fetch=async()=>new Response('fixture');global.FileReader=class{readAsDataURL(){this.result='data:application/pdf;base64,AAAA';queueMicrotask(()=>this.onload())}abort(){}};
 await act(async()=>{renderer=create(React.createElement(PdfReflowProcessor,{uri:'https://fixture.invalid/book.pdf',onProgress(){},onCancel(){},onError(){},onComplete(){throw Error('Cancelled OCR cannot complete')}}))});
 const web=renderer.root.findByType('WebView');await act(async()=>{await web.props.onMessage(message({type:'page',page:{pageNumber:1,pageWidth:500,pageHeight:700,textItems:[],images:[{src:'fixture',x:0,y:0,width:500,height:700}]}}));await web.props.onMessage(message({type:'complete',totalPages:1}))});
 await act(async()=>renderer.root.findAllByType('Pressable').find(p=>p.findAllByType('Text').some(t=>t.props.children==='Reconhecer texto')).props.onPress());
 for(let n=0;n<100&&!entered;n++)await act(async()=>new Promise(r=>setTimeout(r,1)));assert.equal(entered,true);
 await act(async()=>renderer.unmount());await act(async()=>{gate.resolve();await new Promise(r=>setTimeout(r,5))});assert.ok(removed.includes(target),'Late OCR temp write after unmount must delete its own file');
 global.fetch=originalFetch;delete global.FileReader;
 console.log('PASS actual Native processor: commit lease, cancel in final 1%, unmount, cache failure, single terminal, extraction release and late OCR temp cleanup. Controlled bridge/IO, not device validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
