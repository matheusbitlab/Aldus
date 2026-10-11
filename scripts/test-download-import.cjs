const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function createLoader(mocks) {
  const cache = new Map();
  return function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = name => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
      if (name.startsWith('.')) return load(`${path.resolve(path.dirname(file), name)}.ts`);
      return require(name);
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  };
}

function job(id, operationId) {
  return { id, operationId, url: id, fileName: 'book.epub', status: 'queued', progress: 0, localUri: null, error: null, attempts: 0 };
}

function dependencies(platform, fileSystem = {}) {
  return {
    'react-native': { Platform: { OS: platform } },
    'expo-file-system/legacy': fileSystem,
    '@/src/data/downloads/StorageValidator': { assertStorageAvailable: async () => {} },
    '@/src/data/downloads/NetworkStatusService': { NetworkStatusService: class { async assertConnected() {} } },
    '@/src/data/epub/EpubFileImporter': { EpubFileImporter: class {} },
  };
}

(async () => {
  const originalFetch = global.fetch;
  try {
    const { DownloadManager } = createLoader(dependencies('web'))('src/data/downloads/DownloadManager.ts');
    const importer = {
      importFromUri: async (_uri, _name, _blob, _id, options) => {
        options.onPhase({ phase: 'validating', cancellable: true });
        options.onPhase({ phase: 'reading_metadata', cancellable: true });
        options.onPhase({ phase: 'persisting', cancellable: false });
        return { filePath: 'web-epub://known' };
      },
    };
    const knownBytes = new Uint8Array([80, 75, 3, 4, 1, 2, 3, 4]);
    global.fetch = async () => new Response(knownBytes, { headers: { 'content-length': String(knownBytes.byteLength) } });
    const knownUpdates = [];
    const known = await new DownloadManager(importer).download(job('https://example.test/known.epub', 'known-op'), update => knownUpdates.push(update));
    assert.equal(known.status, 'completed');
    assert.ok(knownUpdates.some(update => update.phase === 'downloading' && update.progressKnown && update.progress === 1), 'known byte total must expose real progress');
    for (const phase of ['preparing', 'downloading', 'validating', 'reading_metadata', 'persisting', 'finalizing']) {
      assert.ok(knownUpdates.some(update => update.phase === phase), `missing remote phase ${phase}`);
    }
    assert.equal(knownUpdates.at(-1).status, 'completed');

    global.fetch = async () => new Response(knownBytes);
    const unknownUpdates = [];
    await new DownloadManager(importer).download(job('https://example.test/unknown.epub', 'unknown-op'), update => unknownUpdates.push(update));
    const unknownDownloadUpdates = unknownUpdates.filter(update => update.phase === 'downloading');
    assert.ok(unknownDownloadUpdates.length > 0);
    assert.ok(unknownDownloadUpdates.every(update => !update.progressKnown), 'unknown byte total must stay indeterminate');

    let fetchCalls = 0;
    let importerStarted;
    const started = new Promise(resolve => { importerStarted = resolve; });
    const cancellableImporter = {
      importFromUri: (_uri, _name, _blob, _id, options) => new Promise((_resolve, reject) => {
        options.onPhase({ phase: 'validating', cancellable: true });
        importerStarted();
        options.signal.addEventListener('abort', () => {
          const error = new Error('cancelled');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      }),
    };
    global.fetch = async () => { fetchCalls += 1; return new Response(knownBytes); };
    const cancelUpdates = [];
    const cancelManager = new DownloadManager(cancellableImporter);
    const cancellation = cancelManager.download(job('https://example.test/cancel.epub', 'cancel-op'), update => cancelUpdates.push(update));
    await started;
    assert.equal(await cancelManager.cancel('https://example.test/cancel.epub'), true);
    await assert.rejects(cancellation, error => error.name === 'AbortError');
    assert.equal(fetchCalls, 1, 'cancellation must not start a retry');
    assert.equal(cancelUpdates.at(-1).status, 'cancelled');
    assert.equal(cancelUpdates.at(-1).phase, 'validating', 'terminal cancellation must preserve the last real phase');

    let releaseFirst;
    let call = 0;
    global.fetch = async () => {
      call += 1;
      if (call === 1) return new Promise(resolve => { releaseFirst = () => resolve(new Response(knownBytes)); });
      return new Response(knownBytes);
    };
    const generations = [];
    const generationManager = new DownloadManager(importer);
    const first = generationManager.download(job('https://example.test/same.epub', 'old-op'), update => generations.push(update)).catch(error => error);
    await new Promise(resolve => setImmediate(resolve));
    const second = generationManager.download(job('https://example.test/same.epub', 'new-op'), update => generations.push(update));
    releaseFirst();
    await first;
    const secondResult = await second;
    assert.equal(secondResult.status, 'completed');
    const firstNewGeneration = generations.findIndex(update => update.operationId === 'new-op');
    assert.ok(firstNewGeneration >= 0);
    assert.ok(generations.slice(firstNewGeneration).every(update => update.operationId === 'new-op'), 'stale generation must not overwrite the replacement');

    const deleted = [];
    const nativeFiles = {
      documentDirectory: 'file:///app/',
      makeDirectoryAsync: async () => {},
      createDownloadResumable: (_url, uri, _options, onProgress) => ({
        downloadAsync: async () => { onProgress({ totalBytesWritten: 8, totalBytesExpectedToWrite: 8 }); return { uri }; },
        cancelAsync: async () => {},
      }),
      getInfoAsync: async () => ({ exists: true, isDirectory: false, size: 8 }),
      moveAsync: async () => {},
      deleteAsync: async uri => { deleted.push(uri); },
    };
    const { DownloadManager: NativeDownloadManager } = createLoader(dependencies('android', nativeFiles))('src/data/downloads/DownloadManager.ts');
    const failingImporter = { importFromUri: async (_uri, _name, _blob, _id, options) => { options.onPhase({ phase: 'persisting', cancellable: false }); throw new Error('database unavailable'); } };
    const nativeUpdates = [];
    await assert.rejects(new NativeDownloadManager(failingImporter).download(job('https://example.test/native.epub', 'native-op'), update => nativeUpdates.push(update)), /database unavailable/);
    assert.ok(deleted.some(uri => uri.includes('/books/temp/')), 'native temp file must be cleaned');
    assert.ok(deleted.some(uri => uri.includes('/books/imported/')), 'moved native file must be cleaned after import failure');
    assert.equal(nativeUpdates.at(-1).status, 'failed');
    assert.equal(nativeUpdates.at(-1).phase, 'persisting');

    console.log('PASS remote real/indeterminate progress, explicit phases, terminal states, cancellation without retry, stale generation guard and native cleanup');
  } finally {
    global.fetch = originalFetch;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
