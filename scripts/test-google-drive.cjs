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
  for(const [status,code] of [[401,'expired'],[403,'api'],[404,'not-found'],[429,'rate-limit'],[503,'api']]) {
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
  for (const [reason, code, category] of [['accessNotConfigured','api-disabled','DRIVE_API_DISABLED'],['SERVICE_DISABLED','api-disabled','DRIVE_API_DISABLED'],['userRateLimitExceeded','rate-limit','RATE_LIMIT'],['ACCESS_TOKEN_SCOPE_INSUFFICIENT','auth-denied','AUTH_DENIED'],['insufficientFilePermissions','permission','FOLDER_FORBIDDEN']]) {
    await auth.connect(source.id);
    const body={error:{message:'secret provider details must not escape',errors:[{reason}]}};
    const classified=new GoogleDriveService(auth,async()=>new Response(JSON.stringify(body),{status:403}));
    await assert.rejects(classified.list(source),e=>e.code===code&&e.category===category&&!e.message.includes('secret'));
    if (code==='auth-denied') assert.equal(auth.connected(source.id),false,'A deficient scope must ask for reauthorization');
  }
  const foreignShared=new GoogleDriveService(auth,async url=>{
    const u=new URL(url);assert.equal(u.searchParams.has('ownedByMe'),false);
    return response(u.pathname.endsWith(source.folderId)?{mimeType:'application/vnd.google-apps.folder',owners:[{me:false}]}:{files:[file('foreign-epub','Livro compartilhado.epub'),file('foreign-pdf','PDF compartilhado.pdf','application/pdf')]});
  });
  assert.deepEqual((await foreignShared.list(source)).map(item=>item.format),['epub','pdf']);
  console.log('PASS specific API-disabled/scope/forbidden/rate-limit reasons and folder shared by another owner without ownership filtering (HTTP fixtures)');
  const gate=deferred(), controller=new AbortController(), late=new GoogleDriveService(auth,()=>gate.promise);
  const cancelled=late.list(source,controller.signal);controller.abort();await assert.rejects(cancelled,e=>e.name==='AbortError');gate.resolve(response({mimeType:'application/vnd.google-apps.folder'}));await tick();
  const disconnectGate=deferred(), disconnected=new GoogleDriveService(auth,()=>disconnectGate.promise);const old=disconnected.list(source);await disconnected.disconnect(source.id);disconnectGate.resolve(response({mimeType:'application/vnd.google-apps.folder'}));await assert.rejects(old);assert.throws(()=>auth.token(source.id));assert.equal(revoked,1);
  const consent=deferred(), lateAuth=new DriveAuthorization({...provider,authorize:()=>consent.promise});const connecting=lateAuth.connect(source.id);await lateAuth.disconnect(source.id);consent.resolve({accessToken:'late-fixture',expiresAt:Date.now()+3600000});await assert.rejects(connecting);assert.throws(()=>lateAuth.token(source.id));
  const expired=new DriveAuthorization({...provider,authorize:async()=>({accessToken:'fixture-token',expiresAt:Date.now()+1000})});await expired.connect(source.id);assert.throws(()=>expired.token(source.id),e=>e.code==='expired');
  console.log('PASS cancellation, late network/consent ignored, disconnect/index purge, token expiry and no credential persistence');
  // A cache-clear finishing after a newer connection must not even launch old consent.
  const clearingGate=deferred();let authorizeCalls=0;
  const delayedClear=new DriveAuthorization({...provider,clearBeforeAuthorize:true,clearToken:()=>clearingGate.promise,authorize:async()=>({accessToken:`grant-${++authorizeCalls}`,expiresAt:Date.now()+3600000})});
  await delayedClear.connect(source.id);const oldReconnect=delayedClear.connect(source.id);
  const newerReconnect=delayedClear.connect(source.id);await newerReconnect;clearingGate.resolve();
  await assert.rejects(oldReconnect,e=>e.code==='disconnected');assert.equal(authorizeCalls,2);assert.equal(delayedClear.token(source.id),'grant-2');
  let gestures=0;const neverClear=deferred(),webGesture=new DriveAuthorization({...provider,clearBeforeAuthorize:false,clearToken:()=>neverClear.promise,authorize:()=>{gestures++;return Promise.resolve({accessToken:`web-${gestures}`,expiresAt:Date.now()+3600000});}});
  await webGesture.connect(source.id);const webReconnection=webGesture.connect(source.id);assert.equal(gestures,2,'GIS must start synchronously in the reconnect gesture before any await');await webReconnection;neverClear.resolve();
  console.log('PASS native reconnect clear-cache generation race and synchronous Web reconnect gesture');
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
  // Use the real source store/repository with only AsyncStorage and network mocked.
  let saved=null;
  // Durable catalog boundary is covered by test-source-catalog; do not execute Expo SQLite in Node.
  const persistent=loader({'@react-native-async-storage/async-storage':{getItem:async()=>saved,setItem:async(_k,v)=>{saved=v;}},'@/src/data/drive/driveDependencies':{googleDrive:service},'@/src/data/sources/sourceCatalogDependencies':{sourceCatalogs:{load:async()=>{},refresh:async()=>{},remove:async()=>{},cancel:()=>{},reset:async()=>{}}}});
  const sourceStore=persistent('src/presentation/stores/sourceStore.ts').useSourceStore;
  await sourceStore.getState().add(source);assert.equal(sourceStore.getState().sources[0].id,source.id,'Probe ID must survive persistence');assert.equal(sourceStore.getState().sources[0].folderId,source.folderId);assert.doesNotMatch(saved,/accessToken|fixture-token|Bearer/);
  await sourceStore.getState().remove(source.id);assert.deepEqual(JSON.parse(saved),[]);assert.throws(()=>auth.token(source.id));
  console.log('PASS real source repository stable ID/configuration persistence and removal/connection cleanup without library deletion');
  let nextToken='token-a';const rotating=new DriveAuthorization({...provider,authorize:async()=>({accessToken:nextToken,expiresAt:Date.now()+3600000})});await rotating.connect(source.id);
  const rotatingService=new GoogleDriveService(rotating);nextToken='token-b';await rotating.connect(source.id);assert.throws(()=>rotatingService.checkDownloadStatus(source.id,401,'token-a'),e=>e.code==='disconnected');assert.equal(rotating.token(source.id),'token-b','An old HTTP response must not invalidate a newer grant');
  console.log('PASS old credential HTTP response cannot invalidate newly connected Drive session');
  await auth.connect(source.id);
  const resolver=loader({'@/src/data/drive/driveDependencies':{googleDrive:service},'@/src/data/sources/UserSourceRepository':{UserSourceRepository:class{async list(){return [source];}}}})('src/data/drive/DriveDownloadResolver.ts').driveDownloadResolver;
  const resolved=await resolver.resolve({url:books[0].url,drive:{sourceId:source.id,fileId:'epub1'}},new AbortController().signal);assert.match(resolved.url,/alt=media/);assert.equal(resolved.headers.Authorization,'Bearer fixture-token');
  await assert.rejects(resolver.resolve({drive:{sourceId:'removed-source',fileId:'epub1'}},new AbortController().signal),e=>e.code==='disconnected');
  assert.deepEqual(await resolver.resolve({url:'https://public.example/book.epub'},new AbortController().signal),{url:'https://public.example/book.epub',headers:{}});
  console.log('PASS actual Drive resolver source membership/current authorization/public fallback, transient headers only');
  // Platform wrappers use real code; OAuth/SKD boundary is controlled, not a real account.
  const originalWindow=global.window, originalClient=process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID;
  try {
    process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID='public-fixture.apps.googleusercontent.com';
    let callback,mode='success';
    global.window={google:{accounts:{oauth2:{initTokenClient:options=>{assert.equal(options.include_granted_scopes,false);assert.equal(options.scope,'https://www.googleapis.com/auth/drive.readonly');callback=options.callback;return {requestAccessToken:request=>{assert.equal(request.prompt,'select_account consent');if(mode==='success')callback({access_token:'fixture-web-token',expires_in:3600,scope:options.scope});if(mode==='denied')callback({access_token:'fixture',expires_in:3600,scope:'openid'});if(mode==='closed')options.error_callback({type:'popup_closed'});if(mode==='blocked')options.error_callback({type:'popup_failed_to_open'});}};}}}}};
    const webAuth=loader({'react-native':{Platform:{OS:'web'}},'expo-modules-core':{requireOptionalNativeModule:()=>{throw Error('No native lookup on Web');}}})('src/data/drive/drivePlatformAuth.ts').drivePlatformAuth;
    await webAuth.prepare();assert.equal((await webAuth.authorize()).accessToken,'fixture-web-token');
    let webRevoked=false;global.window.google.accounts.oauth2.revoke=(token,callback)=>{assert.equal(token,'fixture-web-token');webRevoked=true;callback({successful:true});};await webAuth.revoke('fixture-web-token');assert.equal(webRevoked,true);
    mode='denied';await assert.rejects(webAuth.authorize(),e=>e.code==='auth-denied'&&e.category==='AUTH_DENIED');mode='closed';await assert.rejects(webAuth.authorize(),e=>e.code==='cancelled'&&e.category==='AUTH_CANCELLED');mode='blocked';await assert.rejects(webAuth.authorize(),e=>e.code==='popup-blocked'&&e.message.includes('pop-ups'));
    mode='late';const abort=new AbortController(),lateWeb=webAuth.authorize(abort.signal);abort.abort();await assert.rejects(lateWeb,e=>e.name==='AbortError');callback({access_token:'late',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.readonly'});
    delete process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID;await assert.rejects(webAuth.prepare(),e=>e.code==='configuration');
    const gate=deferred();let cancels=0;
    const nativeAuth=loader({'react-native':{Platform:{OS:'android'}},'expo-modules-core':{requireOptionalNativeModule:()=>({authorize:()=>gate.promise,cancelAuthorization:async()=>{cancels++;},clearToken:async()=>{}})}})('src/data/drive/drivePlatformAuth.ts').drivePlatformAuth;
    const nativeAbort=new AbortController(),nativePending=nativeAuth.authorize(nativeAbort.signal);nativeAbort.abort();await assert.rejects(nativePending,e=>e.name==='AbortError');assert.equal(cancels,1);gate.resolve({accessToken:'late-native',expiresAt:Date.now()+3600000});await tick();
    for(const [nativeCode,code,category] of [['DRIVE_AUTH_CANCELLED','cancelled','AUTH_CANCELLED'],['DRIVE_AUTH_REQUIRED','disconnected','AUTH_REQUIRED'],['DRIVE_AUTH_DENIED','auth-denied','AUTH_DENIED'],['DRIVE_CONFIGURATION','configuration','UNKNOWN'],['DRIVE_NETWORK','network','NETWORK_ERROR'],['DRIVE_UNKNOWN','api','UNKNOWN']]) {
      const wrapper=loader({'react-native':{Platform:{OS:'android'}},'expo-modules-core':{requireOptionalNativeModule:name=>{assert.equal(name,'AldusDriveAuth');return {authorize:async id=>{assert.match(id,/^drive-/);throw Object.assign(new Error('sensitive native failure'),{code:nativeCode});},cancelAuthorization:async()=>{}};}}})('src/data/drive/drivePlatformAuth.ts').drivePlatformAuth;
      await assert.rejects(wrapper.authorize(),e=>e.code===code&&e.category===category&&!e.message.includes('sensitive'));
    }
    const noModule=loader({'react-native':{Platform:{OS:'android'}},'expo-modules-core':{requireOptionalNativeModule:()=>null}})('src/data/drive/drivePlatformAuth.ts').drivePlatformAuth;
    await assert.rejects(noModule.prepare(),e=>e.code==='configuration');await assert.rejects(noModule.authorize(),e=>e.code==='configuration');
    const alreadyAborted=new AbortController();alreadyAborted.abort();let invoked=0;
    const nativeSuccess=loader({'react-native':{Platform:{OS:'android'}},'expo-modules-core':{requireOptionalNativeModule:()=>({authorize:async()=>{invoked++;return {accessToken:'native-only-fixture',expiresAt:Date.now()+3600000};},cancelAuthorization:async()=>{}})}})('src/data/drive/drivePlatformAuth.ts').drivePlatformAuth;
    await assert.rejects(nativeSuccess.authorize(alreadyAborted.signal),e=>e.name==='AbortError');assert.equal(invoked,0);
    // A global GIS API deliberately exists. Android must still invoke only its native module.
    global.window.google.accounts.oauth2.initTokenClient=()=>{throw Error('Android must never invoke GIS');};
    assert.equal((await nativeSuccess.authorize()).accessToken,'native-only-fixture');assert.equal(invoked,1);
    console.log('PASS Android dispatch with GIS present/no Web Client ID, missing module fails closed, pre-abort opens no activity, native failure taxonomy');
    const oldFlag=process.env.EXPO_PUBLIC_DRIVE_DIAGNOSTICS,oldInfo=console.info,diagnostics=[];
    try {
      process.env.EXPO_PUBLIC_DRIVE_DIAGNOSTICS='1';console.info=(...values)=>diagnostics.push(values.join(' '));
      const diagLoader=loader({'react-native':{Platform:{OS:'android'},AppState:{currentState:'active'}}});
      const diag=diagLoader('src/utils/driveDiagnostics.ts');
      diag.driveDiagnostic({operationId:diag.driveOperationId(),implementation:'AUTHORIZATION_CLIENT',callbackReceived:true,authorizationResult:'success',accessToken:'must-never-appear',returnedUrl:'http://localhost/?code=never',category:'UNKNOWN'});
      assert.equal(diagnostics.length,1);assert.match(diagnostics[0],/AUTHORIZATION_CLIENT/);assert.match(diagnostics[0],/"flow":"DRIVE"/);assert.doesNotMatch(diagnostics[0],/must-never|localhost|never|accessToken|returnedUrl/);
      console.log('PASS diagnostic allowlist preserves flow/platform/native path without token, URL or code');
    } finally {console.info=oldInfo;if(oldFlag===undefined)delete process.env.EXPO_PUBLIC_DRIVE_DIAGNOSTICS;else process.env.EXPO_PUBLIC_DRIVE_DIAGNOSTICS=oldFlag;}
    const unsupported=loader({'react-native':{Platform:{OS:'ios'}},'expo-modules-core':{requireOptionalNativeModule:()=>null}})('src/data/drive/drivePlatformAuth.ts').drivePlatformAuth;await assert.rejects(unsupported.authorize(),e=>e.code==='configuration');
    console.log('PASS Web GIS gesture/scope/denial/close/late/config and Android wrapper cancel/late/iOS unavailable (controlled boundaries)');
  } finally {global.window=originalWindow;if(originalClient===undefined)delete process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID;else process.env.EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID=originalClient;}
})().catch(e=>{console.error(e);process.exitCode=1;});
