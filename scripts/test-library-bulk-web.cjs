const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),http=require('http'),assert=require('assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 cp.execFileSync(process.execPath,['scripts/build-library-bulk-web-fixture.cjs'],{stdio:'inherit'});
 const out=path.resolve('.expo/cycle2-library-web');
 const server=http.createServer((req,res)=>{if(req.url==='/matrix.js'){res.setHeader('Content-Type','text/javascript');fs.createReadStream(path.join(out,'matrix.js')).pipe(res)}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%}*{box-sizing:border-box}#root{display:flex}</style><div id="root"></div><script src="/matrix.js"></script></html>')}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'aldus-library-bulk-')),chrome=cp.spawn(require('./browser-path.cjs').browserPath(),['--headless=new','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','about:blank'],{windowsHide:true,stdio:'ignore'});let ws;
 try{
  let port;for(let i=0;i<120;i++){try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];if(port)break}catch{}await wait(150)}assert(port);
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
  let id=0;const pending=new Map(),errors=[];ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text)};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
  const click=async label=>{await evaluate(`(()=>{const e=[...document.querySelectorAll('[role="button"],[role="checkbox"]')].find(e=>(e.getAttribute('aria-label')===${JSON.stringify(label)}||e.textContent===${JSON.stringify(label)})&&e.getBoundingClientRect().height>0);if(!e)throw Error('Missing '+${JSON.stringify(label)});if(e.getAttribute('aria-disabled')==='true')throw Error('Disabled '+${JSON.stringify(label)});e.click()})()`);await wait(100)};
  const input=async(label,value)=>{await evaluate(`(()=>{const e=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');if(!e)throw Error('Missing input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await wait(60)};
  const screenshot=async name=>{fs.writeFileSync(path.join(out,name+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))};
  await send('Runtime.enable');await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});await wait(1300);
  const results=[];
  for(const width of [320,390,768,1440])for(const dark of [false,true]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
   if(await evaluate('window.fixture.dark')!==dark)await click(dark?'Mudar para tema escuro':'Mudar para tema claro');await wait(200);
   const state=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,cards:document.querySelectorAll('[aria-label^="Abrir Livro sintético"]').length,first:document.querySelector('[aria-label^="Abrir Livro sintético"]')?.getBoundingClientRect().width})`);
   assert.equal(state.overflow,false);assert(state.cards>0);assert(state.first>120&&state.first<400);results.push({width,dark,...state});await screenshot('library-'+width+'-'+(dark?'dark':'light'));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await send('Emulation.setTouchEmulationEnabled',{enabled:true});await wait(200);await click('Selecionar livros');
  let labels=await evaluate(`[...document.querySelectorAll('[role="checkbox"]')].slice(0,2).map(e=>e.getAttribute('aria-label'))`);assert.equal(labels.length,2);
  // Real mouse then touch input on the rendered checkbox controls.
  const point=async label=>evaluate(`(()=>{const e=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+30}})()`);
  let p=await point(labels[0]);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
  p=await point(labels[1]);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,radiusX:1,radiusY:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(120);
  await screenshot('selected-before-apply');fs.writeFileSync(path.join(out,'selection-dom.json'),JSON.stringify(await evaluate(`[...document.querySelectorAll('[role="checkbox"]')].map(e=>({role:e.role,checked:e.getAttribute('aria-checked'),html:e.outerHTML.slice(0,600)}))`),null,2));assert.equal(await evaluate(`document.body.textContent.includes('2 selecionados')`),true);
  await click('Organizar seleção');await input('Nome da coleção','Pesquisa');await screenshot('bulk-mobile');await click('Aplicar à seleção');await wait(200);
  let records=await evaluate('window.fixture.records()');assert.equal(Object.values(records).filter(r=>r.collections.includes('Pesquisa')).length,2);
  await click('Coleções');await click('Renomear coleção Pesquisa');await input('Novo nome da coleção','Leituras');await click('Confirmar novo nome');await wait(200);
  records=await evaluate('window.fixture.records()');assert.equal(Object.values(records).filter(r=>r.collections.includes('Leituras')).length,2);assert.equal(Object.values(records).some(r=>r.collections.includes('Pesquisa')),false);
  await evaluate(`window.fixture.switchAccount('B')`);await wait(200);assert.equal(await evaluate(`document.body.textContent.includes('Leituras')`),false);assert.deepEqual(await evaluate('window.fixture.records()'),{});
  await evaluate(`window.fixture.switchAccount('A')`);await wait(200);assert.equal(Object.keys(await evaluate('window.fixture.records()')).length,2);
  await click('Leituras');await click('Selecionar livros');await click('Selecionar resultados');await click('Organizar seleção');
  await click('Remover da coleção');await input('Nome da coleção','Leituras');await click('Aplicar à seleção');await wait(200);
  assert(Object.values(await evaluate('window.fixture.records()')).every(record=>record.collections.length===0));
  assert.equal(await evaluate(`document.body.textContent.includes('Nenhum livro encontrado')`),false,'removing final collection member resets the obsolete filter');
  await send('Page.reload');await wait(500);assert.equal(Object.keys(await evaluate('window.fixture.records()')).length,2,'actual localStorage survives reopen');
  await evaluate('window.fixture.resize(1000)');await wait(250);const rendered=await evaluate(`document.querySelectorAll('[aria-label^="Abrir Livro sintético"]').length`);assert(rendered<200,'virtualization must not render all 1000 books');
  await click('Selecionar livros');await evaluate(`document.querySelector('[role="checkbox"]').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',text:' ',windowsVirtualKeyCode:32});await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});await wait(100);assert.equal(await evaluate(`document.querySelectorAll('[role="checkbox"][aria-checked="true"]').length`),1,'keyboard selects');
  await evaluate(`document.querySelectorAll('#root [dir="auto"]').forEach(e=>{e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*1.3)+'px'})`);await screenshot('bulk-large-text');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'Real Library/modal/card and repositories, synthetic metadata and Auth boundaries; no remote service or Android claim',layouts:results,mouse:true,touch:true,keyboard:true,collections:true,accountIsolation:true,reopen:true,largeLibraryRendered:rendered},null,2));console.log('PASS Library Chromium: 8 responsive/theme layouts, actual mouse/touch/keyboard, bulk create/rename, A/B isolation, reopen and 1000-book virtualization.');
 }finally{ws?.close();chrome.kill();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
