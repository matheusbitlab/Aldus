const fs=require('fs'),assert=require('assert/strict'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const load=require('./community-test-loader.cjs')();
const {LandingDocument}=load('src/marketing/LandingDocument.tsx');
const {initialCatalogReference:plans}=load('src/marketing/catalogReference.generated.ts');
const {publicSiteUrl}=load('src/marketing/seo.ts');
const {buildPublicHtml}=require('./write-public-web.cjs');
const initial=renderToStaticMarkup(React.createElement(LandingDocument));
const markup=initial.replace(/<style>[\s\S]*?<\/style>/g,'');
const visible=markup.replace(/<[^>]*>/g,' ');
assert.equal((markup.match(/data-book-scene(?:=|\s|>)/g)||[]).length,1,'One principal visual surface');
assert.equal((markup.match(/data-book-cover(?:=|\s|>)/g)||[]).length,1,'One closed static book, also available before WebGL');
assert.match(markup,/<[^>]*data-book-scene[^>]*aria-hidden="true"|<[^>]*aria-hidden="true"[^>]*data-book-scene/,'Canvas/fallback are decorative');
assert.match(markup,/data-book-progress="0(?:\.0+)?"/,'SSR starts closed');
assert.doesNotMatch(markup,/data-enhanced="true"|<(?:video|canvas)\b|preview-tab-/,'HTML must work without GPU or JavaScript');
assert.match(markup,/href="#experiencia"[^>]*>Pular demonstração/);
assert.match(markup,/Etapa anterior do livro/);assert.match(markup,/Próxima etapa do livro/);
for(const label of ['Sua Biblioteca','Reader','Estudo','Comunidade','Meu Plano','Gratuito','Pro'])assert.ok(visible.includes(label),'Semantic summary: '+label);
const story=fs.readFileSync('src/marketing/ScrollBookStory.tsx','utf8');
assert.match(story,/import\('\.\/cinematic\/BookScene\.web'\)/,'Three renderer is a dynamic Web-only chunk');
assert.match(story,/closest<HTMLElement>\('\[data-landing-scroll\], \.al-page-scroll'\)/,'Actual nested scroller');
assert.doesNotMatch(story,/window\.scrollY|preventDefault\(|setInterval\(/,'No window-scroll assumption, scroll-jacking or animation timer');
assert.match(story,/renderer\?\.dispose\(\)/,'GPU is disposable');
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
console.log('PASS cinematic SSR/accessible summary, optional Web-only GPU loader, nested-scroll lifecycle, public login/signup/library links, localized initial/authenticated catalog, no active purchase/private data, SEO and profile routing; Native entry/protected stack preserved. GPU/Android proof separate.');
