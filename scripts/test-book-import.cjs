const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function('require', 'exports', code)(name => {
      if (name in mocks) return mocks[name];
      const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(file), name);
      const target = ['.ts', '.tsx', ''].map(extension => base + extension).find(candidate => fs.existsSync(candidate));
      return target ? load(target) : require(name);
    }, exports);
    return exports;
  };
}

function book(id, fileName, filePath, mimeType) {
  return { id, title:fileName, author:'Teste', fileName, filePath, fileHash:null, mimeType, fileSize:1, coverImagePath:null, totalChapters:1, totalWords:1, addedDate:1, lastOpenedDate:null, isDeleted:false, progress:0 };
}

(async () => {
  const load = loader({
    'react-native': { Platform: { OS: 'android' } },
    'expo-file-system/legacy': {},
  });
  const { BookImportLifecycle } = load('src/domain/import/BookImportLifecycle.ts');
  const { LocalBookImportService } = load('src/data/imports/LocalBookImportService.ts');

  const states = [];
  let now = 1000;
  const lifecycle = new BookImportLifecycle(state => states.push(state), () => ++now);
  const first = lifecycle.start({ source:'local', fileName:'first.epub' });
  const second = lifecycle.start({ source:'local', fileName:'second.epub' });
  assert.equal(first.signal.aborted, true, 'superseded operation must be aborted');
  assert.equal(lifecycle.transition(first.operationId, { phase:'reading', cancellable:true }), false, 'stale event must be ignored');
  lifecycle.transition(second.operationId, { phase:'persisting', cancellable:false });
  assert.equal(lifecycle.cancel(), false, 'persistence phase is deliberately non-cancellable');
  lifecycle.succeed(second.operationId, 'book-2');
  assert.equal(lifecycle.current().phase, 'success');
  assert.equal(lifecycle.transition(second.operationId, { phase:'reading', cancellable:true }), false, 'terminal state must be final');
  const third = lifecycle.start({ source:'local', fileName:'third.pdf' });
  assert.equal(lifecycle.cancel(), true);
  assert.equal(third.signal.aborted, true);
  assert.equal(lifecycle.current().phase, 'cancelled');

  const stored = new Set();
  const deleted = [];
  const headers = new Map();
  let heldCopy = null;
  const files = {
    documentDirectory: 'file:///app/',
    makeDirectoryAsync: async () => {},
    copyAsync: async ({from,to}) => {
      if (from === 'content://held') await new Promise(resolve => { heldCopy = resolve; });
      stored.add(to);
    },
    moveAsync: async ({from,to}) => { stored.delete(from); stored.add(to); },
    deleteAsync: async uri => { deleted.push(uri); stored.delete(uri); },
    readAsStringAsync: async uri => Buffer.from(headers.get(uri) ?? 'PK\u0003\u0004x').toString('base64'),
  };
  let sequence = 0;
  const calls = [];
  const epubImporter = { importFromUri: async (uri, name, _blob, _id, options) => {
    calls.push({type:'epub',uri,name});
    options.onPhase({phase:'reading',cancellable:true});
    options.onPhase({phase:'validating',cancellable:true});
    options.onPhase({phase:'reading_metadata',cancellable:true});
    options.onPhase({phase:'persisting',cancellable:false});
    return book(`epub-${++sequence}`, name, uri, 'application/epub+zip');
  }};
  const pdfImporter = { importFromUri: async (uri, name, _id, _blob, options) => {
    calls.push({type:'pdf',uri,name});
    options.onPhase({phase:'reading',cancellable:true});
    options.onPhase({phase:'validating',cancellable:true});
    options.onPhase({phase:'persisting',cancellable:false});
    return book(`pdf-${++sequence}`, name, uri, 'application/pdf');
  }};
  const service = new LocalBookImportService(epubImporter, pdfImporter, 'android', files);
  const run = async (asset, id) => {
    const controller = new AbortController();
    const phases = [];
    const result = await service.import(asset, { operationId:id, signal:controller.signal, onPhase:update=>phases.push(update) });
    assert.ok(phases.some(update => update.phase === 'copying'));
    assert.ok(phases.some(update => update.phase === 'persisting'));
    return result;
  };

  headers.set('file://small.epub', 'PK\u0003\u0004x');
  headers.set('content://large-epub', 'PK\u0003\u0004x');
  headers.set('file://small.pdf', '%PDF-');
  headers.set('content://large-pdf', '%PDF-');
  const matrix = [
    [{uri:'file://small.epub',name:'small.epub',mimeType:'application/epub+zip',size:1024}, 'epub'],
    [{uri:'content://large-epub',name:'large.epub',mimeType:'application/octet-stream',size:32*1024*1024}, 'epub'],
    [{uri:'file://small.pdf',name:'small.pdf',mimeType:'application/pdf',size:2048}, 'pdf'],
    [{uri:'content://large-pdf',name:'large.pdf',mimeType:'application/octet-stream',size:64*1024*1024}, 'pdf'],
  ];
  for (let index=0; index<matrix.length; index++) {
    const result = await run(matrix[index][0], `matrix-${index}`);
    assert.equal(result.mimeType.includes(matrix[index][1]), true);
    assert.ok(result.filePath.startsWith('file:///app/books/imported/'));
  }

  headers.set('file://wrong.bin', '%PDF-');
  const wrongExtension = await run({uri:'file://wrong.bin',name:'wrong.bin',mimeType:'application/octet-stream',size:5}, 'wrong-ext');
  assert.equal(wrongExtension.mimeType, 'application/pdf', 'content signature handles an incorrect extension');
  headers.set('file://invalid.txt', 'hello');
  await assert.rejects(() => run({uri:'file://invalid.txt',name:'invalid.txt',mimeType:'text/plain',size:5}, 'invalid'), /Formato não suportado/);

  const cancelAtStart = new AbortController(); cancelAtStart.abort();
  await assert.rejects(() => service.import({uri:'file://small.epub',name:'cancel.epub'}, {operationId:'cancel-start',signal:cancelAtStart.signal,onPhase:()=>{}}), error => error.name === 'AbortError');
  const cancelMid = new AbortController();
  const midPromise = service.import({uri:'content://held',name:'held.epub',mimeType:'application/epub+zip'}, {operationId:'cancel-mid',signal:cancelMid.signal,onPhase:()=>{}});
  await new Promise(resolve => setImmediate(resolve));
  cancelMid.abort();
  await assert.rejects(midPromise, error => error.name === 'AbortError');
  assert.ok(deleted.some(uri => uri.includes('cancel-mid')), 'cancelled temp file must be removed');
  heldCopy();

  const duplicateA = await run({uri:'file://small.epub',name:'same.epub',mimeType:'application/epub+zip'}, 'duplicate-a');
  const duplicateB = await run({uri:'file://small.epub',name:'same.epub',mimeType:'application/epub+zip'}, 'duplicate-b');
  assert.notEqual(duplicateA.id, duplicateB.id, 'existing policy permits deliberate duplicate imports');
  const afterFailure = await run({uri:'file://small.pdf',name:'after-error.pdf',mimeType:'application/pdf'}, 'after-error');
  assert.equal(afterFailure.mimeType, 'application/pdf');

  const parser = { parse: async () => ({ title:'Rollback', author:'Teste', chapters:[{id:'c',bookId:'',chapterIndex:0,title:'C',startCfi:null,endCfi:null,characterCount:1,html:'x'}] }) };
  const saved = [], removed = [];
  const books = { findById:async()=>null, save:async value=>saved.push(value), softDelete:async id=>removed.push(id) };
  const chapters = { replaceForBook:async()=>{throw new Error('storage failed');} };
  const { ImportEpubUseCase } = load('src/domain/usecases/ImportEpubUseCase.ts');
  await assert.rejects(() => new ImportEpubUseCase(parser,books,chapters).execute({bytes:new Uint8Array([1]),fileName:'rollback.epub',filePath:'file://rollback',fileSize:1,bookId:'rollback'}), /storage failed/);
  assert.deepEqual(removed,['rollback'],'failed chapter persistence must hide the partial book');

  assert.ok(calls.some(call => call.uri.startsWith('file:///app/books/imported/')));
  console.log('PASS import lifecycle terminal/stale guards, EPUB/PDF small+large, file/content URI, invalid/wrong extension, cancel start/mid cleanup, duplicate policy, retry after error and persistence rollback');
})().catch(error => { console.error(error); process.exitCode = 1; });
