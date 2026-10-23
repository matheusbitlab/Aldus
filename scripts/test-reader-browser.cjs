// Actual generated reader document in isolated Chromium/CDP. No user profile/data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),WebSocket=require('ws'),cp=require('node:child_process');
const coldBaseline=process.argv.includes('--cold-baseline');
const baseline=process.argv.includes('--baseline'), fractionalBaseline=process.argv.includes('--fractional-baseline'), columnCountBaseline=process.argv.includes('--column-count-baseline'), cache=new Map();
const React=require('react'),ReactDOMServer=require('react-dom/server');
function css(style){const v=Object.assign({},...[style].flat(Infinity).filter(Boolean));for(const axis of ['Horizontal','Vertical']){for(const kind of ['padding','margin']){const key=kind+axis;if(v[key]!==undefined){v[kind+(axis==='Horizontal'?'Left':'Top')]=v[key];v[kind+(axis==='Horizontal'?'Right':'Bottom')]=v[key];delete v[key];}}}for(const key of Object.keys(v))if(key.startsWith('shadow')||key==='elevation')delete v[key];return v;}
function host(tag){return ({children,style,accessibilityLabel,pointerEvents,...props})=>{const styles=css(style);if(styles.opacity?.value!==undefined)styles.opacity=styles.opacity.value;if(typeof styles.lineHeight==='number')styles.lineHeight+='px';return React.createElement(tag,{style:{...(tag==='span'?{}:{display:'flex',flexDirection:'column',boxSizing:'border-box',flexShrink:0}),...(tag==='button'?{border:0,padding:0}:{}),...styles,...(['none','box-none'].includes(pointerEvents)?{pointerEvents:'none'}:{})},'data-box-none':pointerEvents==='box-none'?'true':undefined,'aria-label':accessibilityLabel},children);};}
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
 let original=coldBaseline&&file.endsWith('EpubReaderDocument.ts')?cp.execFileSync('git',['show','aa21605:'+file],{encoding:'utf8'}):baseline&&file.endsWith('EpubReaderDocument.ts')?cp.execFileSync('git',['show','77c490c:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
 if(fractionalBaseline&&file.endsWith('EpubReaderDocument.ts')){const previous=cp.execFileSync('git',['show','77c490c:'+file],{encoding:'utf8'}).match(/function getPageWidth\(\) \{[\s\S]*?\n  \}/)[0];original=original.replace(/function getPageWidth\(\) \{[\s\S]*?\n  \}/,previous);}
 if(columnCountBaseline&&file.endsWith('EpubReaderDocument.ts'))original=original.replace(/function calculateTotalPages\(\) \{[\s\S]*?\n  \}/,`function calculateTotalPages() {
    var width = getPageWidth();
    if (!content || width <= 0) return 1;
    var left = content.getBoundingClientRect().left;
    var extent = width;
    Array.prototype.forEach.call(content.children, function(section) {
      extent = Math.max(extent, section.getBoundingClientRect().right - left);
    });
    return Math.max(1, Math.ceil(extent / width));
  }`);
 const source=ts.transpileModule(original,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','exports',source)(name=>{
 if(name==='react-native')return {View:host('div'),Text:host('span'),Pressable:host('button'),Animated:{View:host('div'),Value:class{constructor(value){this.value=value;}},timing:()=>({start:()=>{}})},StyleSheet:{create:x=>x,absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}},Platform:{OS:'android'}};
 if(name==='@react-native-community/slider')return {__esModule:true,default:host('input')};
 if(name.includes('AppThemeContext'))return {useAppTheme:()=>({palette:{accent:'#a54',text:'#222',secondaryText:'#444',surface:'#fff'}})};
 if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:32,bottom:24,left:0,right:0})};
 if(name==='@expo/vector-icons')return {Ionicons:()=>React.createElement('span',null,'●')};
 if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name);const target=['.ts','.tsx'].map(e=>base+e).find(p=>fs.existsSync(p));return load(target);}return require(name);},exports);return exports;}
(async()=>{
 const endpoint=process.env.READER_CDP_URL ?? 'http://127.0.0.1:9382';
 const parsedEndpoint=new URL(endpoint);assert.ok(['127.0.0.1','localhost'].includes(parsedEndpoint.hostname),'Use an isolated local Chromium profile');
 const target=(await(await fetch(endpoint+'/json/list')).json()).find(t=>t.type==='page');
 const ws=new WebSocket(target.webSocketDebuggerUrl);let id=0;const calls=new Map();
 ws.on('message',raw=>{const m=JSON.parse(raw);if(m.id){const c=calls.get(m.id);calls.delete(m.id);m.error?c.reject(m.error):c.resolve(m.result);}});
 await new Promise(r=>ws.on('open',r));
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;calls.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 try{
 await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:420,height:780,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('6*7'),42);
 const {createEpubReaderDocument}=load('src/presentation/components/EpubReaderDocument.ts');
 const paragraphs=Array.from({length:240},(_,i)=>`<p>Parágrafo ${i}. ${'A leitura conserva a localização do trecho e permite consultar o livro com clareza. '.repeat(8)}</p>`).join('');
 let chapters=[{id:'fixture-chapter',title:'Capítulo de regressão',html:paragraphs}];
 if(process.argv.includes('--epub')){
  const file=fs.readdirSync('Livros').find(name=>/Sigmund Freud.*\.epub$/i.test(name));assert.ok(file);
  const {EpubParserService}=load('src/data/epub/EpubParserService.ts');chapters=(await new EpubParserService().parse(new Uint8Array(fs.readFileSync(path.join('Livros',file))))).chapters;
  console.log('REAL EPUB',JSON.stringify({file,chapters:chapters.length}));
 }
 if(process.argv.includes('--reflow')){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),task=pdfjs.getDocument({data:new Uint8Array(fs.readFileSync('Livros/sobre-o-ocio.pdf')),useSystemFonts:true});
  const pdf=await task.promise,pages=[];
  try{for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n);try{const text=await p.getTextContent(),vp=p.getViewport({scale:1});pages.push({pageNumber:n,pageWidth:vp.width,pageHeight:vp.height,textItems:text.items.filter(i=>typeof i.str==='string'&&i.transform).map(i=>({text:i.str,x:i.transform[4],y:i.transform[5],width:i.width,height:i.height,fontName:i.fontName,hasEOL:i.hasEOL})),images:[]});}finally{p.cleanup();}}
  const builder=load('src/data/local/PdfReflowDocumentBuilder.ts');chapters=builder.toStoredReflowChapters('reflow-browser',builder.buildPdfReflowDocument(pages,pdf.numPages));console.log('REAL REFLOW',JSON.stringify({file:'sobre-o-ocio.pdf',sourcePages:pdf.numPages,chapters:chapters.length}));}finally{await task.destroy();}
 }
 const options={fontSize:16,fontFamily:'Georgia',marginSize:24,lineHeight:1.65,paragraphSpacing:1,textColor:'#222222',backgroundColor:'#f5ebd9'};
 if(process.argv.includes('--lazy-images')){
  const image=color=>'data:image/svg+xml;base64,'+Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="${color}"/></svg>`).toString('base64');
  chapters=[{id:'synthetic-images',title:'Synthetic offscreen images',html:`<img src="${image('red')}"/>${paragraphs}<img src="${image('blue')}"/>`}];
 }
 const html=createEpubReaderDocument(chapters,options).replace('<script>','<script>window.messages=[];window.ReactNativeWebView={postMessage:function(x){messages.push(JSON.parse(x));}};');
 const {frameTree}=await send('Page.getFrameTree');await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html});
 await evaluate(`new Promise((resolve,reject)=>{let count=0;function step(){if(messages.some(m=>m.type==='page'&&m.layoutReady))return resolve(true);if(++count>600)return reject(Error('layout not ready'));requestAnimationFrame(step);}step();})`);
 if(process.argv.includes('--lazy-images')){
  const images=await evaluate(`Array.from(document.images).map(image=>({complete:image.complete,width:image.naturalWidth}))`);
  assert.equal(images.length,2);assert.ok(images.every(image=>image.complete&&image.width===24));
  console.log('PASS Chromium: offscreen EPUB images settle initial pagination without user navigation',JSON.stringify(images));
 }
 if(!baseline){
  const fractional=await evaluate(`(()=>{const v=document.getElementById('reader-viewport');v.style.setProperty('width','419.727px','important');v.style.setProperty('min-width','0px','important');window.display();const page=Math.min(120,messages.filter(m=>m.type==='page').at(-1).totalPages);window.goToPage(page);const c=document.getElementById('reader-content'),width=c.getBoundingClientRect().width,x=new DOMMatrix(getComputedStyle(c).transform).m41;return {page,width,rounded:v.clientWidth,x,drift:Math.abs(x+(page-1)*width)};})()`);
  if(fractionalBaseline){assert.ok(fractional.drift>5,JSON.stringify(fractional));console.log('REPRODUCED integer viewport width accumulates column drift',JSON.stringify(fractional));return;}
  assert.ok(fractional.drift<.05,JSON.stringify(fractional));console.log('PASS fractional viewport: distant page stays aligned with its column',JSON.stringify(fractional));
  const lastPage=await evaluate(`(()=>{const total=messages.filter(m=>m.type==='page').at(-1).totalPages;window.goToPage(total);const v=document.getElementById('reader-viewport'),w=v.getBoundingClientRect().width,h=v.getBoundingClientRect().height,walker=document.createTreeWalker(document.getElementById('reader-content'),NodeFilter.SHOW_TEXT);let n,visible=0;while(n=walker.nextNode()){if(!n.data.trim()||n.parentElement.closest('style,script'))continue;for(const offset of [n.data.search(/\\S/),n.data.trimEnd().length-1]){const range=document.createRange();range.setStart(n,offset);range.setEnd(n,offset+1);const r=range.getBoundingClientRect();if(r.width>0&&r.right>0&&r.left<w&&r.bottom>0&&r.top<h)visible++;}}return {total,visible,width:w,scrollWidth:document.getElementById('reader-content').scrollWidth};})()`);
  assert.ok(lastPage.visible>0,JSON.stringify(lastPage));console.log('PASS fractional viewport: final page contains visible text',JSON.stringify(lastPage));
  const counts=await evaluate(`(async()=>{const v=document.getElementById('reader-viewport');v.style.setProperty('width','392.727px','important');const rows=[];for(const size of [16,25]){window.updateTypography({...${JSON.stringify(options)},fontSize:size,lineHeight:1.65});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));window.goToPage(1);window.display();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const total=messages.filter(m=>m.type==='page').at(-1).totalPages;for(const p of [1,120,121,220,221,total-1,total]){window.goToPage(Math.min(p,total));window.display();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const m=messages.filter(m=>m.type==='page').at(-1);rows.push({size,page:m.pageNumber,total:m.totalPages});}}return rows;})()`);
  const varying=[16,25].some(size=>new Set(counts.filter(x=>x.size===size).map(x=>x.total)).size>1);
  if(columnCountBaseline){console.log(varying?'REPRODUCED translated column bounds change page total':'INCONCLUSIVE column count variation in this Chromium geometry',JSON.stringify(counts));return;}
  assert.equal(varying,false,JSON.stringify(counts));console.log('PASS fractional viewport: page total stays stable across distant navigation',JSON.stringify(counts));
  await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html});
  await evaluate(`new Promise(resolve=>{function step(){if(messages.some(m=>m.type==='page'&&m.layoutReady))return resolve();requestAnimationFrame(step);}step();})`);
 }
 const beforePage=await evaluate(`Math.min(30,messages.filter(m=>m.type==='page').at(-1).totalPages-2)`);assert.ok(beforePage>1);
 const before=await evaluate(`window.goToPage(${beforePage});window.readerStudy({type:'studyCapture',id:1});messages.at(-1)`);
 assert.equal(before.status,'captured');assert.ok(before.anchor.start>=0);
 const moved=await evaluate(`(async()=>{const start=messages.length;window.updateTypography(${JSON.stringify({...options,fontSize:25,lineHeight:2,marginSize:40})});await new Promise((resolve,reject)=>{let count=0;function step(){if(messages.slice(start).some(m=>m.type==='page'))return resolve();if(++count>600)return reject(Error('typography did not commit'));requestAnimationFrame(step);}step();});window.readerStudy({type:'studyCapture',id:2});return {page:messages.filter(m=>m.type==='page').at(-1),anchor:messages.at(-1)};})()`);
 // Locate the old logical start in the actual new layout. A new page number is expected.
 const rect=await evaluate(`(()=>{const section=Array.from(document.querySelectorAll('.epub-chapter')).find(s=>s.getAttribute('data-chapter-id')===${JSON.stringify(before.anchor.chapterId)});const walker=document.createTreeWalker(section,NodeFilter.SHOW_TEXT);let n,offset=0;while(n=walker.nextNode()){if(n.parentElement.closest('style,script'))continue;if(offset+n.length>${before.anchor.start}){const r=document.createRange();r.setStart(n,${before.anchor.start}-offset);r.setEnd(n,${before.anchor.start}+1-offset);const b=r.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};}offset+=n.length;}})()`);
 const visible=rect.right>0&&rect.left<420&&rect.bottom>0&&rect.top<780;
 if(baseline){assert.equal(visible,false);console.log('REPRODUCED numeric-page typography loses logical anchor',JSON.stringify({beforePage,afterPage:moved.page.pageNumber,beforeStart:before.anchor.start,afterStart:moved.anchor.anchor.start,rect}));}
 else {assert.equal(visible,true,JSON.stringify(rect));assert.ok(moved.page.pageNumber>beforePage);console.log('PASS typography preserves old logical anchor',JSON.stringify({beforePage,afterPage:moved.page.pageNumber,beforeStart:before.anchor.start,afterStart:moved.anchor.anchor.start}));}
 if(!baseline){
  const roundtrip=await evaluate(`(async()=>{const rows=[];for(const options of ${JSON.stringify([options,{...options,fontSize:25,lineHeight:2,marginSize:40},options])}){const start=messages.length;window.updateTypography(options);await new Promise((resolve,reject)=>{let frames=0;function step(){if(messages.slice(start).some(m=>m.type==='page'&&m.origin==='SETTINGS_LAYOUT'))return resolve();if(++frames>600)return reject(Error('Settings roundtrip not acknowledged'));requestAnimationFrame(step)}step()});rows.push({size:options.fontSize,page:messages.filter(m=>m.type==='page').at(-1).pageNumber})}return rows})()`);
  for(const row of roundtrip.filter(r=>r.size===options.fontSize))assert.equal(row.page,beforePage,'Repeated typography changes must retain the original reading intent, not drift toward earlier page starts');
  console.log('PASS typography roundtrip without cumulative anchor drift',JSON.stringify(roundtrip));
 }
 // Cold restart uses a fresh document and the exact persisted text anchor, never the prior JS closure.
 if(!baseline){
  const instrument=source=>source.replace('<script>','<script>window.messages=[];window.ReactNativeWebView={postMessage:x=>messages.push(JSON.parse(x))};');
  const ready=()=>evaluate(`new Promise((resolve,reject)=>{let frames=0;function step(){if(messages.some(m=>m.type==='page'&&m.layoutReady))return resolve();if(++frames>600)return reject(Error('Cold layout unavailable'));requestAnimationFrame(step)}step()})`);
  for(const size of [25,18]){
   await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html});await ready();
   await evaluate(`window.goToPage(${beforePage});window.updateTypography(${JSON.stringify({...options,fontSize:size})})`);
   await evaluate(`new Promise(resolve=>{function step(){if(messages.some(m=>m.type==='page'&&m.origin==='SETTINGS_LAYOUT'))return resolve();requestAnimationFrame(step)}step()})`);
   const saved=await evaluate(`messages.filter(m=>m.type==='page').at(-1)`);
   const encoded=load('src/domain/types/readerLocation.ts').encodeReaderLocation('epub',saved.readingAnchor||before.anchor);
   const anchor=load('src/domain/types/readerLocation.ts').decodeReaderLocation(encoded,'epub');
   await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html:instrument(createEpubReaderDocument(chapters,{...options,fontSize:size,initialRestorePending:true}))});await ready();
   await evaluate(`window.restoreReadingPosition?window.restoreReadingPosition({pageNumber:${saved.pageNumber},anchor:${JSON.stringify(anchor)}}):window.goToPage(${saved.pageNumber},0,'RESTORE')`);
   await evaluate(`new Promise(resolve=>{function step(){if(messages.some(m=>m.type==='page'&&m.origin==='RESTORE'))return resolve();requestAnimationFrame(step)}step()})`);
   const ack=await evaluate(`messages.filter(m=>m.type==='page').at(-1)`);
   await evaluate(`window.dispatchEvent(new MessageEvent('message',{data:{type:'completeInitialRestore'}}));window.updateTypography(${JSON.stringify(options)})`);
   await evaluate(`new Promise(resolve=>{function step(){if(messages.some(m=>m.type==='page'&&m.origin==='SETTINGS_LAYOUT'))return resolve();requestAnimationFrame(step)}step()})`);
   const returned=await evaluate(`messages.filter(m=>m.type==='page').at(-1)`);
   if(coldBaseline){assert.notEqual(returned.pageNumber,beforePage);console.log('REPRODUCED cold restart loses textual reading intent',JSON.stringify({size,beforePage,returnedPage:returned.pageNumber}));return;}
   assert.equal(ack.anchorRestoreStatus,'exact');assert.deepEqual(returned.readingAnchor,anchor);assert.equal(returned.pageNumber,beforePage);
   console.log('PASS fresh document restores persisted anchor before typography roundtrip',JSON.stringify({size,beforePage,returnedPage:returned.pageNumber,anchorStart:anchor.start}));
  }
  await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html});await ready();await evaluate(`window.goToPage(${beforePage})`);
 }
 // Display/controls do not replace the document or move its logical location.
 const stable=await evaluate(`(()=>{window.readerToken={};window.savedToken=readerToken;window.savedContent=document.getElementById('reader-content');const start=messages.filter(m=>m.type==='page').at(-1).pageNumber;window.display();window.readerStudy({type:'studyCapture',id:3});return {same:readerToken===savedToken&&savedContent===document.getElementById('reader-content'),page:messages.filter(m=>m.type==='page').at(-1).pageNumber,start,anchor:messages.at(-1).anchor};})()`);
 assert.equal(stable.same,true);assert.equal(stable.page,stable.start);
 // transitionend commits target, including recalculation while animating.
 const next=await evaluate(`new Promise(resolve=>{let frames=0;window.navigatePage(1);window.display();function step(){if(++frames>90)return resolve(messages.filter(m=>m.type==='page').at(-1).pageNumber);requestAnimationFrame(step);}step();})`);
 assert.equal(next,baseline?stable.page:stable.page+1);console.log(baseline?'REPRODUCED display during transition overwrites target':'PASS display identity/page and transitionend target');
 if(!baseline){
  const navigatedRoundtrip=await evaluate(`(async()=>{for(const options of ${JSON.stringify([{...options,fontSize:25,lineHeight:2,marginSize:40},options])}){const start=messages.length;window.updateTypography(options);await new Promise((resolve,reject)=>{let frames=0;function step(){if(messages.slice(start).some(m=>m.type==='page'&&m.origin==='SETTINGS_LAYOUT'))return resolve();if(++frames>600)return reject(Error('Navigation typography not acknowledged'));requestAnimationFrame(step)}step()})}return messages.filter(m=>m.type==='page').at(-1).pageNumber})()`);
  assert.equal(navigatedRoundtrip,stable.page+1,'Explicit page navigation replaces the retained typography anchor');
  const sliderTarget=await evaluate('Math.min(80,messages.filter(m=>m.type===\'page\').at(-1).totalPages)');
  const navigation=await evaluate(`(async()=>{const start=messages.length,content=document.getElementById('reader-content');window.dispatchEvent(new MessageEvent('message',{data:{type:'navigatePage',direction:1,operationId:41,origin:'NEXT_PAGE'}}));window.dispatchEvent(new MessageEvent('message',{data:{type:'goToPage',pageNumber:${sliderTarget},operationId:42,origin:'SLIDER_COMMIT'}}));window.display();await new Promise((resolve,reject)=>{let frames=0;function step(){if(messages.slice(start).some(m=>m.type==='page'&&m.operationId===42))return resolve();if(++frames>120)return reject(Error('deferred explicit navigation not acknowledged'));requestAnimationFrame(step);}step();});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const states=messages.slice(start).filter(m=>m.type==='page');return {states:states.map(m=>({page:m.pageNumber,operationId:m.operationId})),last:states.at(-1),same:content===document.getElementById('reader-content')};})()`);
  assert.equal(navigation.last.pageNumber,sliderTarget);assert.equal(navigation.last.operationId,42);assert.equal(navigation.same,true);assert.ok(navigation.states.every(m=>m.operationId<42||m.page===sliderTarget));console.log('PASS explicit slider commit wins over in-flight transition/display without replay',JSON.stringify(navigation.states));
 }
 // Real TopHeader markup with RN styles, feedback geometry and actual Chromium hit testing.
 const {TopHeader}=load('src/presentation/components/TopHeader.tsx');
 const header=ReactDOMServer.renderToStaticMarkup(React.createElement(TopHeader,{title:'Livro',chapterTitle:'Capítulo',text:'#222',accent:'#a54',background:'#fff',onBack:()=>{},onSearch:()=>{},onContents:()=>{},onSettings:()=>{},onStudy:()=>{}}));
 const feedbackTop=baseline?44:load('src/presentation/components/reader/ReaderGeometry.ts').readerFeedbackTop(32,true,86);
 await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html:`<html><body style="margin:0"><div style="position:relative;width:420px;height:780px">${header}<div id="feedback" style="position:absolute;top:${feedbackTop}px;left:16px;right:16px;z-index:40;display:flex;padding:12px;gap:12px;pointer-events:none;background:#eee"><span style="pointer-events:auto;flex:1">O Reflow está pronto para leitura. Mensagem de feedback do processador.</span><button style="pointer-events:auto">Fechar</button></div></div></body></html>`});
 const receivers=await evaluate(`(()=>{window.hits=[];const buttons=Array.from(document.querySelectorAll('button[aria-label]'));buttons.forEach(b=>b.onclick=()=>hits.push(b.getAttribute('aria-label')));return buttons.map(b=>{const r=b.getBoundingClientRect(),target=document.elementFromPoint(r.left+r.width/2,r.bottom-5);target.click();return {button:b.getAttribute('aria-label'),receiver:target.closest('button')?.getAttribute('aria-label')||target.tagName};});})()`);
 const blocked=receivers.filter(r=>r.button!==r.receiver).length;
 if(baseline){assert.ok(blocked>0);console.log('REPRODUCED feedback intercepts Header',JSON.stringify(receivers));}
 else{assert.equal(blocked,0);assert.equal(await evaluate('hits.length'),5);console.log('PASS Header back/search/contents/settings/study hits with feedback',JSON.stringify(receivers));}
 if(!baseline){
  const {ReaderControls}=load('src/presentation/components/ReaderControls.tsx');
  const controls=ReactDOMServer.renderToStaticMarkup(React.createElement(ReaderControls,{visible:true,layoutMode:'overlay',title:'Livro',chapterTitle:'Capitulo',progress:.4,pageNumber:20,totalPages:50,onBack:()=>{},onSearch:()=>{},onContents:()=>{},onSettings:()=>{},onProgressChange:()=>{},onPagePrevious:()=>{},onPageNext:()=>{}},React.createElement('iframe',{title:'Documento',srcDoc:'<p>Texto do documento</p>',style:{position:'absolute',inset:0,width:'100%',height:'100%',border:0}})));
  await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html:`<html><head><style>[data-box-none="true"] > * {pointer-events:auto}</style></head><body style="margin:0"><div style="position:relative;width:420px;height:780px">${controls}</div></body></html>`});
  const geometry=await evaluate(`(()=>{const footer=document.querySelector('input[aria-label]'),r=footer.getBoundingClientRect();return {top:r.top,bottom:r.bottom,buttons:Array.from(document.querySelectorAll('button[aria-label]')).map(b=>{const p=b.getBoundingClientRect(),target=document.elementFromPoint(p.left+p.width/2,p.top+p.height/2);return {name:b.getAttribute('aria-label'),top:p.top,bottom:p.bottom,hit:target?.closest('button')===b};})};})()`);
  assert.ok(geometry.top>600&&geometry.bottom<=780,JSON.stringify(geometry));
  assert.equal(geometry.buttons.length,6);assert.ok(geometry.buttons.every(b=>b.top>=0&&b.bottom<=780&&b.hit),JSON.stringify(geometry));
  console.log('PASS actual Reflow control wrappers: footer in viewport, all 6 header/footer buttons receive hits above iframe',JSON.stringify(geometry));
 }
 }finally{ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
