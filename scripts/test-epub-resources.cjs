const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const JSZip = require('jszip');
const makeLoader = require('./community-test-loader.cjs');
const load = makeLoader();
let { EpubParserService } = load('src/data/epub/EpubParserService.ts');
const baseline = process.argv.includes('--baseline');
if (baseline) {
  const source = execFileSync('git', ['show', '2f98b79:src/data/epub/EpubParserService.ts'], { encoding: 'utf8' });
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', output)(name => name.startsWith('@/') ? load(name.slice(2)) : require(name), module.exports);
  EpubParserService = module.exports.EpubParserService;
}

async function fixture(count = 91) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
  const manifest = [], spine = [];
  for (let i = 0; i < count; i++) {
    manifest.push(`<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="c${i}"/>`);
    zip.file(`OEBPS/c${i}.xhtml`, `<html><head><link rel="stylesheet" href="css/main.css"/></head><body><h1>Chapter ${i}</h1><p>Text ${i}</p><a href="c0.xhtml">Start</a><img src="cover.png"/><img srcset="cover.png 1x, cover.png 2x"/></body></html>`);
  }
  for (const [id, href, mime] of [['css','css/main.css','text/css'],['one','fonts/one.ttf','font/ttf'],['two','fonts/two.ttf','font/ttf'],['img','cover.png','image/png']]) manifest.push(`<item id="${id}" href="${href}" media-type="${mime}"/>`);
  zip.file('OEBPS/content.opf', `<package><metadata><title>Repeated resources</title><creator>Fixture</creator></metadata><manifest>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`);
  zip.file('OEBPS/css/main.css', '@font-face{font-family:One;src:url(../fonts/one.ttf)}@font-face{font-family:Two;src:url(../fonts/two.ttf)}p{font-family:One}');
  zip.file('OEBPS/fonts/one.ttf', Buffer.alloc(512 * 1024, 7));
  zip.file('OEBPS/fonts/two.ttf', Buffer.alloc(512 * 1024, 8));
  zip.file('OEBPS/cover.png', Buffer.from([137,80,78,71]));
  return zip;
}

function measured(zip) {
  const reads = new Map(); let active = 0, peak = 0;
  for (const [name, entry] of Object.entries(zip.files)) {
    const original = entry.async.bind(entry);
    entry.async = async type => {
      const key = `${name}:${type}`; reads.set(key, (reads.get(key) || 0) + 1);
      peak = Math.max(peak, ++active);
      try { return await original(type); } finally { active--; }
    };
  }
  return { reads, get peak() { return peak; } };
}

(async () => {
  const zip = await fixture(), bytes = await zip.generateAsync({ type: 'uint8array' });
  const stats = measured(zip);
  let beats = 0; const timer = setInterval(() => beats++, 0);
  const started = performance.now();
  const parsed = await new EpubParserService({ openAndValidate: async () => zip }).parse(bytes);
  clearInterval(timer);
  const html = parsed.chapters.map(c => c.html).join('');
  const report = { baseline, chapters: parsed.chapters.length, parseMs: Math.round(performance.now() - started),
    htmlBytes: Buffer.byteLength(html), fontReads: [...stats.reads].filter(([key]) => key.includes('/fonts/')).reduce((n,[,v]) => n+v,0),
    cssReads: stats.reads.get('OEBPS/css/main.css:string'), maxActiveReads: stats.peak, eventLoopTurns: beats };
  console.log(JSON.stringify(report));
  assert.equal(parsed.chapters.length, 91);
  assert.ok(html.includes('#epub-chapter-0'));
  assert.ok(html.includes('data:image/png;base64,') && html.includes('srcset='));
  if (baseline) return;
  assert.equal(report.fontReads, 2); assert.equal(report.cssReads, 1);
  assert.ok(report.htmlBytes < 1500000, 'shared fonts must not multiply persisted HTML');
  assert.ok(beats > 0, 'parser must yield to cancellation/input events');
  assert.equal((html.match(/@font-face/g)||[]).length, 2);
  const { createEpubReaderDocument } = load('src/presentation/components/EpubReaderDocument.ts');
  const restored = JSON.parse(JSON.stringify(parsed.chapters)).map(c => ({ ...c, bookId:'fixture' }));
  const reader = createEpubReaderDocument(restored, { fontSize:16, fontFamily:'serif', marginSize:20, textColor:'#111111', backgroundColor:'#ffffff' });
  assert.equal((reader.match(/data:font\/ttf;base64,/g)||[]).length, 2);
  assert.ok(reader.includes('Chapter 90') && reader.includes('data:image/png;base64,'));

  const nested = await fixture(2);
  nested.file('OEBPS/css/main.css', '@import "nested.css"; @font-face{font-family:Main;src:url(../fonts/one.ttf)} p{background:url(../cover.png)}');
  nested.file('OEBPS/css/nested.css', '@import "main.css"; @media print{@font-face{font-family:Print;src:url(../fonts/two.ttf)}} p{margin:1em}');
  nested.file('OEBPS/c0.xhtml', '<html><head><link rel="stylesheet" href="css/main.css"/></head><body><h1>Nested</h1><img src="drawing.svg"/></body></html>');
  nested.file('OEBPS/drawing.svg', '<svg xmlns="http://www.w3.org/2000/svg"><image href="cover.png"/></svg>');
  const nestedParsed = await new EpubParserService().parse(await nested.generateAsync({ type:'uint8array' }));
  const nestedHtml = nestedParsed.chapters.map(c=>c.html).join('');
  assert.ok(nestedHtml.includes('@media print{') && nestedHtml.includes('font-family:Print'));
  assert.ok(nestedHtml.includes('data:image/svg+xml;base64,'));
  const svg = Buffer.from(nestedHtml.match(/data:image\/svg\+xml;base64,([^"']+)/)[1], 'base64').toString();
  assert.ok(svg.includes('data:image/png;base64,'));

  const cascade = await fixture(2);
  const common = '@font-face{font-family:Same;src:url(../fonts/one.ttf)}';
  cascade.file('OEBPS/css/main.css', common);
  cascade.file('OEBPS/c1.xhtml','<html><head><style>@media print{@font-face{font-family:Same;src:url(fonts/two.ttf)}}</style><link rel="stylesheet" href="css/main.css"/></head><body><p>Last font wins</p></body></html>');
  const cascadeParsed = await new EpubParserService().parse(await cascade.generateAsync({type:'uint8array'}));
  const cascadeHtml = cascadeParsed.chapters.map(c=>c.html).join('');
  assert.equal((cascadeHtml.match(/font-family:Same/g)||[]).length,2);
  assert.ok(cascadeHtml.indexOf('@media print')<cascadeHtml.lastIndexOf('@font-face'),'shared unconditional font keeps its last location after conditional declarations');
  assert.doesNotMatch(cascadeHtml,/aldus-font-ref|aldus-font-rule/,'internal references must not reach storage');

  const controller = new AbortController(); let readsAfterAbort = 0;
  const cancelZip = await fixture();
  for (const entry of Object.values(cancelZip.files)) {
    const original = entry.async.bind(entry);
    entry.async = async type => { if (controller.signal.aborted) readsAfterAbort++; return original(type); };
  }
  const cancellation = new EpubParserService({openAndValidate:async()=>cancelZip}).parse(bytes, controller.signal);
  setTimeout(()=>controller.abort(), 0);
  await assert.rejects(cancellation, error=>error.name==='AbortError');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(readsAfterAbort, 0);
  await assert.rejects(new EpubParserService().parse(bytes, controller.signal), error=>error.name==='AbortError');
  await assert.rejects(new EpubParserService().parse(new Uint8Array([1,2])), /ZIP EPUB/);

  const bookPath = 'assets/Livros/Sigmund Freud Na Sua Época E Em Nosso Tempo - Elisabeth Roudinesco.epub';
  const healthyStart = performance.now();
  const healthy = await new EpubParserService().parse(new Uint8Array(fs.readFileSync(bookPath)));
  assert.equal(healthy.chapters.length, 26); assert.ok(healthy.title && healthy.author);
  console.log(`PASS EPUB resources/cache/shared fonts, nested CSS/SVG/cycles, links, JSON roundtrip, cancellation and healthy EPUB: ${healthy.chapters.length} chapters in ${Math.round(performance.now()-healthyStart)}ms. Amendoas unavailable; Android not tested.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
