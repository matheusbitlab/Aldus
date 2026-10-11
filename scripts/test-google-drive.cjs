const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const out = {}; cache.set(file, out);
    new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name => {
      if (name in mocks) return mocks[name];
      return name.startsWith('@/') ? load(name.slice(2)+'.ts') : name.startsWith('.') ? load(path.posix.join(path.posix.dirname(file),name)+'.ts') : require(name);
    },out); return out;
  } return load;
}
const deferred = () => {let resolve; const promise = new Promise(r => resolve = r); return {promise,resolve};};
const tick = () => new Promise(setImmediate);
const source = {id:'drive-source',name:'Minha pasta',kind:'google-drive',url:'folder_123456789',folderId:'folder_123456789',enabled:true,status:'active',createdAt:1};
const file = (id,name,mimeType='application/epub+zip') => ({id,name,mimeType,size:'1234',resourceKey:'key123'});
const response = data => new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
(async () => {
  const load = loader(), {parseDriveFolder} = load('src/data/drive/driveFolder.ts');
  for (const url of ['folder_123456789','https://drive.google.com/drive/folders/folder_123456789?usp=sharing','https://drive.google.com/drive/u/0/folders/folder_123456789','https://drive.google.com/folders/folder_123456789','https://drive.google.com/open?id=folder_123456789','https://drive.google.com/folderview?id=folder_123456789']) assert.equal(parseDriveFolder(url).folderId,source.folderId);
  assert.equal(parseDriveFolder('https://drive.google.com/drive/folders/folder_123456789?resourcekey=secret_link_key').resourceKey,'secret_link_key');
  for(const url of ['', 'abc', 'invalid folder name','http://drive.google.com/drive/folders/folder_123456789','https://drive.google.com.evil/drive/folders/folder_123456789','https://drive.google.com/file/d/folder_123456789/view','https://user@drive.google.com/open?id=folder_123456789','https://drive.google.com/open?id=bad%27id']) assert.throws(()=>parseDriveFolder(url),e=>e.code==='invalid-folder');
  console.log('PASS Drive folder ID, canonical/account/open/folderview/resource-key URLs and invalid inputs');
  const {DriveAuthorization} = load('src/data/drive/DriveAuthorization.ts'), {GoogleDriveService} = load('src/data/drive/GoogleDriveService.ts');
  let cleared = 0, revoked = 0;
  const provider={prepare:async()=>{},authorize:async()=>({accessToken:'fixture-token',expiresAt:Date.now()+3600000}),clearToken:async()=>{cleared++;},revoke:async()=>{revoked++;}};
  const auth=new DriveAuthorization(provider); assert.throws(()=>auth.token(source.id),e=>e.code==='disconnected');
  await auth.connect(source.id); assert.equal(auth.token(source.id),'fixture-token');
  const requests=[];
  const service = new GoogleDriveService(auth,async (url,options) => {
    requests.push({url,options}); assert.equal(options.headers.Authorization,'Bearer fixture-token');
    const u=new URL(url); assert.notEqual(u.searchParams.get('alt'),'media','No media during indexing');
    if(u.pathname.endsWith('/'+source.folderId)) return response({id:source.folderId,name:'Pasta',mimeType:'application/vnd.google-apps.folder',driveId:'shared_drive'});
    if(u.pathname.endsWith('/epub1')) return response({id:'epub1',capabilities:{canDownload:true}});
    assert.equal(u.searchParams.get('driveId'),'shared_drive'); assert.equal(u.searchParams.get('corpora'),'drive');
    assert.equal(u.searchParams.get('q'),"'folder_123456789' in parents and trashed = false");
    if(!u.searchParams.has('pageToken')) return response({files:[file('epub1','Memórias Póstumas de Brás Cubas.epub'),file('zip','zip.zip','application/zip'),file('shortcut','O Banquete.pdf','application/vnd.google-apps.shortcut')],nextPageToken:'page2'});
    return response({files:[file('pdf2','A Sociedade do Espetáculo.pdf','application/pdf'),file('wrong','doc.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document')]});
  });
  const books=await service.list(source); assert.deepEqual(books.map(b=>b.format),['epub','pdf']); assert.equal(requests.length,3);
  assert.ok(books.every(b=>b.sourceId===source.id)); assert.equal(books[0].author,undefined,'Do not invent authors or read EPUB to obtain them');
  await service.list(source); assert.equal(requests.length,3,'Session index is reused');
  await service.list(source,undefined,true); assert.equal(requests.length,6,'Explicit update traverses pages again');
  const acquisition=await service.downloadRequest(source,'epub1'); assert.match(acquisition.url,/alt=media/);assert.equal(acquisition.headers['X-Goog-Drive-Resource-Keys'],'epub1/key123');
  await assert.rejects(service.downloadRequest(source,'not-in-folder'),e=>e.code==='not-found');
  console.log('PASS EPUB/PDF metadata only, unsupported/shortcuts excluded, shared-drive pagination, index refresh and explicit acquisition headers');
  for(const [status,code] of [[401,'expired'],[403,'permission'],[404,'not-found'],[429,'rate-limit'],[503,'api']]) {
    const a=new DriveAuthorization(provider);await a.connect(source.id);
    const s=new GoogleDriveService(a,async()=>new Response('',{status}));await assert.rejects(s.list(source),e=>e.code===code);
    if(status===401) assert.throws(()=>a.token(source.id),e=>e.code==='disconnected');
  }
  const network = new GoogleDriveService(auth,async()=>{throw new Error('Do not surface sensitive raw provider errors');});await assert.rejects(network.list(source),e=>e.code==='network'&&!e.message.includes('sensitive'));
  const empty = new GoogleDriveService(auth,async url=>response(new URL(url).pathname.endsWith(source.folderId)?{mimeType:'application/vnd.google-apps.folder'}:{files:[]}));assert.deepEqual(await empty.list(source),[]);
  const incomplete=new GoogleDriveService(auth,async url=>response(new URL(url).pathname.endsWith(source.folderId)?{mimeType:'application/vnd.google-apps.folder'}:{files:[],incompleteSearch:true}));await assert.rejects(incomplete.list(source),e=>e.code==='api');
  const repeat=new GoogleDriveService(auth,async url=>response(new URL(url).pathname.endsWith(source.folderId)?{mimeType:'application/vnd.google-apps.folder'}:{files:[],nextPageToken:'repeat'}));await assert.rejects(repeat.list(source),e=>e.code==='api');
  const denied=new GoogleDriveService(auth,async url=>response(new URL(url).pathname.endsWith(source.folderId)?{mimeType:'application/vnd.google-apps.folder'}:new URL(url).pathname.endsWith('file1')?{capabilities:{canDownload:false}}:{files:[file('file1','Book.epub')]}));await assert.rejects(denied.downloadRequest(source,'file1'),e=>e.code==='permission');
  console.log('PASS empty folder, incomplete/repeated pagination, download permission, 401/403/404/429/503 and sanitized network failures');
  const gate=deferred(), controller=new AbortController(), late=new GoogleDriveService(auth,()=>gate.promise);
  const cancelled=late.list(source,controller.signal);controller.abort();await assert.rejects(cancelled,e=>e.name==='AbortError');gate.resolve(response({mimeType:'application/vnd.google-apps.folder'}));await tick();
  const disconnectGate=deferred(), disconnected=new GoogleDriveService(auth,()=>disconnectGate.promise);const old=disconnected.list(source);await disconnected.disconnect(source.id);disconnectGate.resolve(response({mimeType:'application/vnd.google-apps.folder'}));await assert.rejects(old);assert.throws(()=>auth.token(source.id));assert.equal(revoked,1);
  const consent=deferred(), lateAuth=new DriveAuthorization({...provider,authorize:()=>consent.promise});const connecting=lateAuth.connect(source.id);await lateAuth.disconnect(source.id);consent.resolve({accessToken:'late-fixture',expiresAt:Date.now()+3600000});await assert.rejects(connecting);assert.throws(()=>lateAuth.token(source.id));
  const expired=new DriveAuthorization({...provider,authorize:async()=>({accessToken:'fixture-token',expiresAt:Date.now()+1000})});await expired.connect(source.id);assert.throws(()=>expired.token(source.id),e=>e.code==='expired');
  console.log('PASS cancellation, late network/consent ignored, disconnect/index purge, token expiry and no credential persistence');
  await auth.connect(source.id);
  const pluginLoad=loader({'@/src/data/drive/driveDependencies':{googleDrive:service}}),{GoogleDriveSearchPlugin}=pluginLoad('src/data/scraping/GoogleDriveSearchPlugin.ts'),{SearchBooksUseCase}=pluginLoad('src/domain/usecases/SearchBooksUseCase.ts');
  const uc=new SearchBooksUseCase([],{getText:async()=>{throw Error('No public fetch for Drive');}},{canFetch:async()=>{throw Error('No robots for Drive');}},{waitFor:async()=>{}},{validate:async()=>{throw Error('No binary HEAD for Drive');}},{save:async()=>{}});
  const plugin=new GoogleDriveSearchPlugin(source);assert.equal((await uc.executeDetailed('bras cubas',[plugin])).results[0].title,books[0].title);
  console.log('PASS Drive adapter uses existing use case and shared ranking without public scraping/download');
  // Repository/selection tests mock only platform authorization, not source dispatch.
  const storeLoad=loader({'@/src/data/drive/driveDependencies':{googleDrive:service},'@/src/data/sources/UserSourceRepository':{UserSourceRepository:class{async list(){return [source];}}},'@/src/presentation/services/dependencies':{appDependencies:{searchBooks:uc}}});
  const store=storeLoad('src/presentation/stores/searchStore.ts').useSearchStore;
  store.getState().setQuery('bras cubas');await store.getState().search(source.name);assert.equal(store.getState().results[0].sourceId,source.id);assert.equal(store.getState().sourceStatuses.length,1);
  console.log('PASS source-specific Drive selection runs only its adapter');
})().catch(e=>{console.error(e);process.exitCode=1;});
