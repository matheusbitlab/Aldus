// Exported application in Chromium. Every Supabase request is intercepted with
// synthetic Auth/catalog responses; no production accounts, writes or telemetry.
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),cp=require('child_process'),assert=require('assert/strict');
const {initialCatalogReference:plans}=require('./community-test-loader.cjs')()('src/marketing/catalogReference.generated.ts');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function cdp(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});let id=0;const jobs=new Map(),errors=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);const j=jobs.get(m.id);if(j){jobs.delete(m.id);m.error?j.reject(Error(m.error.message)):j.resolve(m.result);}});const command=(method,params={})=>new Promise((resolve,reject)=>{jobs.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});return{command,errors,close:()=>ws.close(),evaluate:async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}};}
(async()=>{
 const dist=path.resolve('dist'),shots=path.resolve('.expo/marketing-validation');fs.mkdirSync(shots,{recursive:true});
 const bundle=fs.readFileSync(path.join(dist,'_expo/static/js/web',fs.readdirSync(path.join(dist,'_expo/static/js/web')).find(n=>n.startsWith('entry-'))),'utf8');
 const project=bundle.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)?.[1];assert.ok(project);
 const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(dist,'.'+pathname);if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(dist,pathname==='/'?'index.html':'app.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.json':'application/json','.txt':'text/plain'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);}catch{res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'aldus-marketing-browser-'));
 const chrome=cp.spawn(process.env.SOURCE_LIBRARY_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--window-size=1440,1000',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});let client;
 try{
  let port;for(let i=0;i<150;i++){const file=path.join(profile,'DevToolsActivePort');if(fs.existsSync(file)){port=fs.readFileSync(file,'utf8').split('\n')[0];break;}await wait(100);}assert.ok(port,'Chromium CDP unavailable');
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json();client=await cdp(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await client.command('Page.enable');await client.command('Runtime.enable');
  await client.command('Page.addScriptToEvaluateOnNewDocument',{source:`if(window.top===window){
   window.fixtureRemotePaths=[];const key='sb-${project}-auth-token',signedIn=localStorage.getItem('fixture-marketing-user')==='yes';
   const user={id:'99999999-9999-4999-8999-999999999999',aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{role:'OWNER',plan:'pro'}};
   const session={access_token:[btoa('{"alg":"HS256"}'),btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+86400})),'fixture-signature'].join('.'),refresh_token:'fixture-only',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user};
   if(signedIn)localStorage.setItem(key,JSON.stringify(session));else localStorage.removeItem(key);
   const plans=${JSON.stringify(plans)};
   const original=window.fetch.bind(window);window.fetch=(input,options)=>{const url=typeof input==='string'?input:input.url;if(!url.includes('.supabase.co/'))return original(input,options);const p=new URL(url).pathname;window.fixtureRemotePaths.push(p);const respond=(data,status=200)=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));
    if(p==='/auth/v1/user')return respond(user);if(p==='/auth/v1/token')return respond(session);
    if(p.includes('/profiles'))return respond({id:user.id,username:'synthetic',display_name:'Conta sintética',role:'user',account_status:'active'});
    if(p.includes('/user_feature_overrides'))return respond([]);
    if(p==='/rest/v1/saas_plans')return respond(plans.map(p=>({id:p.id,name:p.name,available:true,price_brl_centavos:p.priceBrlCentavos,annual_brl_centavos:null,synced_books:Number(localStorage.getItem('fixture-catalog-books')||p.limits.syncedBooks),storage_bytes:p.limits.storageBytes})));
    if(p==='/rest/v1/saas_plan_features')return respond(plans.flatMap(p=>Object.entries(p.features).map(([feature,enabled])=>({plan_id:p.id,feature,enabled}))));
    return respond({message:'Synthetic unavailable or forbidden'},p.includes('aldus_admin')?403:503);
   };
  }`});
  const text=()=>client.evaluate('document.body.innerText');
  const until=async(predicate,label)=>{for(let i=0;i<250;i++){try{if(await client.evaluate(`!!document.body && (${predicate})`))return;}catch(error){if(!/Execution context was destroyed|Cannot find context|Inspected target navigated/.test(error.message))throw error;}await wait(100);}throw Error('Missing '+label+': '+(await text()).slice(0,700));};
  const landing=()=>until('!!document.querySelector("[data-landing-interactive]")','interactive landing');
  const navigate=async route=>{await client.command('Page.navigate',{url:origin+route});};
  const shot=async name=>{await wait(250);const r=await client.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(shots,name+'.png'),Buffer.from(r.data,'base64'));};
  await client.command('Emulation.setScriptExecutionDisabled',{value:true});await navigate('/');
  await until('!!document.querySelector("[data-aldus-landing] h1")','indexable HTML without JavaScript');
  assert.ok(!(await client.evaluate('!!document.querySelector("[data-landing-interactive]")')));
  await client.command('Emulation.setScriptExecutionDisabled',{value:false});await navigate('/');await landing();await wait(900);
  assert.match(await text(),/Muito mais que/);assert.match(await text(),/Referência inicial do catálogo/);
  assert.ok(await client.evaluate('document.querySelector("[data-aldus-landing]").getBoundingClientRect().width>innerWidth*.9'),'Public page must use browser width');
  assert.equal((await client.evaluate('window.fixtureRemotePaths')).length,0,'Anonymous landing cannot query Supabase');
  await shot('landing-desktop');
  await client.evaluate('document.getElementById("preview-tab-reader").click()');await until('!!document.querySelector(".al-demo-reader")','interactive Reader preview');
  await client.evaluate('[...document.querySelectorAll(".al-theme-buttons button")].find(b=>b.textContent==="Escuro").click()');assert.ok(await client.evaluate('!!document.querySelector(".al-demo-theme-dark")'));
  await client.evaluate('document.getElementById("preview-tab-reader").focus()');await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});await until('!!document.querySelector(".al-demo-study")','keyboard preview tabs');
  await client.evaluate('document.getElementById("preview-tab-library").click();document.activeElement.blur()');
  for(const [width,height]of [[320,800],[360,800],[430,932],[768,1024],[1024,800],[1440,1000],[1920,1080]]){
   await client.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<850});await wait(250);
   const result=await client.evaluate('({width:innerWidth,document:document.documentElement.scrollWidth,scroll:document.querySelector("[data-landing-interactive]").scrollWidth,client:document.querySelector("[data-landing-interactive]").clientWidth})');
   assert.ok(result.document<=result.width+2&&result.scroll<=result.client+2,'No horizontal scroll '+JSON.stringify(result));
   if(width===360){await shot('landing-mobile-360');await client.evaluate('document.querySelector(".al-mobile-menu summary").click()');assert.ok(await client.evaluate('document.querySelector(".al-mobile-menu").open'));await shot('landing-mobile-menu');await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape'});assert.equal(await client.evaluate('document.querySelector(".al-mobile-menu").open'),false);
    await client.evaluate('document.querySelector(".al-mobile-menu summary").click();[...document.querySelectorAll(".al-mobile-menu nav a")].find(a=>a.getAttribute("href")==="#recursos").click()');await until('location.hash==="#recursos"&&!document.querySelector(".al-mobile-menu").open','mobile anchor and menu close');await wait(800);await shot('landing-mobile-resources');
    await client.evaluate('document.getElementById("planos").scrollIntoView()');await wait(800);await shot('landing-mobile-plans');
    await client.evaluate('document.querySelector("[data-landing-interactive]").scrollTop=0');
   }
   if(width===768)await shot('landing-tablet');
  }
  await client.command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await client.command('Page.bringToFront');await client.evaluate('document.querySelector(".al-faq summary").focus()');
  assert.ok(await client.evaluate('document.activeElement===document.querySelector(".al-faq summary")'),'FAQ focus before key');
  await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await until('document.querySelector(".al-faq details").open','native FAQ keyboard');
  await client.evaluate('document.getElementById("planos").scrollIntoView()');await wait(900);assert.equal(await client.evaluate('getComputedStyle(document.querySelector("[data-reveal][data-visible=true]")).opacity'),'1');await shot('landing-plans');
  assert.ok(await client.evaluate('document.querySelector(".al-plan-pro button").disabled'),'No fake purchase');
  await client.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await navigate('/');await landing();
  assert.equal(await client.evaluate('getComputedStyle(document.querySelector(".al-float-note")).animationName'),'none');
  await client.evaluate('document.querySelector(".al-skip").focus()');await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.ok(await client.evaluate('document.activeElement.matches("a,button,summary")'));
  await client.command('Accessibility.enable');const ax=await client.command('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='heading'&&n.name?.value.includes('Muito mais')));
  await client.evaluate('document.querySelector(".al-header-actions a").click()');await until('location.pathname.includes("/auth/login") && !!document.querySelector("input")','real login route');
  await navigate('/');await landing();await client.evaluate('document.querySelector(".al-hero-actions a").click()');await until('location.pathname.includes("/auth/signup") && !!document.querySelector("input")','real signup route');
  await navigate('/reader/private-canary');await landing();assert.ok(!(await text()).includes('PRIVATE_CONTENT_CANARY'));
  await navigate('/admin');await landing();assert.ok(!(await text()).includes('Usuários cadastrados'));
  await client.evaluate('localStorage.setItem("fixture-marketing-user","yes");localStorage.setItem("fixture-catalog-books","137")');await navigate('/');await landing();await until('document.body.innerText.includes("Catálogo consultado com sua sessão")','authenticated catalog');assert.match(await text(),/137/);assert.ok(await client.evaluate('document.querySelector(".al-hero-actions a").getAttribute("href")==="/library"'));
  assert.ok(!(await client.evaluate('window.fixtureRemotePaths')).some(p=>p.includes('aldus_admin')||p.includes('saas_account_snapshot')||p.includes('saas_quota_snapshot')),'Marketing reads catalog only');
  await client.evaluate('document.querySelector(".al-hero-actions a").click()');await until('document.body.innerText.includes("Sua Biblioteca")','authenticated Library route');
  await navigate('/admin');await until('document.body.innerText.includes("Acesso administrativo indisponível")','ordinary user direct admin denied');assert.ok(!(await text()).includes('Usuários cadastrados'));
  assert.deepEqual(client.errors,[],'No browser runtime exceptions');
  console.log('PASS Chromium public landing, full-width 320/360/430/768/1024/1440/1920 layouts, menu/Escape, tabs/arrows/theme, FAQ keyboard, AX/skip focus, scroll reveal/reduced motion, real login/signup/library navigation, authenticated catalog changes, protected route and metadata-role admin denial; all HTTP/Auth synthetic, production blocked. Screenshots .expo/marketing-validation.');
 }finally{client?.close();chrome.kill();await wait(500);server.closeAllConnections();await new Promise(r=>server.close(r));if(fs.existsSync(profile)&&path.dirname(fs.realpathSync(profile)).toLowerCase()===fs.realpathSync(os.tmpdir()).toLowerCase()&&path.basename(profile).startsWith('aldus-marketing-browser-'))try{fs.rmSync(profile,{recursive:true,maxRetries:5,retryDelay:100})}catch{}}
})().catch(e=>{console.error(e);process.exitCode=1;});
