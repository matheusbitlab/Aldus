// Prerender only public marketing HTML in Expo's existing SPA export.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const load=require('./community-test-loader.cjs')();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {LandingDocument}=load('src/marketing/LandingDocument.tsx');
const {landingTitle,landingDescription,publicSiteUrl}=load('src/marketing/seo.ts');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buildPublicHtml(html,{siteUrl,contact}={}){
 html=html.replaceAll('You need to enable JavaScript to run this app.','Ative o JavaScript para utilizar o aplicativo.');
 const appHtml=html.replace(/<html([^>]*)>/,(_,attrs)=>'<html'+attrs.replace(/\s+lang="[^"]*"/,'')+' lang="pt-BR">').replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
 html=html.replace(/<noscript>\s*Ative o JavaScript para utilizar o aplicativo\.\s*<\/noscript>/g,'');
 const canonical=publicSiteUrl(siteUrl);
 if(siteUrl&&!canonical)throw Error('EXPO_PUBLIC_SITE_URL must be an absolute HTTP(S) origin without credentials, path, query or fragment. Value redacted.');
 const contactEmail=contact&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)?contact:null;
 const markup=renderToStaticMarkup(React.createElement('div',{'data-landing-scroll':true,className:'al-page-scroll',style:{height:'100vh',overflowY:'auto',overflowX:'hidden'}},React.createElement(LandingDocument,{contactEmail})));
 assert.ok(/<div id="root"[^>]*><\/div>/.test(html),'Expected empty Expo SPA root before public prerender');
 html=html.replace(/<div id="root"[^>]*><\/div>/,m=>m.replace('</div>',markup+'</div>'));
 html=html.replace(/<html([^>]*)>/,(_,attrs)=>'<html'+attrs.replace(/\s+lang="[^"]*"/,'')+' lang="pt-BR">');
 html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(landingTitle)}</title>`);
 html=html.replace('</head>',[
  `<meta name="description" content="${escape(landingDescription)}">`,
  '<style>html,body{margin:0;padding:0}#root{height:100vh}</style>',
  '<meta name="robots" content="index,follow">',
  `<meta property="og:title" content="${escape(landingTitle)}">`,
  `<meta property="og:description" content="${escape(landingDescription)}">`,
  '<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">',
  '<meta name="twitter:card" content="summary_large_image">',
  canonical?`<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(canonical)}aldus-share.png">`:'',
  '</head>',
 ].join('\n'));
 const privatePaths=['app.html','admin','auth','account','reader','library','settings','plan','community','battle','study','decks','sources','services'];
 const robots='User-agent: *\nAllow: /\n'+privatePaths.map(p=>'Disallow: /'+p).join('\n')+'\n'+(canonical?'Sitemap: '+canonical+'sitemap.xml\n':'');
 const sitemap=canonical?`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(canonical)}</loc></url></urlset>`:null;
 return {html,appHtml,robots,sitemap};
}
function write(){
 require('@expo/env').load(process.cwd(),{silent:true});
 const root=path.resolve('dist'),file=path.join(root,'index.html');
 const result=buildPublicHtml(fs.readFileSync(file,'utf8'),{siteUrl:process.env.EXPO_PUBLIC_SITE_URL,contact:process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL});
 fs.writeFileSync(file,result.html);fs.writeFileSync(path.join(root,'app.html'),result.appHtml);fs.writeFileSync(path.join(root,'robots.txt'),result.robots);
 const sitemap=path.join(root,'sitemap.xml');
 if(result.sitemap)fs.writeFileSync(sitemap,result.sitemap);
 else if(fs.existsSync(sitemap))fs.unlinkSync(sitemap); // Generated file only; never keep a stale canonical.
 console.log('PASS public pt-BR HTML prerender and SEO; canonical/sitemap '+(result.sitemap?'configured':'pending EXPO_PUBLIC_SITE_URL')+'. No private account data or invented domain.');
}
module.exports={buildPublicHtml};if(require.main===module)write();
