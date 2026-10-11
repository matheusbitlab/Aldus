// Real SQLite SQL/reopen; controlled Expo bridge and network, not a physical-device test.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const out = {}; cache.set(file, out);
    new Function('require', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => {
      if (name in mocks) return mocks[name];
      if (name === 'expo-sqlite') return {};
      return name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load(path.posix.join(path.posix.dirname(file), name) + '.ts') : require(name);
    }, out); return out;
  };
}
function bridge(db) {
  const adapter = {
    execAsync: async sql => db.exec(sql), runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
    getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args), getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
    withTransactionAsync: async action => { db.exec('BEGIN'); try { await action(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } },
    withExclusiveTransactionAsync: async action => adapter.withTransactionAsync(() => action(adapter)),
  }; return adapter;
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const source = { id: 'source', name: 'Minha pasta', kind: 'google-drive', folderId: 'folder_123456789', url: 'folder_123456789', enabled: true, status: 'active', createdAt: 1 };
const book = (i, title = `Livro ${String(i).padStart(4, '0')}.epub`) => ({ sourceId: source.id, title, author: 'Machado de Assis', url: `https://www.googleapis.com/drive/v3/files/file${i}?alt=media`, format: 'epub', estimatedSize: 500, sourceSite: source.name, drive: { fileId: `file${i}`, modifiedTime: '2026-10-11T10:00:00Z', canDownload: true } });
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aldus-source-catalog-')), file = path.join(directory, 'catalog.sqlite');
  let db = new DatabaseSync(file), adapter = bridge(db);
  const load = loader({ '@/src/data/database/connection/database': { getDatabase: async () => adapter } });
  await load('src/data/database/migrations/MigrationRunner.ts').runMigrations(adapter);
  const { SqliteSourceCatalogRepository: Repository } = load('src/data/sources/SqliteSourceCatalogRepository.ts');
  const { SourceCatalogService, querySourceCatalog, catalogItems } = load('src/data/sources/SourceCatalogService.ts');
  const { sourceCapabilities } = load('src/domain/types/sourceCatalog.ts');
  let currentSource = source, remote = Array.from({ length: 20 }, (_, i) => book(i)), failure = null, authRequired = false;
  const remoteAdapter = { list: async () => { if (failure) throw failure; return remote; }, authorizationRequired: () => authRequired };
  let repo = new Repository(), service = new SourceCatalogService(repo, remoteAdapter, async () => currentSource);
  await service.refresh(source); assert.equal(service.view(source.id).catalog.items.length, 20);
  db.prepare('INSERT INTO books (id,title,author,file_name,file_path,mime_type,added_date) VALUES (?,?,?,?,?,?,?)').run('local-book', 'Livro 0', 'Autor', 'local.epub', '/private/local.epub', 'application/epub+zip', 1);
  db.prepare('INSERT INTO reading_progress (id,book_id,percentage,updated_at) VALUES (?,?,?,?)').run('progress', 'local-book', 65, 1);
  await service.recordImport(source.id, 'file0', 'local-book');
  db.close(); db = new DatabaseSync(file); adapter = bridge(db); repo = new Repository();
  service = new SourceCatalogService(repo, remoteAdapter, async () => currentSource);
  authRequired = true; await service.load(source);
  assert.equal(service.view(source.id).catalog.items.length, 20); assert.equal(service.view(source.id).status, 'auth_required');
  assert.equal((await repo.links(source.id))[0].bookId, 'local-book');
  console.log('PASS SQLite migration, index 20, DB close/reopen, snapshot without token/network, persisted remote/import identity');
  authRequired = false;
  remote = remote.slice(1); remote[0] = { ...book(1, 'Dom Casmurro.epub'), estimatedSize: 999 }; remote.push(book(20, 'Memórias Póstumas de Brás Cubas.epub'));
  await service.refresh(source); let snapshot = await repo.get(source.id);
  assert.ok(!snapshot.items.some(b => b.remoteBookId === 'file0')); assert.ok(snapshot.items.some(b => b.remoteBookId === 'file20')); assert.equal(snapshot.items[0].estimatedSize, 999);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM books').get().count, 1);
  for (const [code, status] of [['network', 'offline'], ['expired', 'auth_required'], ['permission', 'stale'], ['rate-limit', 'stale'], ['api', 'stale']]) {
    failure = Object.assign(new Error('unsafe token provider detail'), { code }); await service.refresh(source);
    assert.deepEqual(await repo.get(source.id), snapshot); assert.equal(service.view(source.id).status, status); assert.doesNotMatch(service.view(source.id).error, /unsafe|token provider/);
  }
  failure = null;
  assert.equal(querySourceCatalog(snapshot.items, 'Dom Casmuro', 'az')[0].remoteBookId, 'file1');
  assert.equal(querySourceCatalog(snapshot.items, 'bras cubas', 'az')[0].remoteBookId, 'file20');
  console.log('PASS add/remove/modify, personal book preserved, offline/401/403/429/partial failure snapshots and local tolerant ranking');
  const older = deferred(), newer = deferred(); let n = 0;
  const racing = new SourceCatalogService(repo, { ...remoteAdapter, list: () => (++n === 1 ? older.promise : newer.promise) }, async () => currentSource);
  const a = racing.refresh(source), b = racing.refresh(source); newer.resolve([book(100)]); await b; older.resolve([book(99)]); await a;
  assert.equal((await repo.get(source.id)).items[0].remoteBookId, 'file100');
  const saveGate = deferred(), entered = deferred(); let saving = 0;
  const slowRepo = { get: id => repo.get(id), save: async c => { if (++saving === 1) { entered.resolve(); await saveGate.promise; } await repo.save(c); }, remove: id => repo.remove(id), link: v => repo.link(v), links: id => repo.links(id) };
  remote = [book(101)]; const queued = new SourceCatalogService(slowRepo, remoteAdapter, async () => currentSource);
  const oldWrite = queued.refresh(source); await entered.promise; remote = [book(102)]; const newWrite = queued.refresh(source); saveGate.resolve(); await Promise.all([oldWrite, newWrite]);
  assert.equal((await repo.get(source.id)).items[0].remoteBookId, 'file102');
  const late = deferred(); const removing = new SourceCatalogService(repo, { ...remoteAdapter, list: () => late.promise }, async () => currentSource);
  const pending = removing.refresh(source); currentSource = undefined; await removing.remove(source.id); late.resolve([book(300)]); await pending;
  assert.equal(await repo.get(source.id), null); assert.deepEqual(await repo.links(source.id), []);
  assert.equal(db.prepare('SELECT percentage FROM reading_progress').get().percentage, 65);
  console.log('PASS network/disk generations, deletion during refresh, catalog/link purge, book/progress preserved');
  currentSource = source; remote = Array.from({ length: 1000 }, (_, i) => book(i));
  const start = performance.now(); await service.refresh(source); const persisted = performance.now();
  snapshot = await new Repository().get(source.id); const listed = performance.now();
  assert.equal(snapshot.items.length, 1000); assert.equal(querySourceCatalog(snapshot.items, 'Livro 0999', 'az')[0].remoteBookId, 'file999');
  const searched = performance.now(); assert.equal(querySourceCatalog(snapshot.items, '', 'za')[0].remoteBookId, 'file999'); querySourceCatalog(snapshot.items, '', 'recent');
  console.log(`PASS 1000 metadata: persist ${(persisted-start).toFixed(1)}ms; reopen/list ${(listed-persisted).toFixed(1)}ms; search ${(searched-listed).toFixed(1)}ms; sorts ${(performance.now()-searched).toFixed(1)}ms; ${Buffer.byteLength(JSON.stringify(snapshot))} bytes`);
  assert.ok(sourceCapabilities(source).supportsCatalog); assert.ok(sourceCapabilities({ ...source, kind: 'json', url: 'https://example.com/books.json' }).supportsCatalog);
  for (const [kind, url] of [['json', 'https://example.com?q={query}'], ['opds', 'https://example.com/opds'], ['html', 'https://example.com'], ['gutenberg', 'https://example.com'], ['webview', 'https://example.com']]) assert.equal(sourceCapabilities({ ...source, kind, url }).supportsCatalog, false);
  assert.throws(() => catalogItems(source, [{ ...book(0), url: 'https://example.com?access_token=secret' }]));
  assert.doesNotMatch(JSON.stringify(catalogItems(source, [{ ...book(0), accessToken: 'secret', headers: { Authorization: 'Bearer secret' } }])), /accessToken|Authorization|secret/);
  db.exec("CREATE TRIGGER fail_catalog BEFORE UPDATE ON source_catalogs BEGIN SELECT RAISE(ABORT, 'disk full'); END;");
  remote = [book(400)]; await service.refresh(source); assert.equal((await repo.get(source.id)).items.length, 1000);
  console.log('PASS capabilities, credential allowlist, rejected signed/token URLs and SQLite rollback on disk failure');
  db.close(); fs.rmSync(directory, { recursive: true });
  const unavailable = loader()('src/data/sources/IndexedDbSourceCatalogRepository.ts');
  await assert.rejects(new unavailable.IndexedDbSourceCatalogRepository().get(source.id), /persistente indisponível/);
  console.log('PASS unavailable Web durable storage rejects instead of silently claiming memory persistence');
})().catch(e => { console.error(e); process.exitCode = 1; });
