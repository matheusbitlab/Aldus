const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = name => name === '@react-native-async-storage/async-storage' ? {} : name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : require(name);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}
(async () => {
  const { LibraryOrganizationStore, LIBRARY_ORGANIZATION_KEY } = load('src/data/local/LibraryOrganizationStore.ts');
  const { parseOrganizationBackup, exportOrganizationBackup, inferredReadingStatus, normalizeLibraryText } = load('src/domain/types/libraryOrganization.ts');
  const { GetLibraryUseCase } = load('src/domain/usecases/GetLibraryUseCase.ts');
  const { OpenBookUseCase } = load('src/domain/usecases/OpenBookUseCase.ts');
  const storage = new Map();
  const adapter = { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { await new Promise(r => setTimeout(r, 5)); storage.set(key, value); } };
  const store = new LibraryOrganizationStore(adapter);
  const record = { bookId: 'one', title: 'Sobre o Ócio — estudo', author: 'Sêneca', favorite: true, collections: ['Filosofia', 'Filosofia'], tags: ['ética'], series: 'Ensaios', volume: 2, readingStatus: 'interrupted', updatedAt: 10, revision: 1 };
  await Promise.all([store.save(record), store.save({ ...record, bookId: 'two' })]);
  const reopened = new LibraryOrganizationStore(adapter);
  assert.equal(Object.keys(await reopened.list()).length, 2);
  assert.deepEqual((await reopened.list()).one.collections, ['Filosofia']);
  await store.save({ ...record, revision: 2, title: 'Revisado' });
  await assert.rejects(store.save({ ...record, revision: 2 }), /outra janela/);
  const book = { id: 'one', title: 'Original', author: 'Original', coverImagePath: null, progress: .4 };
  const books = { listActive: async () => [book], findById: async () => book };
  assert.equal((await new GetLibraryUseCase(books, reopened).execute())[0].title, 'Revisado');
  const open = await new OpenBookUseCase(books, { listByBookId: async () => [{ id: 'chapter' }] }, { findByBookId: async () => ({ percentage: .4 }) }, reopened).execute('one');
  assert.equal(open.book.author, 'Sêneca'); assert.equal(open.progress.percentage, .4);
  assert.equal(book.title, 'Original'); // Overlay never overwrites source metadata or annotations.
  assert.equal(inferredReadingStatus(book, record), 'interrupted');
  assert.equal(inferredReadingStatus({ progress: 1 }), 'completed');
  assert.equal(normalizeLibraryText('ÉTICA'), 'etica');
  const exported = exportOrganizationBackup(await reopened.list());
  const parsed = parseOrganizationBackup(exported);
  const restoreStorage = new Map();
  const restore = new LibraryOrganizationStore({ getItem: async key => restoreStorage.get(key) ?? null, setItem: async (key, value) => restoreStorage.set(key, value) });
  assert.equal((await restore.merge(parsed, 'keep-local')).imported, 2);
  const changed = { ...parsed, one: { ...parsed.one, title: 'Importado', updatedAt: 99 } };
  assert.equal((await restore.merge(changed, 'keep-local')).conflicts, 1);
  assert.equal((await restore.list()).one.title, 'Revisado');
  assert.equal((await restore.merge(changed, 'use-imported')).imported, 1);
  assert.equal((await restore.list()).one.title, 'Importado');
  assert.equal((await restore.merge(await restore.list(), 'use-imported')).imported, 0);
  for (const mutation of [{ readingStatus: 'invented' }, { volume: -1 }, { revision: 0 }, { coverImagePath: 'javascript:alert(1)' }, { bookId: '__proto__' }, { title: '' }]) {
    assert.throws(() => parseOrganizationBackup(JSON.stringify({ format: 'kindle-library-organization', version: 1, records: [{ ...record, ...mutation }] })));
  }
  assert.throws(() => parseOrganizationBackup(JSON.stringify({ format: 'kindle-library-organization', version: 1, records: [record, record] })));
  const before = storage.get(LIBRARY_ORGANIZATION_KEY);
  assert.throws(() => parseOrganizationBackup('{invalid'));
  assert.equal(storage.get(LIBRARY_ORGANIZATION_KEY), before);
  const failing = new LibraryOrganizationStore({ getItem: adapter.getItem, setItem: async () => { throw Error('disk full'); } });
  await assert.rejects(failing.save({ ...record, revision: 3 }), /disk full/);
  assert.equal(storage.get(LIBRARY_ORGANIZATION_KEY), before);
  storage.set(LIBRARY_ORGANIZATION_KEY, '{corrupt');
  await assert.rejects(store.list());
  await assert.rejects(store.save({ ...record, revision: 3 }));
  assert.equal(storage.get(LIBRARY_ORGANIZATION_KEY), '{corrupt');
  console.log('PASS organization: persistent reload, serialized writes, stale revisions, metadata overlay, state, backup validation, conflict policies, idempotence, storage failure/corruption preservation (injected storage).');
})().catch(e => { console.error(e); process.exitCode = 1; });
