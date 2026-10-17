// Actual Drive/catalog coordinators; HTTP, OAuth and persistence are controlled boundaries.
const assert = require('node:assert/strict');
const makeLoader = require('./community-test-loader.cjs'), load = makeLoader();
const { SourceCatalogService } = load('src/data/sources/SourceCatalogService.ts');
const { GoogleDriveService } = load('src/data/drive/GoogleDriveService.ts');
const { DriveAuthorization } = load('src/data/drive/DriveAuthorization.ts');
const { DriveError } = load('src/data/drive/DriveErrors.ts');
const { libraryAccountScope } = load('src/data/library/LibraryAccountScope.ts');
const { sourceProgress, sourceOperationId, sourceOperationErrorCode } = load('src/utils/sourceDiagnostics.ts');
const source = { id: 'fixture-source', name: 'Nome ilustrativo', kind: 'google-drive', folderId: 'folder_fixture', url: 'folder_fixture', enabled: true, createdAt: 1 };
const book = id => ({ id, name: `Livro ${id}.epub`, mimeType: 'application/epub+zip', size: '10' });
const link = n => ({ title: `Livro ${n}`, url: `https://fixture.invalid/${n}.epub`, sourceSite: source.name, format: 'epub', estimatedSize: null });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(setImmediate);
const terminal = service => assert.ok(!['loading', 'refreshing'].includes(service.view(source.id).status));
function setup(adapter = { list: async () => [link(1)], authorizationRequired: () => false }) {
  const state = { current: source, stored: null, saves: 0, reads: 0, links: [] };
  const repository = { get: async () => { state.reads++; return state.stored; }, save: async (catalog, signal) => { assert.ok(signal instanceof AbortSignal); if (signal.aborted) throw Object.assign(new Error('cancelled'), { name: 'AbortError' }); state.saves++; state.stored = catalog; }, remove: async () => {}, links: async () => state.links, link: async value => { state.links.push(value); } };
  return { state, repository, adapter, service: new SourceCatalogService(repository, adapter, async () => state.current) };
}
(async () => {
  const originalInfo = console.info, before = process.env.EXPO_PUBLIC_SOURCE_DIAGNOSTICS, traces = [];
  process.env.EXPO_PUBLIC_SOURCE_DIAGNOSTICS = '1'; console.info = (...args) => traces.push(args.join(' '));
  try {
    let authorizations = 0, correlation, calls = 0, failure, failOnChild = false;
    const authorization = new DriveAuthorization({ prepare: async () => {}, authorize: async (_signal, id) => { authorizations++; correlation = id; return { accessToken: 'PRIVATE_TOKEN_NEVER_TRACE', expiresAt: Date.now() + 3600000 }; }, revoke: async () => {} });
    const drive = new GoogleDriveService(authorization, async raw => {
      calls++; const url = new URL(raw);
      if (failure) { const value = failure; failure = null; if (value === 'network') throw new Error('PRIVATE_PROVIDER_MESSAGE https://private.invalid/folder'); return Response.json({ error: { errors: [{ reason: value === 403 ? 'insufficientFilePermissions' : 'authError' }] } }, { status: value }); }
      if (url.pathname.endsWith(source.folderId)) return Response.json({ id: source.folderId, name: 'PRIVATE_FOLDER_NAME', mimeType: 'application/vnd.google-apps.folder' });
      if (url.pathname.endsWith('child_fixture')) {
        if (failOnChild) return Response.json({ error: { errors: [{ reason: 'insufficientFilePermissions' }] } }, { status: 403 });
        return Response.json({ id: 'child_fixture', name: 'PRIVATE_CHILD_NAME', mimeType: 'application/vnd.google-apps.folder' });
      }
      return Response.json({ files: url.searchParams.get('q').includes('child_fixture') ? [book('second')] : [book('first'), { id: 'child_fixture', name: 'PRIVATE_CHILD_NAME', mimeType: 'application/vnd.google-apps.folder' }] });
    });
    const test = setup({ catalog: (s, signal, context) => drive.listCatalog(s, signal, true, context), list: async () => { throw Error('parallel catalog path'); }, authorizationRequired: s => !authorization.connected(s.id) });
    const events = [], context = { operationId: sourceOperationId(), onProgress: progress => events.push(progress) };
    await drive.connect(source, undefined, context); assert.equal(correlation, context.operationId);
    let nativeCorrelation;
    const native = makeLoader({ 'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active' } }, 'expo-modules-core': { requireOptionalNativeModule: () => ({ authorize: async id => { nativeCorrelation = id; return { accessToken: 'PRIVATE_NATIVE_TOKEN', expiresAt: Date.now() + 3600000 }; }, cancelAuthorization: async () => {} }) } })('src/data/drive/drivePlatformAuth.ts').drivePlatformAuth;
    await native.authorize(undefined, context.operationId); assert.equal(nativeCorrelation, context.operationId, 'Native authorization keeps the source operation correlation');
    assert.deepEqual(await drive.describeRoot(source, undefined, context), { name: 'PRIVATE_FOLDER_NAME' });
    test.state.current = undefined; const prepared = await test.service.prepare(source, undefined, context);
    assert.equal(test.state.saves, 0); assert.equal(test.state.stored, null); assert.equal(test.service.view(source.id).catalog, null); terminal(test.service);
    assert.equal(prepared.items.length, 2); assert.equal(prepared.folders.length, 2);
    assert.ok(events.some(event => event.phase === 'indexing' && event.booksFound === 2 && event.foldersScanned === 2));
    assert.ok(events.every(event => event.operationId === context.operationId));
    const count = calls; test.state.current = { ...source, name: 'Nome escolhido depois da busca' };
    await test.service.commitPrepared(test.state.current, prepared, undefined, context);
    assert.equal(calls, count, 'Commit must not issue a second crawl'); assert.equal(authorizations, 1);
    assert.equal(test.state.saves, 1); assert.equal(test.state.stored.sourceName, test.state.current.name);
    assert.equal(events.at(-1).phase, 'success'); assert.equal(test.service.view(source.id).operation.phase, 'success');
    await assert.rejects(test.service.commitPrepared(source, prepared));
    const snapshot = test.state.stored;
    failOnChild = true; const partial = [];
    await assert.rejects(test.service.prepare(source, undefined, { operationId: sourceOperationId(), onProgress: event => partial.push(event) }), error => error.code === 'permission');
    assert.ok(partial.some(event => event.phase === 'indexing' && event.booksFound === 1));
    assert.equal(test.state.stored, snapshot); assert.equal(test.state.saves, 1, 'A late branch error never commits a partial tree'); failOnChild = false;
    for (const value of ['network', 403, 401]) {
      failure = value; await assert.rejects(test.service.prepare(source), error => error instanceof DriveError);
      assert.equal(test.state.stored, snapshot); assert.equal(test.state.saves, 1); terminal(test.service);
      assert.equal(test.service.view(source.id).status, value === 401 ? 'auth_required' : value === 'network' ? 'offline' : 'stale');
    }
    assert.equal(authorizations, 1, 'Index errors never silently restart consent');
    await drive.connect(source); const retry = await test.service.prepare(source); await test.service.commitPrepared(source, retry);
    assert.equal(test.state.saves, 2); assert.equal(authorizations, 2, 'Only explicit reconnect grants authorization');
    console.log('PASS correlated authorization/root name, draft search without source persistence, real folder/book counters, rename and one-crawl commit, safe network/permission/expired failures and explicit retry');

    const cancelled = setup(), cancel = new AbortController(), cancelEvents = [];
    const draft = await cancelled.service.prepare(source, cancel.signal, { operationId: sourceOperationId(), onProgress: progress => cancelEvents.push(progress) });
    cancel.abort(); await assert.rejects(cancelled.service.commitPrepared(source, draft), error => error.name === 'AbortError');
    assert.equal(cancelled.state.saves, 0); terminal(cancelled.service); assert.equal(cancelEvents.at(-1).phase, 'cancelled');
    const pending = deferred(); cancelled.adapter.list = () => pending.promise;
    const staleEvents = [], inflight = cancelled.service.prepare(source, undefined, { operationId: sourceOperationId(), onProgress: progress => staleEvents.push(progress) });
    await tick(); cancelled.service.cancel(source.id); await assert.rejects(inflight, error => error.name === 'AbortError');
    const afterCancel = JSON.stringify(cancelled.service.view(source.id)), eventCount = staleEvents.length;
    pending.resolve([link(99)]); await tick(); assert.equal(JSON.stringify(cancelled.service.view(source.id)), afterCancel); assert.equal(staleEvents.length, eventCount); terminal(cancelled.service);
    cancelled.adapter.list = async () => [link(2)]; await cancelled.service.refresh(source); assert.equal(cancelled.state.stored.items[0].remoteBookId, link(2).url);
    const changed = await cancelled.service.prepare(source); cancelled.state.current = { ...source, url: 'changed_folder', folderId: 'changed_folder' };
    await assert.rejects(cancelled.service.commitPrepared(source, changed)); assert.equal(cancelled.state.saves, 1);
    assert.deepEqual(await cancelled.service.links(source.id), [], 'An edited source cannot see associations of the previous snapshot');
    console.log('PASS cancel during review/crawl, ignored late results, manual retry, changed identity rejection and old-link isolation without clearing snapshots');

    let crawls = 0, attempts = 0;
    const saving = setup({ list: async () => { crawls++; return [link(7)]; }, authorizationRequired: () => false }), save = saving.repository.save;
    saving.repository.save = async (...args) => { attempts++; if (attempts === 1) throw Error('PRIVATE_STORAGE_FAILURE'); await save(...args); };
    const searchEvents = [], saveEvents = [], retryEvents = [], operationId = sourceOperationId();
    const toSave = await saving.service.prepare(source, undefined, { operationId, onProgress: event => searchEvents.push(event) });
    const searchEventCount = searchEvents.length;
    await assert.rejects(saving.service.commitPrepared(source, toSave, undefined, { operationId, onProgress: event => saveEvents.push(event) }));
    assert.equal(saving.state.saves, 0); terminal(saving.service);
    assert.equal(searchEvents.length, searchEventCount, 'Save progress uses the current interaction callback');
    assert.equal(saveEvents.at(-1).phase, 'error');
    await saving.service.commitPrepared(source, toSave, undefined, { operationId, onProgress: event => retryEvents.push(event) });
    assert.equal(crawls, 1); assert.equal(attempts, 2); assert.equal(saving.state.saves, 1); assert.equal(retryEvents.at(-1).phase, 'success');
    saving.state.current = undefined; const durable = saving.state.stored;
    await assert.rejects(saving.service.remove(source.id)); assert.equal(saving.state.stored, durable, 'A missing filtered source cannot remove an existing snapshot');
    console.log('PASS explicit persistence retry reuses one prepared crawl/current callback; missing ownership lookup cannot remove a snapshot');

    libraryAccountScope.set('owner-a'); const scoped = setup(); scoped.state.current = { ...source, ownerId: 'owner-a' };
    const fromA = await scoped.service.prepare(scoped.state.current); scoped.service.clearSession();
    assert.equal(scoped.service.view(source.id).catalog, null); await assert.rejects(scoped.service.commitPrepared(scoped.state.current, fromA));
    libraryAccountScope.set('owner-b'); await assert.rejects(scoped.service.prepare({ ...source, ownerId: 'owner-a' })); assert.equal(scoped.state.saves, 0);
    const read = deferred(); scoped.state.current = { ...source, ownerId: 'owner-b' }; scoped.repository.get = () => read.promise;
    const loading = scoped.service.load(scoped.state.current); await tick(); scoped.service.clearSession(); read.resolve(snapshot); await loading;
    assert.equal(scoped.service.view(source.id).catalog, null, 'A late read cannot repopulate cleared account state');
    console.log('PASS synchronous session revocation, invalidated prepared handles, foreign-owner denial and late persisted-read suppression');

    let observed = false; sourceProgress({ operationId: sourceOperationId(), onProgress: () => { observed = true; throw Error('observer'); } }, 'indexing', { booksFound: 2, foldersScanned: -3, foldersDiscovered: NaN, token: 'PRIVATE_INJECTED_TOKEN' }, 'PRIVATE_INJECTED_CODE'); assert.equal(observed, true);
    const prior = traces.length; sourceProgress({ operationId: 'https://private.invalid/id' }, 'saving'); assert.equal(traces.length, prior, 'Non-allowlisted correlation IDs never enter trace');
    assert.equal(sourceOperationErrorCode({ code: 'PRIVATE_INJECTED_CODE' }), 'unknown');
    sourceProgress({ operationId: sourceOperationId(), onProgress: event => { event.operationId = 'PRIVATE_MUTATED_ID'; event.token = 'PRIVATE_MUTATED_TOKEN'; } }, 'saving');
    const trace = traces.join('\n'); assert.doesNotMatch(trace, /PRIVATE_|private\.invalid|folder_fixture|child_fixture|accessToken|Bearer|https?:\/\//);
    const diagnosticLine = traces.at(-2), diagnostic = JSON.parse(diagnosticLine.slice(diagnosticLine.indexOf('{'))); assert.equal(diagnostic.booksFound, 2); assert.equal(diagnostic.foldersScanned, undefined); assert.equal(diagnostic.foldersDiscovered, undefined); assert.equal(diagnostic.code, 'unknown');
    assert.ok(traces.some(line => line.includes('"phase":"saving"'))); assert.ok(traces.some(line => line.includes('"phase":"cancelled"')));
    const realNow = Date.now;
    try {
      Date.now = () => 1000; sourceProgress({ operationId: 'source-duration-123' }, 'preparing');
      Date.now = () => 2500; sourceProgress({ operationId: 'source-duration-123' }, 'saving');
      const elapsed = JSON.parse(traces.at(-1).slice(traces.at(-1).indexOf('{'))).elapsedMs; assert.equal(elapsed, 1500, 'Correlation preserves duration across adapter/controller context wrappers');
    } finally { Date.now = realNow; }
    console.log('PASS source diagnostic allowlist: correlation/time/duration/counters/sanitized codes only; observer failures cannot affect operations');
  } finally { console.info = originalInfo; if (before === undefined) delete process.env.EXPO_PUBLIC_SOURCE_DIAGNOSTICS; else process.env.EXPO_PUBLIC_SOURCE_DIAGNOSTICS = before; libraryAccountScope.set(null); }
})().catch(error => { console.error(error); process.exitCode = 1; });
