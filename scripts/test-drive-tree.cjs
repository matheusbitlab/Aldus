// Real Drive adapter + catalog coordinator + SQLite; OAuth/HTTP are controlled fixtures.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    new Function('require', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load(path.posix.join(path.posix.dirname(file), name) + '.ts') : require(name), exports);
    return exports;
  };
}
function bridge(db) {
  const adapter = { execAsync: async sql => db.exec(sql), runAsync: async (sql, ...args) => db.prepare(sql).run(...args), getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args), getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
    withTransactionAsync: async action => { db.exec('BEGIN'); try { await action(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } }, withExclusiveTransactionAsync: async action => adapter.withTransactionAsync(() => action(adapter)) };
  return adapter;
}
const FOLDER = 'application/vnd.google-apps.folder', SHORTCUT = 'application/vnd.google-apps.shortcut';
const rootId = 'root_123456789', source = { id: 'tree-source', name: 'Teste', kind: 'google-drive', url: rootId, folderId: rootId, enabled: true, status: 'active', createdAt: 1 };
const folder = (id, name) => ({ id, name, mimeType: FOLDER, modifiedTime: '2026-10-12T12:00:00Z' });
const book = (id, name) => ({ id, name, mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip', size: '1234', capabilities: { canDownload: true } });
const shortcut = (id, name, targetId, targetResourceKey) => ({ id, name, mimeType: SHORTCUT, shortcutDetails: { targetId, targetMimeType: FOLDER, targetResourceKey } });
const response = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aldus-drive-tree-')), databaseFile = path.join(directory, 'tree.sqlite');
  let db = new DatabaseSync(databaseFile), database = bridge(db);
  try {
    const load = loader({ '@/src/data/database/connection/database': { getDatabase: async () => database } });
    await load('src/data/database/migrations/MigrationRunner.ts').runMigrations(database);
    const { DriveAuthorization } = load('src/data/drive/DriveAuthorization.ts'), { GoogleDriveService } = load('src/data/drive/GoogleDriveService.ts');
    const { SqliteSourceCatalogRepository } = load('src/data/sources/SqliteSourceCatalogRepository.ts');
    const { SourceCatalogService, querySourceCatalog } = load('src/data/sources/SourceCatalogService.ts');
    const { sourceFolderTrail, sourceFolderContents, enterSourceFolder, sourceFolderRoute, sourceTreeIndex } = load('src/domain/sources/sourceTree.ts');
    let tree = {
      [rootId]: [folder('a', 'Pasta A'), folder('c', 'Pasta C'), book('root-book', 'Livro Root.epub'), folder('same1', 'Mesmo nome'), folder('same2', 'Mesmo nome'), shortcut('alias1', 'Biblioteca emprestada', 'external', 'target_key'), shortcut('alias2', 'Outro atalho', 'external', 'target_key')],
      a: [folder('b', 'Pasta B'), book('a-book', 'Livro A.pdf')],
      b: [book('dom', 'Dom Casmurro.epub'), shortcut('cycle', 'Voltar à raiz', rootId)],
      c: [book('sociedade', 'Sociedade do Espetáculo.pdf')],
      same1: [book('brascubas', 'Memórias Póstumas de Brás Cubas.epub')], same2: [],
      external: [book('revolucao', 'A Revolução dos Bichos.epub'), shortcut('alias-b', 'Clássicos emprestados', 'b')],
    };
    let failFolder = null, movedOutside = false;
    const calls = [], metadataVisits = new Map();
    const auth = new DriveAuthorization({ authorize: async () => ({ accessToken: 'fixture-only', expiresAt: Date.now() + 3600000 }) });
    await auth.connect(source.id);
    const drive = new GoogleDriveService(auth, async (raw, options) => {
      const url = new URL(raw); calls.push(url); assert.equal(options.headers.Authorization, 'Bearer fixture-only');
      assert.equal(url.searchParams.get('alt'), null, 'Indexing/acquisition resolver does not download media');
      if (url.pathname.endsWith('/dom')) return response({ id: 'dom', capabilities: { canDownload: true }, parents: [movedOutside ? 'outside-unreachable' : 'b'] });
      if (!url.searchParams.has('q')) {
        const id = decodeURIComponent(url.pathname.split('/').at(-1)); assert.ok(id in tree, 'Never visit an unreached area or root ancestor: ' + id);
        metadataVisits.set(id, (metadataVisits.get(id) ?? 0) + 1);
        if (id === 'external') assert.equal(options.headers['X-Goog-Drive-Resource-Keys'], 'external/target_key');
        return response({ ...folder(id, id === rootId ? 'ROOT' : id), driveId: id === 'external' ? 'shared-external-drive' : undefined, parents: ['above-source-root'] });
      }
      const id = url.searchParams.get('q').match(/^'([^']+)' in parents and trashed = false$/)?.[1];
      assert.ok(id in tree, 'Only bounded parent queries');
      assert.equal(url.searchParams.get('corpora'), id === 'external' ? 'drive' : 'user');
      if (id === failFolder) return new Response('{}', { status: 429 });
      const offset = Number(url.searchParams.get('pageToken') ?? 0), files = tree[id].slice(offset, offset + 2);
      return response({ files, nextPageToken: offset + 2 < tree[id].length ? String(offset + 2) : undefined });
    });
    let repository = new SqliteSourceCatalogRepository();
    await drive.validateRoot(source); assert.equal(calls.length, 1); assert.equal(calls[0].searchParams.has('q'), false, 'Connection probe does not traverse the tree twice'); metadataVisits.clear();
    const adapter = { list: (source, signal) => drive.list(source, signal, true), catalog: (source, signal) => drive.listCatalog(source, signal, true), authorizationRequired: () => !auth.connected(source.id) };
    let catalogs = new SourceCatalogService(repository, adapter, async () => source);
    await catalogs.refresh(source); let snapshot = catalogs.view(source.id).catalog;
    assert.ok(snapshot); assert.equal(snapshot.schemaVersion, 2); assert.equal(snapshot.rootFolderId, rootId); assert.equal(snapshot.items.length, 6);
    assert.equal(snapshot.items.find(item => item.remoteBookId === 'dom').relativeFolderPath, 'Pasta A › Pasta B');
    assert.equal(snapshot.items.find(item => item.remoteBookId === 'dom').normalizedTitle, 'dom casmurro');
    assert.equal(snapshot.folders.filter(item => item.name === 'Mesmo nome').length, 2, 'Names are never identity');
    assert.ok([...metadataVisits.values()].every(count => count === 1), 'Visited actual folder IDs deduplicate aliases/cycles');
    let trail = sourceFolderTrail(snapshot, []), contents = sourceFolderContents(snapshot, trail.at(-1).remoteFolderId);
    assert.deepEqual(contents.books.map(item => item.remoteBookId), ['root-book']); assert.ok(contents.folders.some(item => item.id === 'a')); assert.ok(contents.folders.some(item => item.id === 'c'));
    trail = sourceFolderTrail(snapshot, enterSourceFolder(trail, contents.folders.find(item => item.id === 'a')));
    contents = sourceFolderContents(snapshot, trail.at(-1).remoteFolderId); assert.deepEqual(contents.books.map(item => item.remoteBookId), ['a-book']); assert.equal(contents.folders[0].id, 'b');
    trail = sourceFolderTrail(snapshot, enterSourceFolder(trail, contents.folders[0]));
    assert.equal(sourceFolderContents(snapshot, trail.at(-1).remoteFolderId).books[0].remoteBookId, 'dom');
    assert.equal(sourceFolderTrail(snapshot, trail.slice(1, -1).map(folder => folder.id)).at(-1).id, 'a');
    assert.equal(sourceFolderTrail(snapshot, []).at(-1).id, rootId);
    assert.deepEqual(enterSourceFolder(trail, snapshot.folders.find(folder => folder.id === 'cycle')), [], 'Cycle shortcut returns to the existing ancestor');
    const aliasTrail = sourceFolderTrail(snapshot, ['alias2']); assert.equal(aliasTrail.at(-1).remoteFolderId, 'external');
    assert.equal(sourceFolderContents(snapshot, aliasTrail.at(-1).remoteFolderId).books[0].remoteBookId, 'revolucao');
    assert.deepEqual(sourceFolderRoute(snapshot, 'b'), ['a', 'b']);
    assert.deepEqual(sourceFolderRoute(snapshot, 'cycle'), [], 'Folder search shortcut to ancestor opens root');
    const requestsBeforeSearch = calls.length, index = sourceTreeIndex(snapshot);
    for (const query of ['Dom Casmuro', 'bras cubas', 'revolucao bichos', 'sociedade espetaculo']) assert.equal(querySourceCatalog(snapshot.items, query, 'az').length, 1);
    assert.equal(querySourceCatalog(snapshot.items, 'Dom Casmuro', 'az')[0].remoteBookId, 'dom', 'Search also works while C is the current folder');
    assert.equal(sourceFolderTrail(snapshot, ['c']).at(-1).id, 'c'); assert.equal(calls.length, requestsBeforeSearch);
    assert.strictEqual(sourceTreeIndex(snapshot), index); assert.equal(index.searchFolders('emprestada')[0].id, 'alias1');
    console.log('PASS ROOT/A/B navigation/back, source-wide fuzzy search/path, same-name IDs, external shortcuts/keys/shared Drive, alias and cycle deduplication; metadata only');
    await catalogs.recordImport(source.id, 'dom', 'already-imported');
    const request = await drive.downloadRequest(source, 'dom'); assert.match(request.url, /dom\?alt=media/); assert.equal(request.headers.Authorization, 'Bearer fixture-only');
    movedOutside = true; await assert.rejects(drive.downloadRequest(source, 'dom'), error => error.code === 'not-found'); movedOutside = false;
    db.close(); db = new DatabaseSync(databaseFile); database = bridge(db); repository = new SqliteSourceCatalogRepository();
    await auth.disconnect(source.id); catalogs = new SourceCatalogService(repository, adapter, async () => source);
    const beforeReload = calls.length; await catalogs.load(source); snapshot = catalogs.view(source.id).catalog;
    assert.equal(catalogs.view(source.id).status, 'auth_required'); assert.equal(calls.length, beforeReload);
    assert.equal(sourceFolderContents(snapshot, 'b').books[0].title, 'Dom Casmurro.epub'); assert.equal(querySourceCatalog(snapshot.items, 'Dom Casmuro', 'az')[0].remoteBookId, 'dom');
    assert.equal((await repository.links(source.id))[0].bookId, 'already-imported');
    await auth.connect(source.id);
    failFolder = 'b'; tree[rootId].push(folder('new-folder', 'Nova pasta')); tree['new-folder'] = [];
    await catalogs.refresh(source); assert.equal(catalogs.view(source.id).status, 'stale'); assert.deepEqual(await repository.get(source.id), snapshot, 'Deep failure preserves the entire old tree and books'); failFolder = null;
    tree.a[0] = folder('b', 'Pasta B renomeada'); tree.b[0] = book('dom', 'Dom Casmurro revisado.epub'); tree.c.push(book('new-book', 'Novo.pdf'));
    await catalogs.refresh(source); snapshot = catalogs.view(source.id).catalog;
    assert.equal(snapshot.folders.find(folder => folder.id === 'b').name, 'Pasta B renomeada'); assert.equal(snapshot.items.find(book => book.remoteBookId === 'dom').relativeFolderPath, 'Pasta A › Pasta B renomeada');
    tree.b = tree.b.filter(item => item.id !== 'dom'); tree.c.push(book('dom', 'Dom Casmurro revisado.epub')); tree[rootId] = tree[rootId].filter(item => item.id !== 'same2'); tree.c = tree.c.filter(item => item.id !== 'sociedade');
    await catalogs.refresh(source); snapshot = catalogs.view(source.id).catalog;
    assert.equal(snapshot.items.find(book => book.remoteBookId === 'dom').parentFolderId, 'c'); assert.equal(snapshot.items.find(book => book.remoteBookId === 'dom').relativeFolderPath, 'Pasta C');
    assert.ok(!snapshot.folders.some(folder => folder.id === 'same2')); assert.ok(!snapshot.items.some(book => book.remoteBookId === 'sociedade'));
    assert.equal(sourceFolderTrail(snapshot, ['same2']).at(-1).id, rootId, 'Removed folder returns to root');
    const stable = await repository.get(source.id), failingRepository = { ...repository, get: id => repository.get(id), save: async () => { throw Error('Disk failure'); } };
    const failedSave = new SourceCatalogService(failingRepository, adapter, async () => source); await failedSave.load(source); tree.c.push(book('unpublished', 'Não publicado.epub')); await failedSave.refresh(source);
    assert.deepEqual(await repository.get(source.id), stable); assert.equal(failedSave.view(source.id).status, 'stale');
    console.log('PASS SQLite tree/links reopen without token/network, nested acquisition/moved-out refusal, atomic deep failure and storage failure, folder/book add/rename/remove/move');
    tree = { [rootId]: Array.from({ length: 500 }, (_, i) => folder('folder-' + i, 'Pasta ' + i)) };
    for (let i = 0; i < 500; i++) tree['folder-' + i] = Array.from({ length: 10 }, (_, j) => book(`book-${i}-${j}`, j === 0 ? `Dom Casmurro ${i}.epub` : `Livro ${i} ${j}.pdf`));
    const start = performance.now(); await catalogs.refresh(source); const refreshed = performance.now(); snapshot = catalogs.view(source.id).catalog;
    assert.equal(snapshot.folders.length, 501); assert.equal(snapshot.items.length, 5000); const beforeQueries = calls.length;
    for (let i = 0; i < 20; i++) assert.equal(querySourceCatalog(snapshot.items, 'Dom Casmuro', 'az').length, 500);
    assert.equal(calls.length, beforeQueries); assert.strictEqual(querySourceCatalog(snapshot.items, '', 'az'), querySourceCatalog(snapshot.items, '', 'az'));
    console.log(`PASS 500 folders/5000 books: full index+SQLite ${(refreshed-start).toFixed(0)}ms, 20 local searches ${(performance.now()-refreshed).toFixed(0)}ms, no per-query API/index rebuild; desktop fixture, not Android benchmark`);
  } finally { db.close(); fs.unlinkSync(databaseFile); fs.rmdirSync(directory); }
})().catch(error => { console.error(error); process.exitCode = 1; });
