// Production Expo export -> controlled HTTP -> original SaaS SQL in PGlite. Synthetic data only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),http=require('node:http');
const {fixture}=require('./admin-test-fixture.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// All Auth/Storage requests stay in the controlled origin; no real Supabase sessions.
(async()=>{
 const f=await fixture({quota:true});let queue=Promise.resolve(),mode='normal',releaseHeld,held=false,planMutations=0;
 const sql=(actor,query,args=[])=>{const job=queue.then(async()=>{if(actor===null)await f.db.exec('reset role');else await f.as(actor);return f.db.query(query,args)});queue=job.catch(()=>{});return job;};
 // Complete synthetic legacy study payloads for the real client replica, not just SQL schema tests.
 for(const [kind,payload] of [
  ['progress',{percentage:0.4,pageNumber:0,currentChapterId:null,cfiPosition:null}],
  ['bookmark',{chapterId:'synthetic',createdAt:1,cfiPosition:null,textPreview:'SYNTHETIC',note:'LEGACY_NOTE_CANARY'}],
  ['highlight',{chapterId:'synthetic',createdAt:1,startCfi:'synthetic-start',endCfi:'synthetic-end',highlightedText:'LEGACY_HIGHLIGHT_CANARY',colorLabel:'yellow'}],
  ['organization',{favorite:true,collections:[],tags:[],series:'',volume:null,readingStatus:'reading'}],
 ])await sql(null,'update public.user_library_items set payload=$1 where user_id=$2 and kind=$3',[payload,f.ids.user,kind]);
 const exported=path.resolve('dist'),bundle=fs.readdirSync(path.join(exported,'_expo/static/js/web')).find(n=>n.startsWith('entry-'));
 const project=fs.readFileSync(path.join(exported,'_expo/static/js/web',bundle),'utf8').match(/https:\/\/([a-z0-9-]+)\.supabase\.co/)[1];
 const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://fixture'),json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(u.pathname.startsWith('/fixture/')){
   let actor;try{actor=JSON.parse(Buffer.from((req.headers.authorization??'').split('.')[1],'base64url')).sub}catch{}if(!actor){json({},401);return;}
   const chunks=[];for await(const c of req)chunks.push(c);const args=JSON.parse(Buffer.concat(chunks).toString()||'{}');
   const name=u.pathname.split('/').pop();
   if(name.startsWith('saas_')&&['401','403','404'].includes(mode)){json({},Number(mode));return;}
   if(name==='saas_account_snapshot'&&mode==='invalid'){json({version:1,userId:'foreign'});return;}
   if(name==='saas_account_snapshot'||name==='saas_quota_snapshot'){
    const result=(await sql(actor,'select public.'+name+'() as r')).rows[0].r;
    if(mode==='hold'&&name==='saas_account_snapshot'&&actor===f.ids.user){held=true;await new Promise(r=>releaseHeld=r);}
    json(result);return;
   }
   if(name==='saas_plans'){json((await sql(actor,'select * from public.saas_plans where available order by id')).rows);return;}
   if(name==='saas_plan_features'){json((await sql(actor,'select plan_id,feature,enabled from public.saas_plan_features')).rows);return;}
   if(name==='user_library_items'){json((await sql(actor,'select * from public.user_library_items where revision>$1 order by revision limit 500',[Number((u.searchParams.get('revision')??'gt.0').slice(3))])).rows);return;}
   if(name==='library_apply'){json((await sql(actor,'select public.library_apply($1,$2,$3,$4,$5,$6,$7) as r',[args.p_operation_id,args.p_book_id,args.p_kind,args.p_entity_id,args.p_expected_revision,args.p_payload,args.p_deleted])).rows[0].r);return;}
   if(name==='aldus_admin_session'){try{json((await sql(actor,'select public.aldus_admin_session() as r')).rows[0].r)}catch{json({},403)}return;}
   if(name==='aldus_app_notice'){json('');return;}
   if(name.startsWith('saas_')||name.startsWith('aldus_admin_change'))planMutations++;
   json({},404);return;
  }
  let file=path.resolve(exported,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(exported+path.sep)){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(exported,u.pathname==='/'?'index.html':'app.html');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]??'application/octet-stream');fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({code:e.code??'fixture'}));}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'aldus-saas-browser-')),shots=path.resolve('.expo/saas-stage3-web');fs.mkdirSync(shots,{recursive:true});
 const chromeLog=fs.openSync(path.join(shots,'chromium.log'),'a');
 const chrome=cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--window-size=1440,1000','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore',chromeLog]});fs.closeSync(chromeLog);let client;
 try{
  let port;for(let i=0;i<300;i++){if(chrome.exitCode!==null)throw Error('Chromium exited; inspect ignored chromium.log');const p=path.join(profile,'DevToolsActivePort');if(fs.existsSync(p)){port=fs.readFileSync(p,'utf8').split('\n')[0];break;}await wait(100)}assert.ok(port);
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();client=await cdp(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await client.command('Page.enable');await client.command('Runtime.enable');
  await client.command('Page.addScriptToEvaluateOnNewDocument',{source:`if(window.top===window){
   const ids=${JSON.stringify(f.ids)},key='sb-${project}-auth-token';let identity=localStorage.getItem('fixture-identity')||'owner';
   const session=name=>{const id=ids[name],user={id,aud:'authenticated',role:'authenticated',email:name+'@aldus.example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{plan:'pro'},created_at:new Date().toISOString()};return {access_token:[btoa('{"alg":"HS256"}'),btoa(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+86400})),'fixture-signature'].join('.'),refresh_token:'fixture',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user};};
   localStorage.setItem(key,JSON.stringify(session(identity)));
   window.fixtureSwitch=name=>{identity=name;localStorage.setItem('fixture-identity',name);const s=session(name);localStorage.setItem(key,JSON.stringify(s));const channel=new BroadcastChannel(key);channel.postMessage({event:'SIGNED_IN',session:s});setTimeout(()=>channel.close(),500);};
   const original=window.fetch.bind(window);window.fetch=(input,options)=>{const url=typeof input==='string'?input:input.url;
    if(url.includes('/auth/v1/user'))return Promise.resolve(new Response(JSON.stringify(session(identity).user)));
    if(url.includes('/auth/v1/token'))return Promise.resolve(new Response(JSON.stringify(session(identity))));
    if(url.includes('/rest/v1/profiles'))return Promise.resolve(new Response(JSON.stringify({id:ids[identity],username:'synthetic_'+identity,display_name:'Homologacao '+identity,role:'user',account_status:'active'})));
    if(url.includes('/rest/v1/user_feature_overrides'))return Promise.resolve(new Response('[]'));
    if(url.includes('.supabase.co/')){if(localStorage.getItem('fixture-offline'))return Promise.reject(Error('synthetic offline'));const u=new URL(url);return original(location.origin+'/fixture'+u.pathname+u.search,options);}
    if(/^https?:/.test(url)&&!url.startsWith(location.origin))return Promise.reject(Error('External requests blocked'));return original(input,options);
   };
   document.addEventListener('DOMContentLoaded',()=>{const e=document.createElement('div');e.textContent='HOMOLOGAÇÃO LOCAL · DADOS SINTÉTICOS · SEM CONTRATAÇÃO';e.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:2147483647;pointer-events:none;background:#663c00;color:white;padding:4px;font:12px sans-serif';document.body.append(e);});
  }`});
  const text=()=>client.evaluate('document.body?.innerText??""');
  const until=async s=>{for(let i=0;i<450;i++){if((await text()).includes(s))return;await wait(100)}throw Error('Missing '+s+': '+(await text()).slice(0,1600));};
  const click=async label=>{for(let i=0;i<100;i++){if(await client.evaluate(`(()=>{const e=[...document.querySelectorAll('[role=button]')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)});if(!e||e.getAttribute('aria-disabled')==='true'||e.hasAttribute('disabled'))return false;e.click();return true;})()`))return;await wait(100)}throw Error('Button missing '+label)};
  const navigate=async p=>{await client.command('Page.navigate',{url:origin+p});};
  const screenshot=async name=>{const png=await client.command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(shots,name+'.png'),Buffer.from(png.data,'base64'));};
  const refresh=async()=>{await click('Atualizar plano e consumo');await until('Fonte: servidor autenticado')};
  const switchTo=async name=>{await client.evaluate('window.fixtureSwitch('+JSON.stringify(name)+')');await wait(200);await navigate('/plan');await until('Fonte: servidor autenticado')};
  await navigate('/settings');await until('Meu Plano');assert.ok(!(await text()).includes('Abrir Aldus Admin'));
  await click('Meu Plano');await until('O plano Gratuito é permanente');await until('Fonte: servidor autenticado');assert.ok((await text()).includes('0 bytes'));await screenshot('free-desktop');
  await click('Comparar Planos');await until('Preço ainda não disponível');await until('500 MiB');await until('10 GiB');
  assert.ok(await client.evaluate(`(()=>{const e=document.querySelector('[aria-label="Contratação ainda indisponível"]');return !!e&&e.getAttribute('aria-disabled')==='true'})()`));
  assert.ok(!(await text()).includes('LEGACY_PRIVATE_CANARY'));assert.ok((await text()).replace(/\s/g,'').includes('R$0,00'));await screenshot('compare-desktop');
  await sql(null,"update public.saas_plans set price_brl_centavos=3490,annual_brl_centavos=34900 where id='pro'");await click('Atualizar catálogo');await until('34,90');await until('349,00');await until('Valor mensal de catálogo, apenas informativo.');
  await client.command('Emulation.setDeviceMetricsOverride',{width:360,height:780,deviceScaleFactor:1,mobile:true});await screenshot('compare-mobile');assert.ok(await client.evaluate('document.documentElement.scrollWidth<=innerWidth+2'));
  await client.command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});await screenshot('compare-light');
  await click('Meu Plano');await until('Fonte: servidor autenticado');await switchTo('user');await until('Plano efetivo · Pro');await until('Origem da concessão: administração do Aldus.');assert.ok(!(await text()).includes('LEGACY_PRIVATE_CANARY'));await screenshot('pro-mobile');
  mode='hold';await click('Atualizar plano e consumo');for(let i=0;i<100&&!held;i++)await wait(50);assert.ok(held);await until('Consultando plano e consumo');mode='normal';await switchTo('owner');await until('O plano Gratuito é permanente');releaseHeld();await wait(300);assert.ok(!(await text()).includes('Plano efetivo · Pro'));
  await switchTo('user');await until('Plano efetivo · Pro');
  const objectPath=f.ids.user+'/legacy/'+ 'b'.repeat(64)+'.epub';
  const metadata=async value=>{await sql(null,'alter table storage.objects disable trigger user');try{await sql(null,'update storage.objects set metadata=$1 where name=$2',[value,objectPath])}finally{await sql(null,'alter table storage.objects enable trigger user')}};
  await metadata({});await refresh();await until('Espaço disponível: Em verificação');assert.ok(await client.evaluate(`document.querySelector('[aria-label="Armazenamento utilizado"]').getAttribute('aria-valuetext')==='Em verificação'`));await client.evaluate(`document.querySelector('[aria-label="Armazenamento utilizado"]').scrollIntoView({block:'center'})`);await screenshot('unknown-usage');
  await metadata({size:524288001});await sql(null,"update public.saas_account_subscriptions set plan_id='free' where user_id=$1",[f.ids.user]);await refresh();await until('Consumo acima da franquia atual.');assert.ok((await text()).includes('1 envio reservado')===false);await client.evaluate(`[...document.querySelectorAll('[role=alert]')].find(e=>e.textContent.includes('Consumo acima')).scrollIntoView({block:'center'})`);await screenshot('downgrade-overage');
  await metadata({size:524288000});await refresh();await until('Franquia atingida.');await metadata({size:5});await sql(f.ids.user,'select public.saas_reserve_upload($1,123)',[f.ids.user+'/legacy/'+'c'.repeat(64)+'.epub']);await refresh();await until('1 envio reservado');
  await sql(null,"update public.saas_account_subscriptions set plan_id='pro',status='expired' where user_id=$1",[f.ids.user]);await refresh();await until('Estado da assinatura · Expirada');await until('A concessão de Pro não está vigente.');
  for(const [m,ready] of [['invalid','Os dados recebidos estão incompletos'],['401','Sua sessão precisa ser validada'],['403','O servidor não autorizou'],['404','O serviço de planos não está disponível']]){mode=m;await click('Atualizar plano e consumo');await until(ready);assert.ok(!(await text()).includes('Plano efetivo ·'));mode='normal';await click('Tentar novamente');await until('Fonte: servidor autenticado');}
  await client.evaluate('localStorage.setItem("fixture-offline","1")');await click('Atualizar plano e consumo');await until('Verifique sua conexão');assert.ok(!(await text()).includes('Plano efetivo ·'));await client.evaluate('localStorage.removeItem("fixture-offline")');await click('Tentar novamente');await until('Fonte: servidor autenticado');
  await client.command('Network.enable');await client.command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await until('Verifique sua conexão');assert.ok(!(await text()).includes('Plano efetivo ·'));await client.command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await until('Fonte: servidor autenticado');
  // Real keyboard focus/activation, AX tree, narrow reflow and enlarged text.
  await client.evaluate(`document.querySelector('[aria-label="Atualizar plano e consumo"]').focus()`);await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await client.evaluate('document.activeElement.getAttribute("aria-label")'),'Comparar Planos');
  await client.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await client.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await until('Catálogo anual:');
  const ax=await client.command('Accessibility.getFullAXTree');assert.ok(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Contratação ainda indisponível'));
  await client.evaluate(`document.querySelectorAll('[dir=auto]').forEach(e=>{const s=getComputedStyle(e);e.style.fontSize=(parseFloat(s.fontSize)*1.5)+'px';e.style.lineHeight='1.5'})`);assert.ok(await client.evaluate('document.documentElement.scrollWidth<=innerWidth+2'));assert.ok(await client.evaluate(`(()=>{const e=[...document.querySelectorAll('div')].find(e=>e.scrollHeight>e.clientHeight+50&&/auto|scroll/.test(getComputedStyle(e).overflowY));if(!e)return false;e.scrollTop=e.scrollHeight;return e.scrollTop>0})()`));await screenshot('compare-large-text');
  await navigate('/plan');await until('Fonte: servidor autenticado');await click('Gerenciar minha biblioteca');await until('Sua Biblioteca');
  await navigate('/admin');await until('Acesso administrativo indisponível');assert.equal(planMutations,0);
  console.log('PASS Stage 3 Chromium: settings/library navigation, Free/Pro, catalog prices/unavailable purchase, actual SQL quotas, zero/unknown/exact/over/reserved use, administrative expiry, Auth A-B-A with guarded navigation and late response, 401/403/missing/invalid/offline plus real browser reconnect recovery, keyboard/AX, desktop/360px/light/dark/large text; Pro denied Admin. Synthetic Auth/HTTP, no managed-service or Android proof.');
 }finally{releaseHeld?.();client?.close();chrome.kill();server.closeAllConnections();await new Promise(r=>server.close(r));await queue;await f.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
async function cdp(url){const socket=new WebSocket(url);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});const pending=new Map();let id=0;socket.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(m.method==='Runtime.exceptionThrown')console.error('BROWSER_EXCEPTION',m.params.exceptionDetails.exception?.description?.slice(0,500)||m.params.exceptionDetails.text);if(p){pending.delete(m.id);m.error?p.j(Error(m.error.message)):p.r(m.result);}});const command=(method,params={})=>new Promise((r,j)=>{pending.set(++id,{r,j});socket.send(JSON.stringify({id,method,params}));});return{command,close:()=>socket.close(),evaluate:async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}};}
