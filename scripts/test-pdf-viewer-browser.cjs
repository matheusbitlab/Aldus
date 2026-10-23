// Actual PdfPageViewer + PDF.js worker in Chromium, served on loopback only.
// Synthetic PDF and controlled parent props; not ReaderScreen, native PDF or device proof.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function pdfFixture(){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R 10 0 R] /Count 4 >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 for(let i=1;i<=4;i++){const text=`BT /F1 20 Tf 40 680 Td (Pagina sintetica ${i} - Aldus QA) Tj 0 -40 Td (Sem dados pessoais ou servicos externos.) Tj ET`;
 objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 500 750] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length+2} 0 R >>`,'<< /Length '+Buffer.byteLength(text)+' >>\nstream\n'+text+'\nendstream');}
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((v,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${v}\nendobj\n`});const xref=Buffer.byteLength(pdf);pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(pdf);
}
(async()=>{
 const out=path.resolve('.expo/no-device-pdf-viewer');fs.mkdirSync(out,{recursive:true});
 const esbuild=require('../.expo/reader-matrix-tools/node_modules/esbuild');
 const entry=`import React from'react';import{createRoot}from'react-dom/client';import{PdfPageViewer}from'./src/presentation/components/PdfPageViewer.web';window.fixture={totals:[],state:null};function App(){const[s,set]=React.useState({uri:'/fixture.pdf',pageNumber:3,pageMode:'single',fitMode:'page',zoom:1,rotation:0,open:false,generation:0});window.fixture.state=s;window.fixture.configure=p=>set(v=>({...v,...p}));return <div style={{display:'flex',height:'100%',width:'100%',position:'relative'}}><PdfPageViewer key={s.generation} {...s} onTotalPages={n=>window.fixture.totals.push(n)}/>{s.open&&<div role="dialog" style={{position:'absolute',top:10,right:10,background:'#eee',padding:15}}>Painel controlado do ensaio</div>}</div>}createRoot(document.getElementById('root')).render(<App/>);`;
 await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'pdf-browser-fixture.jsx',loader:'jsx'},outfile:path.join(out,'fixture.js'),bundle:true,platform:'browser',format:'esm',jsx:'automatic',alias:{'react-native':'react-native-web'},define:{'process.env.NODE_ENV':'"production"','__DEV__':'false'}});
 await esbuild.build({entryPoints:['src/presentation/components/pdfjs.worker.ts'],outfile:path.join(out,'pdfjs.worker.ts'),bundle:true,platform:'browser',format:'iife'});
 const pdf=pdfFixture(),requests=[],timers=new Set();
 const server=http.createServer((req,res)=>{
  requests.push(req.url);if(req.url==='/fixture.pdf'||req.url==='/slow.pdf'){const send=()=>{res.setHeader('Content-Type','application/pdf');res.end(pdf)};if(req.url==='/slow.pdf'){const timer=setTimeout(()=>{timers.delete(timer);if(!res.destroyed)send()},2000);timers.add(timer)}else send();}
  else if(req.url==='/fixture.js'||req.url==='/pdfjs.worker.ts'){res.setHeader('Content-Type','text/javascript');fs.createReadStream(path.join(out,req.url.slice(1))).pipe(res)}
  else if(req.url==='/missing.pdf'){res.writeHead(404);res.end()}
  else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%}*{box-sizing:border-box}</style><div id="root"></div><script type="module" src="/fixture.js"></script></html>')}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'aldus-pdf-viewer-')),chrome=cp.spawn(require('./browser-path.cjs').browserPath(),['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});let ws;const errors=[],blocked=[];
 try{
 let port;for(let n=0;n<150;n++){try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];if(port)break}catch{}await wait(100)}assert(port);
 const target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page');ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const jobs=new Map();
 const command=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>{jobs.delete(key);reject(Error('CDP timeout '+method))},30000);jobs.set(key,{resolve,reject,timer});ws.send(JSON.stringify({id:key,method,params}))});
 ws.onmessage=async({data})=>{const m=JSON.parse(data),j=jobs.get(m.id);if(j){clearTimeout(j.timer);jobs.delete(m.id);m.error?j.reject(Error(m.error.message)):j.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Fetch.requestPaused'){const p=m.params;if(new URL(p.request.url).hostname!=='127.0.0.1'){blocked.push(new URL(p.request.url).hostname);await command('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'})}else await command('Fetch.continueRequest',{requestId:p.requestId})}};
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,r.exceptionDetails?.exception?.description);return r.result.value};
 const until=async(expression,label)=>{for(let n=0;n<300;n++){if(await evaluate(expression))return;await wait(100)}throw Error(label)};
 const ready="Boolean(document.querySelector('canvas')?.width) && !document.body.innerText.includes('Carregando página...') && !document.body.innerText.includes('Não foi possível abrir este PDF.')";
 const configure=async props=>{
  const before=await evaluate('({state:window.fixture.state,totals:window.fixture.totals.length})');
  const reload=['uri','pageMode','generation'].some(key=>key in props&&props[key]!==before.state[key]);
  await evaluate('window.fixture.configure('+JSON.stringify(props)+')');
  await until(Object.entries(props).map(([key,value])=>'window.fixture.state['+JSON.stringify(key)+']==='+JSON.stringify(value)).join(' && '),'Parent props committed');
  if(reload)await until('window.fixture.totals.length>'+before.totals,'New PDF load acknowledged');
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await until(ready,'PDF render readiness');
 };
 const image=()=>evaluate("document.querySelector('canvas').toDataURL()");
 await command('Runtime.enable');await command('Page.enable');await command('Network.enable');await command('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await command('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});await until("Boolean(window.fixture?.state) && "+ready,'Initial actual PDF.js render');assert.equal(await evaluate('window.fixture.totals.at(-1)'),4);
 const baseline=await image();assert(baseline.length>500);const cases=[];
 for(const open of [true,false]){await configure({open});assert.equal(await image(),baseline);assert.equal(await evaluate('window.fixture.state.pageNumber'),3)}cases.push('parent panel open/close preserves canvas');
 for(const rotation of [90,180,270,0])await configure({rotation});assert.equal(await image(),baseline);cases.push('rotation roundtrip');
 await configure({zoom:1.25});assert.notEqual(await image(),baseline);await configure({zoom:1});assert.equal(await image(),baseline);cases.push('zoom roundtrip');
 await configure({pageNumber:4});assert.notEqual(await image(),baseline);await configure({pageNumber:3});assert.equal(await image(),baseline);cases.push('page navigation roundtrip');
 await configure({fitMode:'width'});await configure({fitMode:'page'});assert.equal(await image(),baseline);cases.push('fit roundtrip');
 await configure({pageMode:'double',pageNumber:5});assert.equal(await evaluate('window.fixture.totals.at(-1)'),8);await configure({pageMode:'single',pageNumber:3});assert.equal(await image(),baseline);cases.push('double/single mode');
 await configure({generation:1});assert.equal(await image(),baseline);cases.push('component remount with restored props');
 await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await configure({pageNumber:4});await configure({pageNumber:3});assert.equal(await image(),baseline);cases.push('already-loaded PDF navigation offline');await command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await evaluate("window.fixture.configure({uri:'/missing.pdf'})");await until("document.body.innerText.includes('Não foi possível abrir este PDF.')",'Friendly error');await configure({uri:'/fixture.pdf'});assert.equal(await image(),baseline);cases.push('unavailable file and recovery');
 await evaluate("window.fixture.configure({uri:'/slow.pdf'})");for(let n=0;n<100&&!requests.includes('/slow.pdf');n++)await wait(30);assert(requests.includes('/slow.pdf'));await configure({uri:'/fixture.pdf'});const totals=await evaluate('window.fixture.totals.length');await wait(2200);assert.equal(await evaluate('window.fixture.totals.length'),totals);assert.equal(await image(),baseline);cases.push('cancelled load and late response');
 fs.writeFileSync(path.join(out,'pdf-original-page3.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'));assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'Actual PdfPageViewer, PDF.js worker and generated four-page PDF on loopback. Controlled props and parent overlay; no native PDF, ReaderScreen preference persistence or physical device proof.',cases,canvasSHA256:crypto.createHash('sha256').update(baseline).digest('hex'),externalRequestsBlocked:blocked,errors},null,2));console.log('PASS actual PDF.js viewer: '+cases.join(', '));
 }finally{ws?.close();chrome.kill();for(const timer of timers)clearTimeout(timer);server.closeAllConnections();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
