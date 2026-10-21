const fs=require('fs'),assert=require('assert/strict'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const load=require('./community-test-loader.cjs')();
const {LandingDocument}=load('src/marketing/LandingDocument.tsx');
const {initialCatalogReference:plans}=load('src/marketing/catalogReference.generated.ts');
const {publicSiteUrl}=load('src/marketing/seo.ts');
const {buildPublicHtml}=require('./write-public-web.cjs');
const {resolveBookPose,bookScrollProgress}=load('src/marketing/bookMotion.ts');
const initial=renderToStaticMarkup(React.createElement(LandingDocument));
const markup=initial.replace(/<style>[\s\S]*?<\/style>/g,'');
const visible=markup.replace(/<[^>]*>/g,' ');
assert.equal((markup.match(/data-book-scene(?:=|\s|>)/g)||[]).length,1,'Exactly one principal 3D book');
for(const part of ['story','cover','spine','block'])assert.match(markup,new RegExp(`data-book-${part}(?:=|\\s|>)`),'Book geometry '+part);
assert.equal((markup.match(/data-book-leaf(?:=|\s|>)/g)||[]).length,4,'Four independent turning leaves');
assert.equal((markup.match(/class="al-book-strip al-book-strip-/g)||[]).length,16,'Each leaf has four connected physical segments');
for(let index=0;index<4;index++)assert.match(markup,new RegExp(`data-leaf-index="${index}"`));
assert.match(markup,/<[^>]*data-book-scene[^>]*aria-hidden="true"|<[^>]*aria-hidden="true"[^>]*data-book-scene/,'Visual geometry is hidden from assistive technology');
assert.match(markup,/data-book-progress="0(?:\.0+)?"/,'SSR starts closed');
assert.doesNotMatch(markup,/data-enhanced="true"|<(?:video|canvas)\b|preview-tab-/,'Static HTML cannot depend on animation or the removed preview');
assert.match(markup,/href="#experiencia"[^>]*>Pular demonstração/);
assert.match(markup,/Etapa anterior do livro/);assert.match(markup,/Próxima etapa do livro/);
for(const label of ['Sua Biblioteca','Reader','Estudo','Meu Plano','Gratuito','Pro'])assert.ok(visible.includes(label),'Readable static summary: '+label);
const closed=resolveBookPose(0),opened=resolveBookPose(1);
assert.ok(Math.abs(closed.coverAngle)<1e-8);assert.equal(opened.coverAngle,-180);assert.equal(closed.chapter,0);assert.equal(opened.chapter,5);
assert.equal(closed.leaves.length,4);assert.equal(opened.leaves.length,4);
assert.ok(closed.leaves.every(leaf=>Math.abs(leaf.angle)<1e-8&&Math.abs(leaf.curl)<1e-8));assert.ok(opened.leaves.every(leaf=>leaf.angle===-179.5&&Math.abs(leaf.curl)<1e-8));
const finite=value=>typeof value==='number'?Number.isFinite(value):Array.isArray(value)?value.every(finite):value&&typeof value==='object'?Object.values(value).every(finite):true;
for(const p of [0,.04,.08,.16,.19,.23,.35,.43,.54,.62,.73,.81,.92,1]){
 const pose=resolveBookPose(p);assert.ok(finite(pose),'All geometry is finite at '+p);assert.equal(pose.progress,p);assert.deepEqual(resolveBookPose(p),pose,'Deterministic reversible pose');
 assert.ok(pose.leaves.every(leaf=>leaf.angle<=0&&leaf.angle>=-179.5&&leaf.curl>=0));
}
for(const [index,p]of [.35,.54,.73,.92].entries()){
 const pose=resolveBookPose(p);assert.ok(pose.leaves[index].angle<0&&pose.leaves[index].angle>-179.5&&pose.leaves[index].curl>0,'Individual curved turn '+index);
 assert.ok(pose.leaves.slice(0,index).every(leaf=>leaf.angle===-179.5));assert.ok(pose.leaves.slice(index+1).every(leaf=>leaf.angle===0));
}
assert.ok(resolveBookPose(.08).coverAngle<0&&resolveBookPose(.08).coverAngle>-180,'Opening has continuous intermediate geometry');
for(const [p,chapter]of [[0,0],[.23,1],[.43,2],[.62,3],[.81,4],[1,5]])assert.equal(resolveBookPose(p).chapter,chapter);
assert.deepEqual(resolveBookPose(-2),closed);assert.deepEqual(resolveBookPose(2),opened);
assert.ok(finite(resolveBookPose(NaN)));assert.ok(finite(resolveBookPose(Infinity)));
assert.equal(bookScrollProgress(100,100,1200,200),0);assert.equal(bookScrollProgress(600,100,1200,200),.5);assert.equal(bookScrollProgress(1100,100,1200,200),1);
assert.equal(bookScrollProgress(-100,100,1200,200),0);assert.equal(bookScrollProgress(2100,100,1200,200),1);
for(const args of [[0,0,0,0],[10,0,100,200],[NaN,0,1000,200],[0,NaN,1000,200],[0,0,Infinity,200]])assert.equal(bookScrollProgress(...args),0,'Invalid geometry is safe');
for(const id of ['conteudo','experiencia','recursos','como-funciona','planos','perguntas'])assert.ok(initial.includes(`id="${id}"`));
assert.equal((initial.match(/<h1[ >]/g)||[]).length,1);assert.match(initial,/href="\/auth\/signup"/);assert.match(initial,/href="\/auth\/login"/);
assert.match(visible,/Referência inicial/);assert.match(visible,/500 MiB/);assert.match(visible,/10 GiB/);assert.match(visible,/Preço ainda não disponível/);assert.match(initial,/<button[^>]*disabled=""[^>]*>Contratação ainda indisponível/);
assert.doesNotMatch(visible,/\b(Free|OWNER|ADMIN|Dashboard|Storage|Sync|Churn)\b/);
assert.ok(!initial.includes('/admin'));assert.ok(!initial.includes('PRIVATE_CONTENT_CANARY'));
const updated=plans.map(p=>({...p,limits:{...p.limits,syncedBooks:137},priceBrlCentavos:p.id==='pro'?3990:p.priceBrlCentavos}));
const authed=renderToStaticMarkup(React.createElement(LandingDocument,{signedIn:true,catalog:updated}));
assert.match(authed,/href="\/library"/);assert.match(authed,/Catálogo consultado com sua sessão/);assert.match(authed,/137/);assert.match(authed,/39,90/);assert.match(authed,/apenas informativo/);
const template='<!doctype html><html lang="en"><head><title>Expo</title></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div><script src="/entry.js"></script></body></html>';
const absent=buildPublicHtml(template);assert.match(absent.html,/<html lang="pt-BR">/);assert.match(absent.html,/<h1/);assert.match(absent.html,/og:locale/);assert.equal(absent.sitemap,null);assert.ok(!absent.html.includes('rel="canonical"'));assert.match(absent.robots,/Disallow: \/admin/);assert.match(absent.html,/entry.js/);
assert.doesNotMatch(absent.html,/You need to enable JavaScript/,'Public prerender must not retain the generic English Expo notice');
assert.match(absent.appHtml,/noindex,nofollow/);assert.doesNotMatch(absent.appHtml,/<h1/);assert.match(absent.appHtml,/id="root"><\/div>/);assert.match(absent.appHtml,/entry.js/);
const known=buildPublicHtml(template,{siteUrl:'https://aldus.example.invalid/'});assert.match(known.html,/rel="canonical" href="https:\/\/aldus.example.invalid\/"/);assert.match(known.sitemap,/<loc>https:\/\/aldus.example.invalid\/<\/loc>/);assert.match(known.robots,/Sitemap:/);
for(const invalid of ['javascript:alert(1)','https://user:secret@example.invalid/','https://example.invalid/?token=secret','https://example.invalid/#token','https://example.invalid/app']){assert.equal(publicSiteUrl(invalid),null);assert.throws(()=>buildPublicHtml(template,{siteUrl:invalid}),/Value redacted/);}
assert.match(fs.readFileSync('app/index.tsx','utf8'),/Redirect href="\/library"/,'Native entry remains unchanged');
assert.match(fs.readFileSync('app/_layout.tsx','utf8'),/Stack.Protected guard=\{appReady\}/);
require('child_process').execFileSync(process.execPath,['scripts/generate-public-catalog.cjs','--check'],{stdio:'pipe'});
// Real Web entry component: an authenticated account still needing a username
// must reach the existing completion screen instead of seeing a signup loop.
let accountState={loading:false,session:null,profile:null};
const entryLoad=require('./community-test-loader.cjs')({
 'expo-router':{Redirect:({href})=>React.createElement('a',{'data-profile-redirect':href})},
 'expo-router/head':()=>null,
 '@/src/presentation/contexts/AuthContext':{useAuth:()=>accountState},
 '@/src/presentation/services/dependencies':{accountPlanRepository:{readCatalog:async()=>null}},
 '@/src/presentation/saas/useSaasRead':{useSaasRead:()=>({data:null})},
 '@/src/legal/legalConfig':{legalIdentity:{contactEmail:null}},
 './LandingDocument':{LandingDocument:({signedIn})=>React.createElement('main',{'data-entry-state':signedIn?'signed-in':'guest'})},
});
const Entry=entryLoad('src/marketing/LandingPage.web.tsx').LandingPage;
const renderEntry=()=>renderToStaticMarkup(React.createElement(Entry));
assert.match(renderEntry(),/data-entry-state="guest"/);
const complete={id:'synthetic-a',username:'reader_a',account_status:'active'};
accountState={loading:false,session:{user:{id:'synthetic-a'}},profile:{...complete,username:null}};
assert.match(renderEntry(),/data-profile-redirect="\/auth\/complete-profile"/,'Fresh verified account must complete its profile');
accountState.profile=complete;assert.match(renderEntry(),/data-entry-state="signed-in"/);
for(const profile of [{...complete,id:'synthetic-b',username:null},{...complete,account_status:'disabled',username:null},null]){
 accountState.profile=profile;const html=renderEntry();assert.doesNotMatch(html,/data-profile-redirect/);assert.match(html,/data-entry-state="guest"/);
}
accountState={loading:true,session:{user:{id:'synthetic-a'}},profile:{...complete,username:null}};
assert.doesNotMatch(renderEntry(),/data-profile-redirect/,'Do not navigate during profile resolution');
console.log('PASS single-book SSR/accessible summary, finite continuous and reversible cover/leaf geometry, safe real-scroller progress math, public login/signup/library links, localized initial/authenticated catalog, no active purchase/private data, SEO; Native entry/protected stack preserved. Browser/Android separate.');
