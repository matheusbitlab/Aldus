// Actual ReaderScreen orchestration; storage, viewers and native hardware boundaries controlled.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
const React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
const baseline=false,cache=new Map(),timers=new Map(),listeners=new Set(),writes=[],back=new Set();let timerId=0,fixture='reflow';
let reader={progress:0,controlsVisible:false,setProgress:v=>setReader({progress:v}),setControlsVisible:v=>setReader({controlsVisible:v}),toggleControls:()=>setReader({controlsVisible:!reader.controlsVisible})};
function setReader(next){reader={...reader,...next};listeners.forEach(fn=>fn());}
const readerStore=()=>React.useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>reader);readerStore.getState=()=>reader;
const noop=()=>{},widget=name=>props=>React.createElement(name,props,props.children);
const palette={background:'#fff',panel:'#eee',text:'#222',secondaryText:'#777',accent:'#a54'};
const dependencies={highlightRepository:{listByBookId:async()=>[]},openBook:{execute:async id=>({book:{id,title:'Fixture',mimeType:fixture==='epub'?'application/epub+zip':'application/pdf',filePath:'file:///fixture',fileName:'fixture.pdf',fileSize:123,fileHash:'fixture-signature'},chapters:fixture==='epub'?[{id:'epub',title:'Chapter',html:'<p>Text</p>',characterCount:4}]:[],progress:{percentage:.5}})},pdfReaderSettings:{get:async()=>({...load('src/domain/types/pdfReader.ts').defaultPdfReaderSettings,mode:fixture==='original'?'original':'reflow',reflowProgress:.5,originalProgress:.2}),save:async()=>{}},pdfReflowCache:{findByBookId:async()=>null,save:async()=>{}},updateReadingProgress:{execute:async x=>writes.push(x)}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const input=baseline&&file.endsWith('ReaderScreen.tsx')?cp.execFileSync('git',['show','77c490c:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');const code=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
new Function('require','exports','setTimeout','clearTimeout',code)(name=>{
if(name==='@react-native-community/slider')return {__esModule:true,default:'Slider'};if(name==='@expo/vector-icons')return {Ionicons:widget('Icon')};if(name==='react')return React;if(name==='react/jsx-runtime')return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');if(name==='react-native')return {View:'View',Text:'Text',Pressable:'Pressable',ActivityIndicator:'Spinner',StatusBar:'StatusBar',Platform:{OS:'android'},StyleSheet:{create:x=>x,absoluteFill:{position:'absolute',top:0,bottom:0,left:0,right:0}},AppState:{currentState:'active',addEventListener:()=>({remove:noop})},BackHandler:{addEventListener:(_,fn)=>{back.add(fn);return {remove:()=>back.delete(fn)}}},useWindowDimensions:()=>({width:420,height:780})};if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:32,bottom:24,left:5,right:7})};if(name==='expo-router')return {router:{push:noop}};if(name==='expo-brightness')return {isAvailableAsync:async()=>false};if(name.includes('/services/dependencies'))return {appDependencies:dependencies};if(name.includes('/stores/readerStore'))return {useReaderStore:readerStore};if(name.includes('/contexts/ReaderSettingsContext'))return {useReaderSettings:()=>({fontSize:16,fontFamily:'Georgia',marginSize:24,theme:'light',brightness:100,useSystemBrightness:true,palette})};if(name.includes('epubOpenMetrics'))return {epubDiagnosticConsole:{log:noop},markEpubOpenEvent:noop,markEpubOpenSpanStart:noop,markEpubOpenSpanEnd:noop};
for(const component of ['MotionCuesOverlay','StudyBookmarksPanel','ReaderControls','ReaderSettingsPanel','DocumentReaderAdapter','PdfModeChooser','PdfReflowProcessor'])if(name.endsWith('/'+component))return {[component]:widget(component)};
if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name);return load(['.ts','.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(p)));}return require(name);},exports,fn=>{timers.set(++timerId,fn);return timerId},id=>timers.delete(id));return exports;}
(async()=>{
 const {ReaderScreen}=load('src/presentation/screens/ReaderScreen.tsx');
 const {BottomFooter}=load('src/presentation/components/BottomFooter.tsx');
 const builder=load('src/data/local/PdfReflowDocumentBuilder.ts');
 const valid=builder.buildPdfReflowDocument([{pageNumber:1,pageWidth:500,pageHeight:700,textItems:[{text:'A readable paragraph. '.repeat(100),x:20,y:600,width:300,height:12}],images:[]}],1);
 for(const mode of ['epub','reflow']){
  fixture=mode;writes.length=0;let renderer,footer;
  await act(async()=>{renderer=create(React.createElement(ReaderScreen,{bookId:mode+'-drag'}));});
  if(mode==='reflow')await act(async()=>renderer.root.findByType('PdfReflowProcessor').props.onComplete(valid));
  const doc=()=>renderer.root.findByType('DocumentReaderAdapter'),controls=()=>renderer.root.findByType('ReaderControls');
  const report=(page,operationId=0)=>act(async()=>doc().props.onEpubPageInfo({pageNumber:page,totalPages:101,chapterIndex:0,layoutReady:true,operationId}));
  await report(1);await report(51);
  const props=()=>({...controls().props,onChange:value=>controls().props.onProgressChange(value),onPrevious:controls().props.onPagePrevious,onNext:controls().props.onPageNext});
  await act(async()=>{footer=create(React.createElement(BottomFooter,props()));});
  const slider=()=>footer.root.findByType('Slider');
  await act(async()=>slider().props.onSlidingStart(.5));
  for(const value of [.51,.55,.60]){const count=writes.length;await act(async()=>slider().props.onValueChange(value));assert.equal(writes.length,count);assert.equal(doc().props.epubPage,51);assert.equal(doc().props.epubNavigationRequest,null);}
  await report(51);await act(async()=>footer.update(React.createElement(BottomFooter,props())));
  assert.equal(slider().props.value,.6,'Viewer confirmation must not fight the dragged thumb');
  const count=writes.length;await act(async()=>slider().props.onSlidingComplete(.6));
  const request=doc().props.epubNavigationRequest;assert.equal(request.pageNumber,61);assert.equal(request.origin,'SLIDER_COMMIT');assert.equal(doc().props.epubPage,51);assert.equal(writes.length,count,'Do not persist requested position before ACK');
  await report(51);assert.strictEqual(doc().props.epubNavigationRequest,request);assert.equal(controls().props.requestedPage,61);
  await report(61,request.id);assert.equal(doc().props.epubPage,61);assert.equal(writes.at(-1).pageNumber,61);assert.equal(controls().props.requestedPage,null);
  const acceptedWrites=writes.length;await report(51,0);assert.equal(doc().props.epubPage,61);assert.equal(writes.length,acceptedWrites,'Older command confirmation must not overwrite newer accepted operation');
  const instance=doc();for(let i=0;i<6;i++)await act(async()=>reader.toggleControls());await act(async()=>controls().props.onSettings());assert.strictEqual(doc(),instance);assert.strictEqual(doc().props.epubNavigationRequest,request);
  await report(1,request.id);assert.equal(writes.at(-1).pageNumber,1,'Real page 1 remains valid');
  await act(async()=>{footer.unmount();renderer.unmount();});
  console.log('PASS '+mode+' drag preview isolation, one commit, old ACK without replay, causal ACK ordering, confirmed persistence, controls/settings identity and page 1');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
