// Actual ReaderScreen orchestration; storage, viewers and native hardware boundaries controlled.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
const React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
const baseline=process.argv.includes('--baseline'),finalizationBaseline=process.argv.includes('--finalization-baseline'),cache=new Map(),timers=new Map(),listeners=new Set(),writes=[],back=new Set();let timerId=0,fixture='reflow',hideReadingCounts=false;
let reader={progress:0,controlsVisible:false,setProgress:v=>setReader({progress:v}),setControlsVisible:v=>setReader({controlsVisible:v}),toggleControls:()=>setReader({controlsVisible:!reader.controlsVisible})};
function setReader(next){reader={...reader,...next};listeners.forEach(fn=>fn());}
const readerStore=()=>React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>reader);readerStore.getState=()=>reader;
const noop=()=>{},widget=name=>props=>React.createElement(name,props,props.children);
const palette={background:'#fff',panel:'#eee',text:'#222',secondaryText:'#777',accent:'#a54'};
const dependencies={highlightRepository:{listByBookId:async()=>[]},openBook:{execute:async id=>({book:{id,title:'Fixture',mimeType:fixture==='epub'?'application/epub+zip':'application/pdf',filePath:'file:///fixture',fileName:'fixture.pdf',fileSize:123,fileHash:'fixture-signature'},chapters:fixture==='epub'?[{id:'epub',title:'Chapter',html:'<p>Text</p>',characterCount:4}]:[],progress:{percentage:.5}})},pdfReaderSettings:{get:async()=>({...load('src/domain/types/pdfReader.ts').defaultPdfReaderSettings,mode:fixture==='original'?'original':'reflow',reflowProgress:.5,originalProgress:.2}),save:async()=>{}},pdfReflowCache:{findByBookId:async()=>null,save:async()=>{}},updateReadingProgress:{execute:async x=>writes.push(x)}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const input=(baseline||finalizationBaseline)&&file.endsWith('ReaderScreen.tsx')?cp.execFileSync('git',['show',(finalizationBaseline?'3df3f5b':'77c490c')+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');const code=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
new Function('require','exports','setTimeout','clearTimeout',code)(name=>{
if(name==='react')return React;if(name==='react/jsx-runtime')return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',ActivityIndicator:'Spinner',StatusBar:'StatusBar',Platform:{OS:'android'},StyleSheet:{create:x=>x,absoluteFill:{position:'absolute',top:0,bottom:0,left:0,right:0}},AppState:{currentState:'active',addEventListener:()=>({remove:noop})},BackHandler:{addEventListener:(_,fn)=>{back.add(fn);return {remove:()=>back.delete(fn)}}},useWindowDimensions:()=>({width:420,height:780})};if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:32,bottom:24,left:5,right:7})};if(name==='expo-router')return {router:{push:noop}};if(name==='expo-brightness')return {isAvailableAsync:async()=>false};if(name.includes('/services/dependencies'))return {appDependencies:dependencies};if(name.includes('/stores/readerStore'))return {useReaderStore:readerStore};if(name.includes('/contexts/ReaderSettingsContext'))return {useReaderSettings:()=>({hideReadingCounts,fontSize:16,fontFamily:'Georgia',marginSize:24,theme:'light',brightness:100,useSystemBrightness:true,palette})};if(name.includes('epubOpenMetrics'))return {epubDiagnosticConsole:{log:noop},markEpubOpenEvent:noop,markEpubOpenSpanStart:noop,markEpubOpenSpanEnd:noop};
for(const component of ['MotionCuesOverlay','StudyBookmarksPanel','ReaderControls','ReaderSettingsPanel','DocumentReaderAdapter','PdfModeChooser','PdfReflowProcessor'])if(name.endsWith('/'+component))return {[component]:widget(component)};
if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name);return load(['.ts','.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(p)));}return require(name);},exports,file.endsWith('cooperativeWork.ts')?global.setTimeout:fn=>{timers.set(++timerId,fn);return timerId},file.endsWith('cooperativeWork.ts')?global.clearTimeout:id=>timers.delete(id));return exports;}
const flushTimers=async()=>act(async()=>{const due=[...timers.values()];timers.clear();due.forEach(fn=>fn());});
(async()=>{
 const {ReaderScreen}=load('src/presentation/screens/ReaderScreen.tsx');let renderer;
 const builder=load('src/data/local/PdfReflowDocumentBuilder.ts');const valid=builder.buildPdfReflowDocument([{pageNumber:1,pageWidth:500,pageHeight:700,textItems:[{text:'A readable paragraph. '.repeat(100),x:20,y:600,width:300,height:12}],images:[]}],1);
 await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'reflow'}));});
 if(baseline){const doc=renderer.root.findByType('DocumentReaderAdapter');assert.equal(doc.props.pdfReflowChapters.length,0);await act(async()=>doc.props.onEpubPageInfo({pageNumber:1,totalPages:1,chapterIndex:0,layoutReady:true}));await flushTimers();assert.equal(writes.at(-1).percentage,0);console.log('REPRODUCED empty Reflow before publication clears saved .5 progress to 0');await act(async()=>renderer.root.findByType('PdfReflowProcessor').props.onCancel());const original=renderer.root.findByType('DocumentReaderAdapter');await act(async()=>original.props.onPdfTotalPages(101));assert.equal(renderer.root.findByType('DocumentReaderAdapter').props.pdfPage,51);console.log('REPRODUCED cancel restores Reflow .5 instead of Original .2');await act(async()=>renderer.unmount());return;}
 assert.equal(renderer.root.findAllByType('DocumentReaderAdapter').length,0,'Must not instantiate an empty candidate document during preparation');assert.equal(reader.progress,.5);
 await act(async()=>renderer.root.findByType('PdfReflowProcessor').props.onComplete(valid));
 const getDoc=()=>renderer.root.findByType('DocumentReaderAdapter');let doc=getDoc();assert.equal(doc.props.initialRestorePending,true);
 const report=async(page,total,ready)=>act(async()=>getDoc().props.onEpubPageInfo({pageNumber:page,totalPages:total,chapterIndex:0,layoutReady:ready}));
 await report(1,3,false);assert.equal(reader.progress,.5);assert.equal(writes.length,0);
 await report(1,101,true);assert.equal(getDoc().props.epubPage,51);assert.equal(getDoc().props.restoreTargetReady,true);assert.equal(writes.length,0);
 await report(51,101,true);await flushTimers();assert.equal(getDoc().props.initialRestorePending,false);assert.equal(writes.at(-1).pageNumber,51);assert.equal(writes.at(-1).percentage,.5);
 const instance=getDoc();for(let i=0;i<10;i++)await act(async()=>reader.toggleControls());assert.strictEqual(getDoc(),instance);assert.equal(getDoc().props.epubPage,51);
 await act(async()=>renderer.root.findByType('ReaderControls').props.onSettings());assert.strictEqual(getDoc(),instance);assert.equal(getDoc().props.epubPage,51);
 hideReadingCounts=true;await act(async()=>setReader({controlsVisible:true}));assert.equal(renderer.root.findByType('ReaderControls').props.hideReadingCounts,true);assert.strictEqual(getDoc(),instance);assert.equal(getDoc().props.epubPage,51);
 const writesBeforeFocus=writes.length;await act(async()=>renderer.root.findByType('ReaderSettingsPanel').props.onReadInFocus());assert.equal(reader.controlsVisible,false);assert.equal(renderer.root.findByType('ReaderSettingsPanel').props.visible,false);assert.strictEqual(getDoc(),instance);assert.equal(getDoc().props.epubPage,51);assert.equal(writes.length,writesBeforeFocus);
 await act(async()=>setReader({controlsVisible:true}));assert.equal(getDoc().props.epubPage,51);
 const preferences=renderer.root.findByType('ReaderSettingsPanel');await act(async()=>preferences.props.onPdfSettingsChange({...preferences.props.pdfSettings,fontSize:22,lineHeight:1.8}));assert.strictEqual(getDoc(),instance);assert.equal(getDoc().props.epubPage,51);
 await report(1,101,true);await flushTimers();assert.equal(writes.at(-1).pageNumber,1);assert.equal(writes.at(-1).percentage,0,'An acknowledged real navigation to page 1 must be accepted');
 await act(async()=>renderer.unmount());assert.equal(back.size,0);
 // Back during preparation returns to the preserved Original mode progress.
 writes.length=0;await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'cancel'}));});assert.equal(back.size,1);
 await act(async()=>{assert.equal([...back][0](),true)});assert.equal(getDoc().props.pdfReadingMode,'original');
 await act(async()=>getDoc().props.onPdfTotalPages(101));assert.equal(getDoc().props.pdfPage,21);assert.equal(reader.progress,.2);await act(async()=>renderer.unmount());
 for(const terminal of ['onCancel','onError','onComplete']) {
   await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'terminal-'+terminal}));});
   const processor=renderer.root.findByType('PdfReflowProcessor');
   await act(async()=>processor.props[terminal](terminal==='onComplete'?{...valid,extractionQuality:undefined}:'Invalid extracted text'));
   assert.equal(getDoc().props.pdfReadingMode,'original');await act(async()=>getDoc().props.onPdfTotalPages(101));assert.equal(getDoc().props.pdfPage,21);assert.equal(reader.progress,.2);await act(async()=>renderer.unmount());
 }
 // A pending position write must neither revert mode nor be lost on closing.
 await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'mode-race'}));});
 await act(async()=>renderer.root.findByType('PdfReflowProcessor').props.onComplete(valid));await report(1,101,true);await report(51,101,true);
 await act(async()=>renderer.root.findByType('ReaderSettingsPanel').props.onPdfModeChange('original'));await flushTimers();assert.equal(getDoc().props.pdfReadingMode,'original');await act(async()=>renderer.unmount());
 writes.length=0;await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'close'}));});
 await act(async()=>renderer.root.findByType('PdfReflowProcessor').props.onComplete(valid));await report(1,101,true);await report(51,101,true);await act(async()=>renderer.unmount());await flushTimers();assert.equal(writes.at(-1)?.pageNumber,51,'Last acknowledged position must survive immediate close');
 // Cache completion is part of preparation, not an unobserved background write.
 let releaseSave,saveStarted=false,publication,notifySaveStarted;
 const observeSaveStart=()=>new Promise(resolve=>{notifySaveStarted=resolve});
 let saveStartedSignal=observeSaveStart();
 dependencies.pdfReflowCache.save=async()=>{saveStarted=true;await new Promise(resolve=>{releaseSave=resolve;notifySaveStarted()})};
 // The cooperative pipeline crosses real host timers. A fixed number of
 // setImmediate turns can finish before those timers run on a fast CI host.
 const waitForSaveStart=()=>act(async()=>{
   await Promise.race([saveStartedSignal,publication.then(()=>{throw new Error('Publication ended before requesting the cache write')})]);
 });
 await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'cache-cancel'}));});
 await act(async()=>{publication=renderer.root.findByType('PdfReflowProcessor').props.onComplete(valid)});
 await waitForSaveStart();assert.equal(saveStarted,true);
 assert.equal(renderer.root.findAllByType('DocumentReaderAdapter').length,0,'Do not publish Reflow before cache commit');
 assert.equal(renderer.root.findAllByType('PdfReflowProcessor').length,1,'Final cache write must remain cancellable/Back-handled');
 await act(async()=>{[...back][0]()});assert.equal(getDoc().props.pdfReadingMode,'original');
 await act(async()=>{releaseSave();await publication});assert.equal(getDoc().props.pdfReadingMode,'original','Late cache write cannot restore cancelled Reflow');await act(async()=>renderer.unmount());
 saveStarted=false;saveStartedSignal=observeSaveStart();
 await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'cache-commit'}));});
 await act(async()=>{publication=renderer.root.findByType('PdfReflowProcessor').props.onComplete(valid)});
 await waitForSaveStart();assert.equal(saveStarted,true);
 await act(async()=>{releaseSave();await publication});assert.equal(getDoc().props.pdfReadingMode,'reflow');assert.ok(getDoc().props.pdfReflowChapters[0].html.includes('readable'));
 await act(async()=>renderer.unmount());
 dependencies.pdfReflowCache.save=async()=>{};
 fixture='epub';writes.length=0;await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'epub'}));});
 await report(1,3,false);assert.equal(getDoc().props.epubPage,1);assert.equal(reader.progress,.5);
 await report(1,101,true);assert.equal(getDoc().props.epubPage,51);await report(51,101,true);await flushTimers();assert.equal(writes.at(-1).pageNumber,51);
 const surface=getDoc().parent.parent.props.style;assert.deepEqual(surface[1],{top:32,bottom:24,left:5,right:7});
 await act(async()=>renderer.unmount());
 // A persisted textual anchor owns restoration until its dedicated ACK, not page-1/layout messages.
 const anchor={version:1,kind:'epub-text',chapterId:'epub',start:0,end:4,quote:'Text',prefix:'',suffix:'',path:[0]};
 const location=load('src/domain/types/readerLocation.ts').encodeReaderLocation('epub',anchor);
 const oldOpen=dependencies.openBook.execute;dependencies.openBook.execute=async id=>{const item=await oldOpen(id);return {...item,progress:{...item.progress,cfiPosition:location}}};
 writes.length=0;await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'anchor-cold'}));});
 await report(1,101,true);assert.deepEqual(getDoc().props.restoreTextAnchor,anchor);assert.equal(writes.length,0);assert.equal(getDoc().props.restoreTargetReady,true);
 await act(async()=>getDoc().props.onEpubPageInfo({pageNumber:1,totalPages:101,chapterIndex:0,layoutReady:true,origin:'LAYOUT_RECALC',operationId:0}));assert.equal(writes.length,0);
 const restored={pageNumber:37,totalPages:101,chapterIndex:0,layoutReady:true,origin:'RESTORE',operationId:0,readingAnchor:anchor,anchorRestoreStatus:'exact'};
 await act(async()=>getDoc().props.onEpubPageInfo(restored));assert.equal(getDoc().props.epubPage,37);assert.equal(getDoc().props.initialRestorePending,false);assert.equal(writes.at(-1).cfiPosition,location);
 const committed=writes.length;for(let i=0;i<4;i++)await act(async()=>getDoc().props.onEpubPageInfo({...restored,origin:'LAYOUT_RECALC'}));assert.equal(writes.length,committed);
 await act(async()=>renderer.unmount());
 writes.length=0;await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:'anchor-missing'}));});await report(1,101,true);
 await act(async()=>getDoc().props.onEpubPageInfo({...restored,readingAnchor:null,anchorRestoreStatus:'missing',pageNumber:51}));assert.equal(writes.length,0);assert.match(renderer.root.findByType('StudyBookmarksPanel').props.feedback,/trecho salvo/);
 await act(async()=>getDoc().props.onEpubPageInfo({...restored,pageNumber:52,operationId:1,origin:'TAP_NEXT',anchorRestoreStatus:null}));assert.equal(writes.at(-1).pageNumber,52);
 await act(async()=>renderer.unmount());dependencies.openBook.execute=oldOpen;
 console.log('PASS ReaderScreen Reflow publication/restore/persistence, EPUB layout acknowledgement, controls/settings identity, real page-1 navigation, hardware Back + preserved Original progress, Native safe owner');
})().catch(e=>{console.error(e);process.exitCode=1;});
