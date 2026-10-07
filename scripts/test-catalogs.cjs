const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
const storage = new Map();
const mocks = {
  'react-native': { Platform: { OS: 'web' } },
  'expo-file-system/legacy': {},
  'expo-network': {},
  '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value) },
};
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : require(name);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

(async () => {
  const { SearchBooksUseCase } = load('src/domain/usecases/SearchBooksUseCase.ts');
  const { GutendexSearchPlugin } = load('src/data/scraping/GutendexSearchPlugin.ts');
  const { UserSourceSearchPlugin } = load('src/data/scraping/UserSourceSearchPlugin.ts');
  const { UserSourceRepository } = load('src/data/sources/UserSourceRepository.ts');
  const { NetworkFetcherService } = load('src/data/scraping/NetworkFetcherService.ts');
  const source = { id: 'test', name: 'Minha coleção', kind: 'json', url: 'https://catalog.example/books.json', enabled: true, status: 'active', createdAt: 1 };
  const json = new UserSourceSearchPlugin(source);
  const payload = JSON.stringify({ books: [{ title: 'Sobre o Ócio', author: 'Sêneca', url: './ocio.epub' }, { title: 'Outro', url: '/outro.epub' }] });
  assert.equal(json.parseResults(payload)[0].url, 'https://catalog.example/ocio.epub');
  assert.equal(json.filterResults(json.parseResults(payload), 'ocio seneca').length, 1);
  assert.throws(() => json.parseResults('{"books":[{"title":"Bad","url":"javascript:alert(1)"}]}'));
  assert.throws(() => json.parseResults('<html>Wrong format</html>'));
  const repo = new UserSourceRepository();
  await repo.save(source); assert.equal((await new UserSourceRepository().list()).length, 1);
  await repo.save({ ...source, enabled: false }); assert.equal((await repo.list())[0].enabled, false);
  await repo.save({ ...source, name: 'Editada' }); assert.equal((await repo.list())[0].name, 'Editada');
  await repo.remove(source.id); assert.equal((await repo.list()).length, 0);
  let robotsCalls = 0;
  const robots = { canFetch: async () => { robotsCalls++; return false; } };
  const history = { save: async () => {} };
  const throttle = { waitFor: async () => {} };
  const validator = { validate: async () => { throw Error('Catalog must not HEAD acquisitions'); } };
  const good = new GutendexSearchPlugin();
  const fixture = JSON.stringify({ next: 'https://gutendex.com/books/?page=2', results: [{ id: 98, title: 'A Tale of Two Cities', authors: [{ name: 'Dickens' }], formats: { 'application/epub+zip': 'https://www.gutenberg.org/ebooks/98.epub3.images' } }] });
  assert.throws(() => good.parseResults('{"detail":"Unavailable"}'));
  const failed = { name: 'Offline', skipLinkValidation: true, getSearchEndpoint: () => 'https://offline.example/', parseResults: () => [] };
  const search = new SearchBooksUseCase([good], { getText: async url => { if (url.includes('offline')) throw Error('offline'); return fixture; } }, robots, throttle, validator, history);
  const partial = await search.executeDetailed('dickens', [good, failed]);
  assert.equal(partial.results.length, 1); assert.equal(partial.sources[1].status, 'error'); assert.equal(robotsCalls, 0);
  const crawl = { ...failed, requiresRobotsPolicy: true };
  assert.equal((await search.executeDetailed('x', [crawl])).sources[0].status, 'error'); assert.equal(robotsCalls, 1);
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => ({ ok: true, text: () => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('body aborted')))) });
  await assert.rejects(new NetworkFetcherService().getText('https://slow.example/', { timeoutMs: 20, retries: 0 }));
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(new NetworkFetcherService().getText('https://cancelled.example/', { signal: cancelled.signal }));
  global.fetch = originalFetch;
  // Exercise the real Zustand search store, with controlled source responses.
  const pending = [];
  mocks['@/src/presentation/services/dependencies'] = { appDependencies: { searchBooks: { executeDetailed: () => new Promise(resolve => pending.push(resolve)) } } };
  const { useSearchStore } = load('src/presentation/stores/searchStore.ts');
  const store = useSearchStore;
  store.getState().setQuery('old'); const old = store.getState().search();
  await new Promise(setImmediate);
  store.getState().setQuery('new'); const next = store.getState().search();
  await new Promise(setImmediate);
  pending[1]({ results: partial.results, sources: partial.sources }); await next;
  assert.equal(store.getState().status, 'partial');
  pending[0]({ results: [], sources: [] }); await old;
  assert.equal(store.getState().results.length, 1);
  for (const [sources, expected] of [[[{ sourceName: 'x', status: 'empty' }], 'empty'], [[{ sourceName: 'x', status: 'error' }], 'error']]) {
    store.getState().setQuery('test'); const task = store.getState().search(); await new Promise(setImmediate);
    pending.at(-1)({ results: [], sources }); await task; assert.equal(store.getState().status, expected);
  }
  store.getState().setQuery(''); await store.getState().search(); assert.equal(store.getState().status, 'idle');
  console.log('PASS: JSON validation/filtering/CRUD, source isolation, robots separation, body timeout, cancellation, search states and stale responses');

  const { EpubParserService } = load('src/data/epub/EpubParserService.ts');
  const { ImportEpubUseCase } = load('src/domain/usecases/ImportEpubUseCase.ts');
  const { EpubFileImporter } = load('src/data/epub/EpubFileImporter.ts');
  const { WebBookFileStore } = load('src/data/database/connection/WebBookFileStore.ts');
  const { IndexedDbBookRepository, IndexedDbChapterRepository, IndexedDbReadingProgressRepository } = load('src/data/repositories/IndexedDbRepositories.ts');
  const { DownloadManager } = load('src/data/downloads/DownloadManager.ts');
  const { OpenBookUseCase } = load('src/domain/usecases/OpenBookUseCase.ts');
  const books = new IndexedDbBookRepository(), chapters = new IndexedDbChapterRepository(), files = new WebBookFileStore();
  mocks['@/src/presentation/services/PdfThumbnailGenerator'] = { pdfThumbnailGenerator: { generate: async () => null } };
  const { PdfFileImporter } = load('src/data/local/PdfFileImporter.ts');
  await assert.rejects(new PdfFileImporter(books, chapters, files).importFromUri('blob:invalid', 'invalid.pdf', undefined, new Blob(['not a PDF'])));
  assert.equal((await books.listActive()).length, 0);
  const pdf = new Blob([fs.readFileSync('assets/Livros/sobre-o-ocio.pdf')], { type: 'application/pdf' });
  const importedPdf = await new PdfFileImporter(books, chapters, files).importFromUri('blob:valid', 'sobre-o-ocio.pdf', 'pdf-import-test', pdf);
  assert.equal(importedPdf.filePath, 'web-pdf://pdf-import-test');
  assert.equal((await files.get(importedPdf.id)).size, pdf.size);
  const importer = new EpubFileImporter(new ImportEpubUseCase(new EpubParserService(), books, chapters), files);
  const zip = new (require('jszip'))();
  zip.file('mimetype', 'application/epub+zip');
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', '<package><metadata><title>Catalog test</title><creator>Author</creator></metadata><manifest><item id="ch" href="ch.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="ch"/></spine></package>');
  zip.file('OEBPS/ch.xhtml', '<html><body><h1>Chapter</h1><p>Readable content for acquisition.</p></body></html>');
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  global.fetch = async () => new Response(bytes);
  const updates = [];
  const downloaded = await new DownloadManager(importer).download({ id: 'https://catalog.example/a.epub', url: 'https://catalog.example/a.epub', fileName: 'a.epub', status: 'queued', progress: 0, localUri: null, error: null, attempts: 0 }, update => updates.push(update));
  assert.equal(downloaded.status, 'completed');
  const first = (await books.listActive()).find(book => book.mimeType === 'application/epub+zip');
  assert.ok(first);
  await importer.importFromUri('https://catalog.example/b.epub', 'b.epub', new Blob([bytes]), 'second-book');
  const opened = await new OpenBookUseCase(books, chapters, new IndexedDbReadingProgressRepository()).execute(first.id);
  assert.equal(opened.chapters.length, 1); assert.ok(opened.chapters[0].html.includes('Readable content'));
  assert.notEqual(opened.chapters[0].id, (await chapters.listByBookId('second-book'))[0].id);
  assert.ok(await files.get(first.id));
  zip.file('OEBPS/ch.xhtml', '<html><body><h1>Chapter</h1><p onclick=alert(1)>Readable content.</p><script src="https://evil.invalid/x"></script><img src="data:image/png;base64,AA" onerror="alert(1)"><a href="javascript:alert(1)">link</a></body></html>');
  const hostile = await new EpubParserService().parse(await zip.generateAsync({ type: 'uint8array' }));
  assert.ok(!/onclick|onerror|javascript:|evil\.invalid/i.test(hostile.chapters[0].html));
  const { createEpubReaderDocument } = load('src/presentation/components/EpubReaderDocument.ts');
  const document = createEpubReaderDocument(hostile.chapters.map(chapter => ({ ...chapter, bookId: 'hostile' })), { fontSize: 16, fontFamily: 'serif', marginSize: 20, textColor: '#111111', backgroundColor: '#ffffff' });
  assert.ok(document.includes('Content-Security-Policy'));
  assert.ok(!document.includes('evil.invalid'));
  await repo.save(source); await repo.remove(source.id); assert.ok(await books.findById(first.id));
  global.fetch = originalFetch;
  console.log('PASS: download -> ZIP/EPUB validation -> import -> Library -> OpenBook, isolated chapter IDs and source removal preserves books (memory storage fallback)');

  if (process.argv.includes('--benchmark-parser')) {
    const fixturePath = '.expo/gutendex-real-book.epub';
    const realBytes = new Uint8Array(fs.readFileSync(fixturePath));
    const samples = [];
    for (let index = 0; index < 3; index++) {
      const started = performance.now();
      const parsed = await new EpubParserService().parse(realBytes);
      samples.push(Math.round(performance.now() - started));
      assert.ok(parsed.chapters.length > 0);
    }
    console.log(`PARSER_BENCHMARK ${JSON.stringify({ fixturePath, bytes: realBytes.byteLength, samplesMs: samples })}`);
  }

  if (process.argv.includes('--live')) {
    const live = new SearchBooksUseCase([good], new NetworkFetcherService(), robots, throttle, validator, history);
    const response = await live.executeDetailed('dickens');
    assert.ok(response.results.length > 0, JSON.stringify(response.sources));
    console.log(`PASS LIVE: Gutendex -> ${response.results.length} EPUB results; next=${response.sources[0].nextPageUrl}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
