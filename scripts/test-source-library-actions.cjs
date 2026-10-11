const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
function loader(mocks = {}) { const cache = new Map(); return function load(file) {
  if (cache.has(file)) return cache.get(file); const out = {}; cache.set(file, out);
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => {
    const normalized = name.startsWith('.') ? '@/'+path.posix.join(path.posix.dirname(file), name) : name;
    return normalized in mocks ? mocks[normalized] : name in mocks ? mocks[name] : name.startsWith('@/') ? load(name.slice(2)+'.ts') : name.startsWith('.') ? load(path.posix.join(path.posix.dirname(file), name)+'.ts') : require(name);
  }, out); return out;
}; }
const source = { id: 'drive-source', name: 'Pasta controlada', kind: 'google-drive', url: 'folder_123456789', folderId: 'folder_123456789', enabled: true, status: 'active', createdAt: 1 };
const file = (id, name = `Livro ${id}.epub`) => ({ id, name, mimeType: 'application/epub+zip', size: '1234', modifiedTime: '2026-10-11T00:00:00Z', capabilities: { canDownload: true } });
(async () => {
  const base = loader(), { DriveAuthorization } = base('src/data/drive/DriveAuthorization.ts'), { GoogleDriveService } = base('src/data/drive/GoogleDriveService.ts');
  let remote = Array.from({ length: 20 }, (_, i) => file('file-'+i)), fault = 0, partial = false, offline = false, metadataRequests = 0;
  const auth = new DriveAuthorization({ authorize: async () => ({ accessToken: 'fixture-only-token', expiresAt: Date.now()+3600000 }), clearToken: async () => {}, revoke: async () => {} });
  const drive = new GoogleDriveService(auth, async url => {
    const u = new URL(url); metadataRequests++; assert.equal(u.searchParams.get('alt'), null);
    if (offline) throw Error('raw unsafe network provider detail');
    if (fault) return new Response('', { status: fault });
    if (u.pathname.endsWith(source.folderId)) return new Response(JSON.stringify({ mimeType:'application/vnd.google-apps.folder' }));
    const page = Number(u.searchParams.get('pageToken') ?? 0);
    if (partial && page === 7) return new Response('', { status: 429 });
    return new Response(JSON.stringify({ files:remote.slice(page*2,page*2+2), nextPageToken:(page+1)*2 < remote.length ? String(page+1) : undefined }));
  });
  let stored = null, jsonPayload = '[]'; const snapshots = new Map(), links = new Map();
  class MemoryCatalogRepository {
    async get(id) { return snapshots.get(id) ?? null; }
    async save(value) { snapshots.set(value.sourceId, structuredClone(value)); }
    async links(id) { return [...links.values()].filter(link => link.sourceId === id); }
    async link(value) { links.set(JSON.stringify([value.sourceId,value.remoteBookId]), value); }
    async remove(id) { snapshots.delete(id); for (const [key,value] of links) if (value.sourceId === id) links.delete(key); }
  }
  const storage = { getItem: async () => stored, setItem: async (_key, value) => { stored=value; } };
  const production = loader({ 'react-native': { Platform: { OS:'web' } }, '@react-native-async-storage/async-storage': storage,
    '@/src/data/drive/driveDependencies': { googleDrive: drive }, '@/src/data/sources/IndexedDbSourceCatalogRepository': { IndexedDbSourceCatalogRepository: MemoryCatalogRepository }, '@/src/data/sources/SqliteSourceCatalogRepository': { SqliteSourceCatalogRepository: MemoryCatalogRepository }, '@/src/data/scraping/NetworkFetcherService': { NetworkFetcherService: class { async getText() { return jsonPayload; } } } });
  const { sourceCatalogs, sourceCatalogAdapter } = production('src/data/sources/sourceCatalogDependencies.ts');
  const storeLoader = loader({ '@react-native-async-storage/async-storage': storage, '@/src/data/drive/driveDependencies': { googleDrive:drive }, '@/src/data/sources/sourceCatalogDependencies': { sourceCatalogs } });
  const sources = storeLoader('src/presentation/stores/sourceStore.ts').useSourceStore;
  await auth.connect(source.id); await sources.getState().add(source);
  assert.equal(sourceCatalogs.view(source.id).catalog.items.length, 20); assert.equal(metadataRequests, 11, 'folder plus ten pages');
  const snapshot = structuredClone(await sourceCatalogs.repository.get(source.id));
  partial = true; await sourceCatalogs.refresh(source); assert.deepEqual(await sourceCatalogs.repository.get(source.id), snapshot); partial = false;
  for (const [status, state] of [[401,'auth_required'],[403,'stale'],[429,'stale']]) { fault=status; await auth.connect(source.id); await sourceCatalogs.refresh(source); assert.equal(sourceCatalogs.view(source.id).status,state); assert.deepEqual(await sourceCatalogs.repository.get(source.id),snapshot); }
  fault=0; offline=true; await auth.connect(source.id); await sourceCatalogs.refresh(source); assert.equal(sourceCatalogs.view(source.id).status,'offline'); assert.deepEqual(await sourceCatalogs.repository.get(source.id),snapshot); offline=false;
  remote=[file('file-0','Dom Casmurro.epub'),file('new-file')]; await sourceCatalogs.refresh(source); assert.equal(sourceCatalogs.view(source.id).catalog.items.length,2); assert.equal(sourceCatalogs.view(source.id).catalog.items[0].title,'Dom Casmurro.epub');
  remote=[file('file-0')]; await sourceCatalogs.refresh(source); assert.equal(sourceCatalogs.view(source.id).catalog.items.length,1);
  remote=[]; await sourceCatalogs.refresh(source); assert.equal(sourceCatalogs.view(source.id).status,'empty');
  console.log('PASS real Drive adapter + catalog service/source store: create/index20, ten pages, page8 failure preserves snapshot,401/403/429/offline, changed/new/removed/one/empty; metadata only');
  const json = { ...source, id:'json', name:'Catálogo JSON', kind:'json', url:'https://fixture.invalid/books.json', folderId:undefined };
  jsonPayload=JSON.stringify({books:[{id:'stable',title:'Dom Casmurro',url:'https://fixture.invalid/dom.epub',author:'Machado',size:123,modifiedAt:'2026-10-11'}]});
  const parsed = await sourceCatalogAdapter.list(json,new AbortController().signal); assert.equal(parsed[0].remoteBookId,'stable'); assert.equal(parsed[0].sourceId,json.id); assert.equal(parsed[0].estimatedSize,123);
  for(const payload of ['{"books":[],"next":"/page2"}','{"books":[],"nextPageToken":"2"}','{"books":[],"continuation":"2"}','{"books":[{"title":"Bad","url":"javascript:alert(1)"}]}']) { jsonPayload=payload; await assert.rejects(sourceCatalogAdapter.list(json,new AbortController().signal)); }
  console.log('PASS static JSON collection uses existing parser; stable IDs/metadata, rejects pagination and invalid acquisitions');
  remote=[file('file-0')]; await sourceCatalogs.refresh(source);
  let completion = 'completed', failLink = false;
  const originalLink = sourceCatalogs.repository.link.bind(sourceCatalogs.repository);
  sourceCatalogs.repository.link = async value => { if(failLink) throw Error('storage unavailable'); await originalLink(value); };
  const downloader = { download: async (job,onUpdate) => { const done={...job,status:completion,importedBookId:completion==='completed'?'local-book':undefined}; onUpdate(done); return done; } };
  const downloads = loader({ '@/src/presentation/services/dependencies':{appDependencies:{downloadManager:downloader}}, '@/src/data/sources/sourceCatalogDependencies':{sourceCatalogs} })('src/presentation/stores/downloadStore.ts').useDownloadStore;
  const { sourceIdentity } = base('src/domain/types/sourceCatalog.ts'), {sourceAcquisitionState,sourceDownloadId}=base('src/presentation/services/sourceAcquisition.ts');
  const item = sourceCatalogs.view(source.id).catalog.items[0];
  const job = {id:sourceDownloadId(source.id,item.remoteBookId),url:item.url,fileName:'Book.epub',source:{sourceId:source.id,remoteBookId:item.remoteBookId,sourceIdentity:sourceIdentity(source)},status:'queued',progress:0,localUri:null,error:null,attempts:0};
  for(const outcome of ['failed','cancelled']) { completion=outcome; await downloads.getState().enqueue(job); assert.deepEqual(await sourceCatalogs.links(source.id),[]); }
  completion='completed'; await downloads.getState().enqueue(job); assert.equal((await sourceCatalogs.links(source.id))[0].bookId,'local-book'); assert.equal(downloads.getState().jobs[job.id].sourceLinkStatus,'saved');
  failLink=true; await downloads.getState().enqueue({...job,id:'failed-association',source:{...job.source,remoteBookId:'different-remote'}});
  assert.equal(downloads.getState().jobs['failed-association'].status,'completed'); assert.equal(downloads.getState().jobs['failed-association'].sourceLinkStatus,'failed'); assert.match(downloads.getState().jobs['failed-association'].error,/Livro importado/); failLink=false;
  assert.equal(sourceAcquisitionState(item,undefined,{...job,status:'queued'}),'downloading'); assert.equal(sourceAcquisitionState(item,'local-book'),'imported'); assert.equal(sourceAcquisitionState({...item,availability:'unavailable'}),'unavailable'); assert.equal(sourceAcquisitionState(item),'remote_only');
  await sources.getState().update(source.id,{url:'folder_987654321',folderId:'folder_987654321'}); assert.equal(await sourceCatalogs.repository.get(source.id),null); assert.deepEqual(await sourceCatalogs.links(source.id),[]);
  await sourceCatalogs.recordImport(source.id,item.remoteBookId,'old-download',sourceIdentity(source)); assert.deepEqual(await sourceCatalogs.links(source.id),[],'late download cannot map to edited source');
  await sources.getState().remove(source.id); await downloads.getState().enqueue(job); assert.deepEqual(await sourceCatalogs.links(source.id),[]); assert.deepEqual(JSON.parse(stored),[]);
  console.log('PASS actual download store: failed/cancelled no link, completed trusted book ID persists; four acquisition states; identity edit clears associations, late completion/removal cannot resurrect source');
})().catch(error=>{console.error(error);process.exitCode=1;});
