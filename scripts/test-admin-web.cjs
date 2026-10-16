// Exported Expo app -> controlled HTTP -> actual isolated PostgreSQL/PGlite migrations.
// Auth/session/TOTP are fixture identities, never real Supabase accounts or verified JWTs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),http=require('node:http');
const {fixture}=require('./admin-test-fixture.cjs');
const crypto=require('node:crypto'),TOTP=require('./saas-test-totp.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function cdp(url){const socket=new WebSocket(url);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});const pending=new Map();let id=0;socket.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(m.method==='Runtime.exceptionThrown')console.error('BROWSER_EXCEPTION',m.params.exceptionDetails.exception?.description?.slice(0,500)||m.params.exceptionDetails.text);if(p){pending.delete(m.id);m.error?p.j(Error(m.error.message)):p.r(m.result);}});const command=(method,params={})=>new Promise((r,j)=>{pending.set(++id,{r,j});socket.send(JSON.stringify({id,method,params}));});return{command,close:()=>socket.close(),evaluate:async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;}};}
(async()=>{
 const f=await fixture({quota:true});await f.db.query('select aldus_admin_private.bootstrap_owner($1,$2)',[f.ownerEmail,f.ids.owner]);
 await f.as('owner');assert.equal((await f.change('member','admin',0,{role:'ADMIN',active:true,permissions:['users.read','metrics.read']})).ok,true);
 const exported=path.resolve('dist'),bundleName=fs.readdirSync(path.join(exported,'_expo/static/js/web')).find(n=>n.startsWith('entry-'));
 const bundle=fs.readFileSync(path.join(exported,'_expo/static/js/web',bundleName),'utf8'),project=bundle.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);assert.ok(project);
 // The pre-existing public legal contact can equal the bootstrap email. Authorization
 // must not use that address; the admin-specific source/transport suite checks this.
 let queue=Promise.resolve(),mutations=0,mfaReady=false;const challenges=new Map();
 await f.db.exec('reset role');await f.db.query("update auth.mfa_factors set status='unverified' where user_id=$1",[f.ids.owner]);
 const enqueue=task=>{const current=queue.then(task);queue=current.catch(()=>{});return current};
 const server=http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://fixture');const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))};
  if(u.pathname.startsWith('/fixture/auth/factors')){
   const uid=u.searchParams.get('uid');if(uid!==f.ids.owner){json({},403);return;}
   const chunks=[];for await(const c of req)chunks.push(c);const args=JSON.parse(Buffer.concat(chunks).toString()||'{}');
   if(u.pathname.endsWith('/challenge')){const id=crypto.randomUUID();challenges.set(id,Date.now()+60000);json({id,type:'totp',expires_at:Math.floor(Date.now()/1000)+60});return;}
   if(u.pathname.endsWith('/verify')){
    if((challenges.get(args.challenge_id)??0)<Date.now()||!TOTP.verify(args.code)){challenges.delete(args.challenge_id);json({msg:'SYNTHETIC invalid TOTP',code:'mfa_verification_failed'},400);return;}
    challenges.delete(args.challenge_id);await enqueue(async()=>{await f.db.exec('reset role');await f.db.query("update auth.mfa_factors set status='verified' where user_id=$1",[uid]);});mfaReady=true;
    const user={id:uid,aud:'authenticated',role:'authenticated',email:f.ownerEmail,email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString(),factors:[{id:uid,factor_type:'totp',status:'verified'}]};
    const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,session_id:uid,aal:'aal2',exp:Math.floor(Date.now()/1000)+86400})).toString('base64url'),'fixture-signature'].join('.');
    json({access_token:token,refresh_token:'fixture-only',token_type:'bearer',expires_in:86400,user});return;
   }
   json({id:uid,type:'totp',totp:{secret:TOTP.secret,uri:'otpauth://totp/ALDUS_SYNTHETIC?secret='+TOTP.secret,qr_code:'<svg/>'}});return;
  }
  if(u.pathname.startsWith('/fixture/rpc/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const args=JSON.parse(Buffer.concat(chunks).toString()||'{}');
   let claims;try{claims=JSON.parse(Buffer.from((req.headers.authorization??'').split('.')[1],'base64url'))}catch{}
   const name=u.pathname.split('/').pop(),user=Object.keys(f.ids).find(key=>f.ids[key]===claims?.sub);
   if(!user){json({},401);return;}
   await enqueue(async()=>{await f.as(user,user!=='owner'||mfaReady);try{
    let result;if(name==='aldus_admin_session')result=await f.session();
    else if(name==='aldus_admin_read')result=await f.read(args.p_section,args.p_filters);
    else if(name==='aldus_admin_change'){mutations++;result=await f.change(args.p_action,args.p_target,args.p_expected_revision,args.p_payload,{requestId:args.p_request_id,reason:args.p_reason,confirmation:args.p_confirmation});if(!result.ok)console.log('SYNTHETIC_CHANGE_REJECTED',JSON.stringify({action:args.p_action,expectedRevision:args.p_expected_revision,code:result.code}));}
    else if(name==='aldus_app_notice')result=(await f.db.query('select public.aldus_app_notice() as v')).rows[0].v;
    else{json({},404);return;}if(name==='aldus_admin_read'&&mutations>0)await wait(150);json(result);
   }catch(error){json({code:error.code??'42501'},403);}});return;
  }
  let target=path.resolve(exported,'.'+decodeURIComponent(u.pathname));if(!target.startsWith(exported+path.sep)){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(target)||fs.statSync(target).isDirectory())target=path.join(exported,u.pathname==='/'?'index.html':'app.html');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg'})[path.extname(target)]??'application/octet-stream');fs.createReadStream(target).pipe(res);
 }catch(error){console.error(error);res.writeHead(500);res.end('Local fixture error')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'aldus-admin-browser-')),shots=path.resolve('.expo/admin-validation');fs.mkdirSync(shots,{recursive:true});
 const chrome=cp.spawn(process.env.SOURCE_LIBRARY_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--window-size=1440,1000',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});let client;
 try{
  let port;for(let i=0;i<100;i++){const file=path.join(profile,'DevToolsActivePort');if(fs.existsSync(file)){port=fs.readFileSync(file,'utf8').split('\n')[0];break;}await wait(100);}assert.ok(port,'Chrome CDP must start');
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json();client=await cdp(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await client.command('Page.enable');await client.command('Runtime.enable');
  await client.command('Page.addScriptToEvaluateOnNewDocument',{source:`if(window.top===window){
   document.addEventListener('DOMContentLoaded',()=>{const banner=document.createElement('div');banner.textContent='HOMOLOGAÇÃO LOCAL — DADOS SINTÉTICOS — AUTH/STORAGE CONTROLADOS';banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#663c00;color:white;font:12px sans-serif;padding:5px;pointer-events:none';document.body.appendChild(banner);});
   const ids=${JSON.stringify(f.ids)},identity=localStorage.getItem('fixture-admin-identity')||'owner',uid=ids[identity];
   const user={id:uid,aud:'authenticated',role:'authenticated',email:identity+'@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString(),factors:identity==='owner'&&!localStorage.getItem('fixture-totp-done')?[]:[{id:uid,factor_type:'totp',status:'verified',friendly_name:'SYNTHETIC'}]};
   const token=[btoa(JSON.stringify({alg:'HS256',typ:'JWT'})),btoa(JSON.stringify({sub:uid,aal:'aal2',exp:Math.floor(Date.now()/1000)+86400})),'fixture-signature'].join('.');
   localStorage.setItem('sb-${project[1]}-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture-only',token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,user}));
   const originalFetch=window.fetch.bind(window);window.fetch=(input,options)=>{const url=typeof input==='string'?input:input.url;
    if(url.includes('/auth/v1/factors'))return originalFetch(location.origin+'/fixture/auth/factors'+url.split('/auth/v1/factors')[1]+'?uid='+uid,options).then(response=>{if(url.endsWith('/verify')&&response.ok){localStorage.setItem('fixture-totp-done','1');user.factors=[{id:uid,factor_type:'totp',status:'verified'}];}return response;});
    if(url.includes('/auth/v1/user'))return Promise.resolve(new Response(JSON.stringify(user)));
    if(url.includes('/rest/v1/profiles'))return Promise.resolve(new Response(JSON.stringify({id:uid,username:'fixture_'+identity,display_name:'Local '+identity,role:'master',account_status:'active'})));
    if(url.includes('/rest/v1/user_feature_overrides')||url.includes('/rest/v1/user_library_items'))return Promise.resolve(new Response('[]'));
    if(url.includes('/rest/v1/rpc/aldus_')){if(localStorage.getItem('fixture-admin-offline'))return Promise.reject(Error('offline'));return originalFetch(location.origin+'/fixture/rpc/'+url.split('/').pop(),options);}
    if(url.includes('.supabase.co/'))return Promise.resolve(new Response('{}',{status:404}));
    if(/^https?:/.test(url)&&!url.startsWith(location.origin))return Promise.reject(Error('External requests blocked'));
    return originalFetch(input,options);
   };
  }`});
  const text=()=>client.evaluate('document.body?.innerText??""');
  const until=async snippet=>{const start=Date.now();while(Date.now()-start<45000){if((await text()).includes(snippet))return;await wait(100);}await shot('operation-error');throw Error('Missing '+snippet+': '+(await text()).slice(-1800));};
  const click=async label=>{const start=Date.now();while(Date.now()-start<12000){const clicked=await client.evaluate(`(()=>{const el=[...document.querySelectorAll('[role="button"]')].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)});if(!el||el.getAttribute('aria-disabled')==='true')return false;el.click();return true})()`);if(clicked)return;await wait(100);}throw Error('Enabled button missing '+label+': '+(await text()).slice(0,2000));};
  const input=(label,value)=>client.evaluate(`(()=>{const el=document.querySelector('[aria-label='+CSS.escape(${JSON.stringify(label)})+']');if(!el)throw Error('Input missing');Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const navigate=async(route,identity)=>{if(identity)await client.evaluate(`localStorage.setItem('fixture-admin-identity',${JSON.stringify(identity)})`);await client.command('Page.navigate',{url:origin+route});};
  const shot=async name=>{const png=await client.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(shots,name+'.png'),Buffer.from(png.data,'base64'));};
  const confirm=async target=>{await input('Motivo administrativo (mínimo 8 caracteres, sem dados sensíveis)','Local browser regression');await input('Digite CONFIRMAR '+target,'CONFIRMAR '+target);await click('Confirmar operação');await until('Alteração confirmada e auditada pelo servidor.');};
  await navigate('/admin');await until('Usuários cadastrados');await until('Operações críticas bloqueadas');
  await click('Configurar autenticador TOTP');await until('Código TOTP de 6 dígitos');
  const invalid=[...Array(10)].map((_,i)=>String(i).padStart(6,'0')).find(code=>!TOTP.verify(code));
  await input('Código TOTP de 6 dígitos',invalid);await click('Verificar TOTP');await until('Código não verificado');assert.equal(mfaReady,false);
  await input('Código TOTP de 6 dígitos',TOTP.totp());await click('Verificar TOTP');await until('MFA recente confirmado pelo servidor.');assert.equal(mfaReady,true);await shot('owner-desktop');
  assert.ok((await text()).includes('Aguardando integração de pagamentos'));assert.ok(!(await text()).includes('PRIVATE_CONTENT_CANARY'));
  assert.ok(await client.evaluate('!!document.querySelector(\'[data-testid="admin-sidebar"]\')'),'Desktop sidebar');
  assert.ok(!(await text()).includes('R$ 0'),'No invented financial zero');
  assert.ok(await client.evaluate('!(/\\b(OWNER|ADMIN|Free|Storage|Churn)\\b/.test(document.querySelector(\'[data-testid="admin-shell"]\').innerText))'),'Administrative labels in pt-BR');
  assert.ok(await client.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'Desktop responsive width');
  for(const [label,ready] of [['Assinaturas','Assinaturas e financeiro'],['Armazenamento','Armazenamento privado'],['Métricas','Cadastros por dia'],['Administradores','UUID da conta a promover'],['Auditoria','Auditoria administrativa'],['Saúde do Sistema','Banco de dados: conexão confirmada']]){await click(label);await until(ready);await click('Atualizar dados');await until(ready);}
  await click('Usuários');await until('Pesquisar usuários');await click('Gerenciar '+f.ids.user);await until('Informações da conta');await click('Conceder Pro temporário');await until('Digite CONFIRMAR');await confirm(f.ids.user);
  await enqueue(async()=>{await f.as('owner');const detail=await f.read('user',{id:f.ids.user});assert.equal(detail.data.subscription.grant_source,'trusted_backend');assert.ok(detail.data.subscription.ends_at);});
  await click('Revogar benefício Pro');await confirm(f.ids.user);await enqueue(async()=>{await f.as('owner');assert.equal((await f.read('user',{id:f.ids.user})).data.subscription.status,'revoked');});
  await click('Conceder Pro temporário');await confirm(f.ids.user);await click('Desativar conta');await confirm(f.ids.user);await click('Reativar conta');await confirm(f.ids.user);
  await click('Preparar concessão premium');await confirm(f.ids.user);await enqueue(async()=>{await f.as('owner');assert.equal((await f.read('user',{id:f.ids.user})).data.features.premium_future,true);});
  await click('Administradores');await until('UUID da conta a promover');await input('UUID da conta a promover',f.ids.second);await click('Conceder associação administrativa');await confirm(f.ids.second);await click('Revogar associação '+f.ids.second);await confirm(f.ids.second);
  await enqueue(async()=>{await f.as('owner');assert.equal((await f.read('members')).data.rows.find(m=>m.user_id===f.ids.second).active,false);});
  await click('Planos e Preços');await until('Nome comercial Pro');await input('Preço mensal em centavos Pro (vazio = indefinido)','3490');await input('Preço anual em centavos Pro (vazio = indefinido)','34900');await click('Salvar plano Pro');await confirm('pro');
  await enqueue(async()=>{await f.as('owner');assert.equal((await f.read('plans')).data.rows.find(p=>p.id==='pro').price_brl_centavos,3490);});
  await click('Configurações');await until('Valor app.notice');await input('Valor app.notice','Aviso controlado do painel');await click('Salvar app.notice');await confirm('app.notice');
  await navigate('/settings');await until('Aviso controlado do painel');await until('Abrir Aldus Admin');await click('Abrir Aldus Admin');await until('Usuários cadastrados');
  await click('Configurações');await until('Valor app.notice');await click('Restaurar app.notice revisão 0');await confirm('app.notice');
  await enqueue(async()=>{await f.as('owner');assert.equal((await f.read('settings')).data.rows.find(v=>v.key==='app.notice').value,'');});
  await click('Visão Geral');await until('Usuários cadastrados');
  await client.command('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:1,mobile:true});await shot('owner-mobile');
  assert.ok(await client.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'),'Mobile responsive width');
  await click('Abrir navegação');await until('Navegação administrativa');await click('Auditoria');await until('Pesquisar nesta página da auditoria');
  await navigate('/admin','admin');await until('Papel verificado: Administrador');await until('Usuários cadastrados');assert.ok(!(await text()).includes('Planos e Preços'));assert.ok(!(await text()).includes('Administradores'));await shot('delegated-admin');
  await navigate('/admin','user');await until('Acesso administrativo indisponível');assert.ok(!(await text()).includes('Usuários cadastrados'));await shot('direct-route-denied');
  await navigate('/settings','user');await until('Ajustes');await wait(500);assert.ok(!(await text()).includes('Abrir Aldus Admin'));
  await navigate('/admin','owner');await until('Usuários cadastrados');await enqueue(async()=>{await f.db.exec('reset role');await f.db.query('delete from auth.sessions where user_id=$1',[f.ids.owner]);});
  await click('Revalidar permissões');await until('Acesso administrativo indisponível');
  await client.evaluate("localStorage.setItem('fixture-admin-offline','1')");await client.command('Page.reload');await until('Acesso administrativo indisponível');assert.ok(!(await text()).includes('Usuários cadastrados'));
  assert.ok(mutations>=3);assert.equal(challenges.size,0,'Challenges consumed after successful verification');console.log('PASS exported Admin Web -> controlled HTTP -> PostgreSQL/PGlite: all ten sections, synthetic TOTP enroll/wrong/right code, owner/delegated role/Pro denial, session revocation/offline, audited Pro grant/revoke, account disable/reactivate, entitlement, admin grant/revoke, price/config/rollback forms, Settings notice and desktop/mobile. Auth and Storage are fixtures, not managed-service proof; screenshots .expo/admin-validation.');
 }finally{client?.close();chrome.kill();await wait(350);server.closeAllConnections();await new Promise(r=>server.close(r));await queue;await f.db.close();if(fs.existsSync(profile)&&path.dirname(fs.realpathSync(profile)).toLowerCase()===fs.realpathSync(os.tmpdir()).toLowerCase()&&path.basename(profile).startsWith('aldus-admin-browser-'))try{fs.rmSync(profile,{recursive:true,maxRetries:5,retryDelay:100})}catch{}}
})().catch(error=>{console.error(error);process.exitCode=1});
