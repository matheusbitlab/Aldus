// Actual generated Reader DOM and CSS Highlight API; synthetic chapters only.
// DOM selection exercises the bridge, not Android's physical selection handles.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async function verifyStudy({send,evaluate,frameId,createEpubReaderDocument,options}){
 const out=path.resolve('.expo/no-device-reader-study');fs.mkdirSync(out,{recursive:true});
 const chapters=['A','B'].map(letter=>({id:'study-'+letter,title:'Capítulo '+letter,html:`<h2>Capítulo ${letter}</h2>`+Array.from({length:35},(_,i)=>`<p>Parágrafo ${letter}-${i}. Trecho marcado do capítulo ${letter}. A leitura preserva a referência original mesmo depois de ajustar a página e consultar outro capítulo.</p>`).join('')}));
 const html=createEpubReaderDocument(chapters,options).replace('<script>','<script>window.messages=[];window.ReactNativeWebView={postMessage:x=>messages.push(JSON.parse(x))};');
 const until=async(expression,label)=>{await evaluate(`new Promise((resolve,reject)=>{let frames=0;function step(){if(${expression})return resolve(true);if(++frames>600)return reject(Error(${JSON.stringify(label)}));requestAnimationFrame(step)}step()})`)};
 const open=async()=>{await send('Page.setDocumentContent',{frameId,html});await until("messages.some(m=>m.type==='page'&&m.layoutReady)",'Initial reader layout');};
 const request=async(value)=>{await evaluate(`window.readerStudy(${JSON.stringify(value)})`);await until(`messages.some(m=>m.type==='study'&&m.id===${value.id})`,'Study response');return evaluate(`messages.find(m=>m.type==='study'&&m.id===${value.id})`);};
 const select=async(letter,id)=>{
  // An opening paragraph can share a page with the previous chapter's ending.
  await evaluate(`(()=>{window.readerStudy({type:'studySelection',id:${id},enabled:true});const n=document.querySelectorAll('[data-chapter-id="study-${letter}"] p')[10].firstChild,start=n.data.indexOf('Trecho marcado'),end=start+'Trecho marcado do capítulo ${letter}.'.length,r=document.createRange();r.setStart(n,start);r.setEnd(n,end);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))})()`);
  await until(`messages.some(m=>m.type==='study'&&m.id===${id})`,'Selection captured');
  const reply=await evaluate(`messages.find(m=>m.type==='study'&&m.id===${id})`);assert.equal(reply.status,'captured');assert.equal(reply.anchor.chapterId,'study-'+letter);assert.equal(reply.anchor.quote,`Trecho marcado do capítulo ${letter}.`);return reply.anchor;
 };
 const renderedQuotes=()=>evaluate(`(window.__studyHighlightKeys||[]).map(key=>Array.from(CSS.highlights.get(key)).map(range=>range.toString()).join(''))`);
 const navigate=async(anchor,id)=>{const r=await request({type:'studyNavigate',id,anchor});assert.equal(r.status,'exact');await until(`messages.filter(m=>m.type==='page').at(-1)?.pageNumber===${r.pageNumber}`,'Navigation committed');return r.pageNumber;};
 await open();
 const a=await select('A',101),b=await select('B',102);
 assert.notEqual(a.chapterId,b.chapterId);
 const highlights=[a,b].map((anchor,i)=>({id:'synthetic-'+i,chapterId:anchor.chapterId,highlightedText:anchor.quote,colorLabel:i?'pink':'green',startCfi:JSON.stringify({format:'kindle-study-highlight',version:1,anchor})}));
 let r=await request({type:'studyRenderHighlights',id:103,highlights});assert.equal(r.status,'rendered');assert.equal(r.missing,0);assert.equal(r.ambiguous,0);assert.deepEqual(await renderedQuotes(),[a.quote,b.quote]);
 const pageA=await navigate(a,104),pageB=await navigate(b,105);assert(pageB>pageA,'Distinct chapter positions');
 // Rendering both chapters replaces the one-chapter cache; capture must still use B.
 await request({type:'studyRenderHighlights',id:106,highlights:highlights.slice().reverse()});
 r=await request({type:'studyCapture',id:107});assert.equal(r.anchor.chapterId,'study-B');
 await evaluate(`window.updateTypography(${JSON.stringify({...options,fontSize:22,marginSize:32,lineHeight:1.8})})`);
 await until("messages.filter(m=>m.type==='page').at(-1)?.origin==='SETTINGS_LAYOUT'",'Typography committed');
 r=await request({type:'studyRenderHighlights',id:108,highlights});assert.equal(r.missing,0);assert.deepEqual(await renderedQuotes(),[a.quote,b.quote]);
 const current=await evaluate("messages.filter(m=>m.type==='page').at(-1).pageNumber");
 const missing={...b,start:0,end:26,quote:'Trecho que não existe aqui.',prefix:'',suffix:'',path:[]};missing.end=missing.quote.length;
 assert.equal((await request({type:'studyNavigate',id:109,anchor:missing})).status,'missing');
 const ambiguous={...b,start:0,end:b.quote.length,prefix:'',suffix:'',path:[]};
 assert.equal((await request({type:'studyNavigate',id:110,anchor:ambiguous})).status,'ambiguous');
 assert.equal(await evaluate("messages.filter(m=>m.type==='page').at(-1).pageNumber"),current,'Missing/ambiguous must not navigate');
 await evaluate("window.readerStudy({type:'studySelection',id:111,enabled:true});window.readerStudy({type:'studySelection',id:111,enabled:false});document.dispatchEvent(new PointerEvent('pointerup'));window.readerStudy({type:'studySelection',id:112,enabled:true});document.dispatchEvent(new PointerEvent('pointerup'));window.readerStudy({type:'studySelection',id:112,enabled:false})");
 await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 assert.equal(await evaluate("messages.some(m=>m.type==='study'&&(m.id===111||m.id===112))"),false,'Cancelled selection cannot publish a late result');
 // New JS closure: reuse only serialized anchors, as restored annotations would.
 await open();r=await request({type:'studyRenderHighlights',id:113,highlights});assert.equal(r.missing,0);assert.deepEqual(await renderedQuotes(),[a.quote,b.quote]);
 assert.equal(await navigate(b,114),pageB);assert.equal(await navigate(a,115),pageA);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate('window.display()');
 r=await request({type:'studyRenderHighlights',id:116,highlights});assert.equal(r.missing,0);assert.deepEqual(await renderedQuotes(),[a.quote,b.quote]);
 fs.writeFileSync(path.join(out,'study-highlight-chapter-a.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await request({type:'studyRenderHighlights',id:117,highlights:[]});assert.equal(await evaluate('(window.__studyHighlightKeys||[]).length'),0);
 await send('Emulation.setDeviceMetricsOverride',{width:420,height:780,deviceScaleFactor:1,mobile:true});
 const results={scope:'Actual Reader document in Chromium; synthetic data, DOM selection and CSS Highlight API. No Android handles, native brightness, account or remote service proof.',selectionAcrossChapters:true,chapterCacheEviction:true,colors:['green','pink'],typography:true,cancelAndLateResult:true,missingAndAmbiguousPreservePosition:true,freshDocumentRestoration:true,responsiveReflow:true,clearHighlights:true};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 console.log('PASS Reader study in Chromium: two chapters, selection, cache eviction, colors, typography, missing/ambiguous safety, cancellation, fresh-document anchors and resize.');
};
