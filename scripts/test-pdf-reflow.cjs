const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vm = require('node:vm');
const cache=new Map();
function load(file) {
  if(cache.has(file))return cache.get(file);
  const exports={};cache.set(file,exports);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','exports',source)(name=>{
    if(name==='react-native')return {StyleSheet:{create:x=>x,absoluteFill:{}}};
    if(name==='expo-modules-core')return {requireNativeModule:()=>({beginOperation:async()=>{},cancelOperation:async()=>{},recognizePage:async()=>({lines:[]})})};
    if(['react-native-webview','expo-file-system/legacy'].includes(name))return {};
    const base=name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name);
    const target=['.ts','.tsx',''].map(ext=>base+ext).find(p=>fs.existsSync(p));return target?load(target):require(name);
  },exports);return exports;
}
(async()=>{
  const quality=load('src/data/local/pdfReflowQuality.ts');
  const builder=load('src/data/local/PdfReflowDocumentBuilder.ts');
  const ocr=load('src/data/local/pdfOcrPolicy.ts');
  const clean={pageNumber:1,pageWidth:500,pageHeight:700,textItems:[{text:'Texto legível completo. '.repeat(50),x:20,y:650,width:200,height:12}],images:[]};
  const bad={...clean,textItems:[{...clean.textItems[0],text:'\u0001\u0002'.repeat(200)+'A'}]};
  assert.throws(()=>builder.buildPdfReflowDocument([bad],1),/corrompida/);
  assert.throws(()=>builder.buildPdfReflowDocument([clean],2),/não foi concluída/);
  const doc=builder.buildPdfReflowDocument([clean],1);
  assert.equal(quality.isValidatedReflowDocument(doc),true);
  assert.equal(quality.isValidatedReflowDocument({...doc,extractionQuality:undefined}),false);
  assert.equal(quality.isValidatedReflowDocument({...doc,chapters:[{blocks:[{text:bad.textItems[0].text}]}]}),false);
  assert.equal(quality.isClearlyCorruptedTextExtraction(quality.assessTextExtractionQuality([{text:'1234\uE000'.repeat(100)}])),false);
  const controller=new AbortController();
  const pages=Array.from({length:100},(_,i)=>({...clean,pageNumber:i+1}));
  const pending=builder.buildPdfReflowDocumentAsync(pages,100,controller.signal);
  setImmediate(()=>controller.abort());await assert.rejects(pending,/cancelado/);
  assert.deepEqual(await builder.buildPdfReflowDocumentAsync([clean],1,new AbortController().signal),doc);
  assert.equal(doc.derivation.source,'text-extraction');
  const scan={...clean,pageNumber:2,textItems:[],images:[{src:'data:image/jpeg;base64,x',x:0,y:0,width:500,height:700}]};
  assert.deepEqual(ocr.createPdfOcrPlan([clean]).pageNumbers,[]);
  assert.deepEqual(ocr.createPdfOcrPlan([clean,scan]).pageNumbers,[2]);
  assert.equal(ocr.createPdfOcrPlan([clean,scan]).state,'OCR_REQUIRED');
  const corrupt={...clean,pageNumber:3,textItems:bad.textItems,images:[]};
  assert.deepEqual(ocr.createPdfOcrPlan([clean,corrupt]).pageNumbers,[3]);
  assert.deepEqual(ocr.createPdfOcrPlan([{...scan,images:[]}]).pageNumbers,[2]);
  assert.equal(ocr.isSufficientOcrText([{text:'AÃ§Ã£o e coraÃ§Ã£o em portuguÃªs.'}]),true);
  assert.equal(ocr.isSufficientOcrText([{text:'??'}]),false);
  assert.equal(ocr.isSufficientOcrText([{text:'texto\uFFFD\uFFFD\uFFFD legÃ­vel'}]),false);
  const hybridDerivation=ocr.createReflowDerivation(2,[2]);
  assert.equal(hybridDerivation.source,'hybrid');
  const hybrid=builder.buildPdfReflowDocument([clean,{...clean,pageNumber:2}],2,hybridDerivation);
  assert.equal(quality.isValidatedReflowDocument(hybrid),true);
  assert.equal(quality.isValidatedReflowDocument({...hybrid,derivation:{...hybrid.derivation,ocrEngineVersion:undefined}}),false);
  const {createReflowOperation}=load('src/presentation/components/reflowOperation.ts');const op=createReflowOperation();
  assert.equal(op.finish(),true);assert.equal(op.finish(),false);assert.equal(op.active,false);assert.equal(op.signal.aborted,true);
  const {reflowProgressLabel}=load('src/presentation/components/PdfReflowProcessorProps.ts');
  assert.match(reflowProgressLabel({currentPage:968,totalPages:969}),/99%/);
  assert.doesNotMatch(reflowProgressLabel({currentPage:969,totalPages:969}),/100%/);
  assert.match(reflowProgressLabel({stage:'ocr',currentPage:2,totalPages:2}),/100%/);
  // Run actual Native bridge HTML in a controlled JS engine, including cancellation
  // between getPage and text, errors outside the Promise chain, cleanup and IDs.
  const {getProcessorHtml}=load('src/presentation/components/PdfReflowProcessor.native.tsx');
  const script=getProcessorHtml().match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  let releasePage,reachedPage,destroyed=0,cleaned=0, messages=[],listeners={};
  const gate=new Promise(r=>releasePage=r);
  const pageRequested=new Promise(r=>reachedPage=r);
  const page={getTextContent:async()=>({items:[]}),getOperatorList:async()=>({fnArray:[],argsArray:[]}),getViewport:()=>({width:500,height:700}),cleanup:()=>cleaned++};
  const context={window:{ReactNativeWebView:{postMessage:x=>messages.push(JSON.parse(x))},atob:()=>'',addEventListener:(key,fn)=>listeners[key]=fn},pdfjsLib:{GlobalWorkerOptions:{},OPS:{},getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:()=>{reachedPage();return gate;}}),destroy:async()=>{destroyed++;}})},Uint8Array,Promise,JSON,Error};
  vm.runInNewContext(script,context);
  const extraction=context.window.processPdf('',7);await pageRequested;const beforeCancel=messages.length;context.window.cancelPdf();releasePage(page);await extraction;
  assert.equal(messages.length,beforeCancel);assert.ok(destroyed>0);assert.equal(cleaned,1);
  await context.window.processPdf('',8);assert.equal(messages.at(-1).type,'complete');assert.equal(messages.at(-1).operationId,8);
  listeners.error({error:new ReferenceError('bytecode is not defined')});assert.equal(messages.at(-1).type,'error');assert.equal(messages.at(-1).engine,'WebView/PDF.js 3.11.174');
  const nativeSource=fs.readFileSync('src/presentation/components/PdfReflowProcessor.native.tsx','utf8');
  const webSource=fs.readFileSync('src/presentation/components/PdfReflowProcessor.web.tsx','utf8');
  const kotlinSource=fs.readFileSync('modules/aldus-pdf-ocr/android/src/main/java/expo/modules/alduspdfocr/AldusPdfOcrModule.kt','utf8');
  const gradleSource=fs.readFileSync('modules/aldus-pdf-ocr/android/build.gradle','utf8');
  const readerSource=fs.readFileSync('src/presentation/screens/ReaderScreen.tsx','utf8');
  assert.match(nativeSource,/Reconhecer texto/);assert.match(nativeSource,/Continuar no PDF Original/);assert.match(nativeSource,/cancelPdfOcr/);
  assert.match(webSource,/OCR local .* aplicativo Android/);
  assert.match(kotlinSource,/PdfRenderer/);assert.match(kotlinSource,/cancelledOperations/);assert.match(gradleSource,/com\.google\.mlkit:text-recognition:16\.0\.1/);
  assert.match(readerSource,/reflowFeedbackText:[\s\S]*?flex: 1[\s\S]*?minWidth: 0/);assert.match(readerSource,/reflowFeedbackClose:[\s\S]*?flexShrink: 0/);
  console.log('PASS quality, OCR page policy/validation/provenance, legacy cache rejection, async cancel, progress, consent, Web fallback, Native bridge/module and narrow feedback layout');
  if(process.argv.includes('--pdfs')){
    const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
    for(const [file,expected] of [['sociedade do espetaculo.pdf','ocr-required'],['manifestocomunista.pdf','ocr-required'],['sobre-o-ocio.pdf','reflow'],['o-banquete.pdf','reflow'],['a-republica.pdf','reflow']]){
      const task=pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(path.join('assets','Livros',file))),useSystemFonts:true});
      const pdf=await task.promise, extracted=[];
      try{for(let n=1;n<=pdf.numPages;n++){
        const p=await pdf.getPage(n);try{const text=await p.getTextContent(),vp=p.getViewport({scale:1});
        extracted.push({pageNumber:n,pageWidth:vp.width,pageHeight:vp.height,textItems:text.items.filter(i=>typeof i.str==='string'&&i.transform).map(i=>({text:i.str,x:i.transform[4],y:i.transform[5],width:i.width,height:i.height,fontName:i.fontName,hasEOL:i.hasEOL})),images:[]});}finally{p.cleanup();}
      }
      const q=quality.assessTextExtractionQuality(extracted.flatMap(p=>p.textItems));
      const actual=quality.isClearlyCorruptedTextExtraction(q)?'ocr-required':'reflow';assert.equal(actual,expected,file);
      if(actual==='ocr-required'){const plan=ocr.createPdfOcrPlan(extracted);assert.equal(plan.state,'OCR_REQUIRED');assert.ok(plan.pageNumbers.length>0);}
      else {const result=await builder.buildPdfReflowDocumentAsync(extracted,pdf.numPages,new AbortController().signal);assert.equal(quality.isValidatedReflowDocument(result),true);assert.notEqual(result.classification,'image-based');}
      console.log('PASS real PDF',file,JSON.stringify({pages:pdf.numPages,...q,result:actual}));
      }finally{await task.destroy();}
    }
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
