// Actual exported Expo/RN-Web app, router, IndexedDB and import pipeline in an isolated Chrome profile.
// Supabase identity and remote source HTTP are fixtures. No real account/Google requests.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process'), http = require('node:http'), ts = require('typescript');
const wait = ms => new Promise(r => setTimeout(r, ms));
async function cdp(url) {
  const socket = new WebSocket(url); await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const pending = new Map(); let nextId = 0;
  socket.addEventListener('message', e => { const message = JSON.parse(e.data), p = pending.get(message.id); if (!p) return; pending.delete(message.id); message.error ? p.reject(Error(message.error.message)) : p.resolve(message.result); });
  const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  return { command, close: () => socket.close(), evaluate: async expression => { const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; } };
}
(async () => {
  const exported = path.resolve('dist'), bundleFile = fs.readdirSync(path.join(exported, '_expo/static/js/web')).find(name => name.startsWith('entry-'));
  const bundle = fs.readFileSync(path.join(exported, '_expo/static/js/web', bundleFile), 'utf8');
  const project = bundle.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/); assert.ok(project, 'Export must include public Supabase configuration for controlled protected-route smoke.');
  const chrome = process.env.SOURCE_LIBRARY_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'aldus-source-browser-'));
  const screenshots = path.resolve('.expo/source-library-validation'); fs.mkdirSync(screenshots, { recursive: true });
  const epubAsset = fs.readdirSync(path.join(exported, 'assets/assets/Livros'), { withFileTypes: true }).find(entry => entry.name.endsWith('.epub'));
  let books = Array.from({ length: 20 }, (_, i) => ({ id: `remote-${i}`, title: i === 0 ? 'Dom Casmurro' : i === 1 ? 'Memórias Póstumas de Brás Cubas' : `Livro ${String(i).padStart(4, '0')}`, author: 'Machado de Assis', url: '/fixture.epub', format: 'epub', modifiedAt: '2026-10-11T10:00:00Z' }));
  let fail = false, requests = 0, delay = 0;
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://fixture.local').pathname;
    if (pathname === '/fixture.json') { requests++; res.setHeader('Content-Type', 'application/json'); const respond = () => { if (fail) { res.writeHead(429); res.end('{}'); } else res.end(JSON.stringify({ books })); }; delay ? setTimeout(respond,delay) : respond(); return; }
    let target = pathname === '/fixture.epub' ? path.join(exported, 'assets/assets/Livros', epubAsset.name) : path.resolve(exported, '.' + decodeURIComponent(pathname));
    if (!target.startsWith(exported + path.sep)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) target = path.join(exported, 'index.html');
    const type = { '.js': 'text/javascript', '.html': 'text/html', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf', '.epub': 'application/epub+zip', '.wasm': 'application/wasm' }[path.extname(target)] ?? 'application/octet-stream';
    res.setHeader('Content-Type', type); fs.createReadStream(target).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = `http://127.0.0.1:${server.address().port}`;
  const child = cp.spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', '--window-size=430,900', `--user-data-dir=${profileDirectory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let client;
  try {
    let port; for (let i = 0; i < 80; i++) { const file = path.join(profileDirectory, 'DevToolsActivePort'); if (fs.existsSync(file)) { port = fs.readFileSync(file, 'utf8').split('\n')[0]; break; } await wait(100); }
    assert.ok(port, 'Chrome CDP startup'); const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); client = await cdp(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-10-11T00:00:00Z' };
    const profile = { id: user.id, username: 'fixture', display_name: 'Teste controlado', avatar_url: null, role: 'user', account_status: 'active' };
    const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url'), 'fixture-signature'].join('.');
    const session = { access_token: jwt, refresh_token: 'fixture-not-real', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
    const source = { id: 'browser-source', name: 'Minha biblioteca de teste', kind: 'json', url: origin + '/fixture.json', enabled: true, status: 'active', createdAt: 1 };
    const drive = { ...source, id: 'drive-offline', name: 'Drive sem autorização', kind: 'google-drive', url: 'folder_123456789', folderId: 'folder_123456789' };
    const errorSource = { ...source, id: 'error-source', name: 'Fonte indisponível' };
    await client.command('Page.enable');
    await client.command('Runtime.enable');
    const fixtureScript = `
      const fixtureProfile = ${JSON.stringify(profile)};
      const originalFetch = window.fetch.bind(window);
      window.fixtureRequests = [];
      window.fetch = (input, options) => {
        const url = typeof input === 'string' ? input : input.url;
        window.fixtureRequests.push(new URL(url,location.href).pathname);
        if (url.includes('/auth/v1/user')) return Promise.resolve(new Response(${JSON.stringify(JSON.stringify(user))},{headers:{'Content-Type':'application/json'}}));
        if (url.includes('/rest/v1/profiles')) return Promise.resolve(new Response(JSON.stringify(fixtureProfile), {headers:{'Content-Type':'application/json'}}));
        if (url.includes('/rest/v1/user_feature_overrides')) return Promise.resolve(new Response('[]', {headers:{'Content-Type':'application/json'}}));
        if (/^https?:/.test(url) && !url.startsWith(${JSON.stringify(origin)})) return Promise.reject(Error('External requests blocked in controlled fixture'));
        return originalFetch(input, options);
      };
      if (!localStorage.getItem('fixture-seeded')) {
        localStorage.setItem('sb-${project[1]}-auth-token', ${JSON.stringify(JSON.stringify(session))});
        localStorage.setItem('kindle-reader.user-sources.v1', ${JSON.stringify(JSON.stringify([source, drive, errorSource]))});
        localStorage.setItem('@kindle/appTheme','light'); localStorage.setItem('fixture-seeded','1');
      }
    `;
    await client.command('Page.addScriptToEvaluateOnNewDocument', { source: fixtureScript });
    const text = () => client.evaluate('document.body.innerText');
    const until = async (snippet, timeout = 12000) => { const start = Date.now(); while (Date.now() - start < timeout) { if ((await text()).includes(snippet)) return; await wait(100); } throw Error(`Missing UI: ${snippet}; ` + (await text()).slice(0, 800) + JSON.stringify(await client.evaluate(`({keys:Object.keys(localStorage),requests:window.fixtureRequests})`))); };
    const click = async label => { assert.ok(await client.evaluate(`(() => { const e = [...document.querySelectorAll('[role="button"]')].find(e => e.textContent.trim() === ${JSON.stringify(label)}); e?.click(); return !!e; })()`), 'Button ' + label); };
    const navigate = async route => { await client.command('Page.navigate', { url: origin + route }); await wait(800); };
    const screenshot = async name => { const r = await client.command('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(screenshots, name + '.png'), Buffer.from(r.data, 'base64')); };
    await navigate('/sources'); await until('Minha biblioteca de teste'); await screenshot('sources');
    await client.evaluate(`document.querySelector('[aria-label="Abrir biblioteca: Minha biblioteca de teste"]').click()`); await until('Use Atualizar');
    delay=500; await click('Atualizar'); await until('Carregando catálogo'); await screenshot('loading'); await until('20 livros'); delay=0; await screenshot('grid');
    assert.equal(requests, 1, 'one collection request, metadata only');
    const input = async value => { await client.evaluate(`(() => { const e = document.querySelector('input[aria-label="Pesquisar nesta fonte"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`); await wait(300); };
    await input('Dom Casmuro'); await until('Dom Casmurro'); assert.equal(requests, 1, 'typing does not call the source'); await screenshot('search');
    await click('Lista'); await screenshot('list');
    await client.evaluate(`document.querySelector('[aria-label="Abrir Dom Casmurro, de Machado de Assis"]').click()`); await until('Importar para a Biblioteca'); await screenshot('import-action');
    await click('Importar para a Biblioteca'); await until('Abrir livro', 20000); await screenshot('imported'); await click('Fechar');
    await navigate('/sources/browser-source'); await until('20 livros'); await until('Na biblioteca');
    assert.equal(requests, 1, 'reload shows snapshot without metadata request'); await screenshot('reopened-stale');
    fail = true; await click('Atualizar'); await until('Não foi possível atualizar.'); await until('20 livros'); await screenshot('refresh-error'); fail = false;
    // Actual Web IndexedDB APIs: abort injection must preserve previous durable snapshot.
    const persistentCode = ts.transpileModule(fs.readFileSync('src/data/database/connection/webLibraryStore.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    await client.evaluate(`window.fixturePersistence = {}; (function(exports){${persistentCode}})(window.fixturePersistence)`);
    const indexed = await client.evaluate(`(async () => {
      const p = window.fixturePersistence;
      const previous = await p.webGetPersistent('source_catalogs','browser-source');
      const originalTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(...args){ const tx=originalTransaction.apply(this,args); if(args[1]==='readwrite') queueMicrotask(()=>tx.abort()); return tx; };
      let rejected=false; try { await p.webPutPersistent('source_catalogs',{id:'browser-source',catalog:{...previous.catalog,items:[]}}); } catch { rejected=true; } finally { IDBDatabase.prototype.transaction=originalTransaction; }
      const after = await p.webGetPersistent('source_catalogs','browser-source');
      return {rejected,count:after.catalog.items.length,links:(await p.webSourceLinksPersistent('browser-source')).length};
    })()`);
    assert.deepEqual(indexed, { rejected: true, count: 20, links: 1 });
    const importedBookId = await client.evaluate(`(async()=> (await window.fixturePersistence.webSourceLinksPersistent('browser-source'))[0].bookId)()`);
    await client.evaluate(`window.fixturePersistence.webPutPersistent('source_catalogs', {id:'drive-offline', catalog:{sourceId:'drive-offline',sourceName:'Drive sem autorização',sourceType:'google-drive',sourceIdentity:${JSON.stringify(JSON.stringify(['google-drive',drive.folderId,null]))},lastUpdated:Date.now(),items:[{sourceId:'drive-offline',remoteBookId:'file-offline',title:'Livro offline do Drive.pdf',url:'https://www.googleapis.com/drive/v3/files/file-offline?alt=media',format:'pdf',estimatedSize:123,sourceSite:'Drive sem autorização',availability:'available',drive:{fileId:'file-offline'}}]}})`);
    await client.command('Network.enable'); await client.command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await click('Atualizar'); await until('última atualização disponível'); await input('bras cubas'); await until('Memórias Póstumas'); await screenshot('offline-search');
    await client.command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await navigate('/sources/drive-offline'); await until('Reconecte o Google Drive'); await screenshot('auth-required');
    await until('Livro offline do Drive.pdf'); assert.ok((await text()).includes('1 livro'),'stored Drive snapshot visible without auth');
    await navigate('/sources/error-source'); fail=true; await click('Atualizar'); await until('Não foi possível carregar esta fonte.'); await screenshot('error-no-snapshot'); fail=false;
    await navigate('/sources/browser-source'); await until('20 livros'); books = []; await click('Atualizar'); await until('Nenhum EPUB ou PDF'); await screenshot('empty');
    books = Array.from({ length: 1000 }, (_, i) => ({ id: `remote-${i}`, title: `Livro ${String(i).padStart(4,'0')}`, url: '/fixture.epub', format: 'epub' }));
    delay=500; const start = performance.now(); await click('Atualizar'); await until('Atualizando catálogo'); await screenshot('refreshing'); await until('1000 livros'); delay=0; const indexedMs = performance.now() - start; await wait(1000);
    const mounted = await client.evaluate(`document.querySelectorAll('[aria-label^="Abrir Livro "]').length`); assert.ok(mounted < 250, `virtualized list, mounted ${mounted}/1000`);
    await input('Livro 0999'); await until('Livro 0999'); await click('Título Z–A'); await screenshot('thousand-search');
    await client.evaluate(`localStorage.setItem('@kindle/appTheme','dark')`); await navigate('/sources/browser-source'); await until('1000 livros'); await screenshot('dark-grid');
    await click('Gerenciar fonte'); await until('FONTES CADASTRADAS'); await click('Remover'); await until('Remover esta fonte não excluirá');
    await client.evaluate(`document.querySelectorAll('[role="button"]').forEach(e=>{if(e.textContent.trim()==='Confirmar remoção da fonte')e.scrollIntoView({block:'center'});})`); await screenshot('remove-confirmation');
    await click('Confirmar remoção da fonte'); await until('Fonte removida ou não encontrada');
    await client.evaluate(`window.fixturePersistence = {}; (function(exports){${persistentCode}})(window.fixturePersistence)`);
    const removed = await client.evaluate(`(async () => { const p=window.fixturePersistence; return { catalog:await p.webGetPersistent('source_catalogs','browser-source'), links:(await p.webSourceLinksPersistent('browser-source')).length, imported:(await p.webGetAllPersistent('books')).filter(b=>b.id===${JSON.stringify(importedBookId)} && !b.isDeleted).length }; })()`);
    assert.equal(removed.catalog, null); assert.equal(removed.links, 0); assert.equal(removed.imported, 1);
    const filePreserved = await client.evaluate(`(async () => !!(await window.fixturePersistence.webGetPersistent('documents', ${JSON.stringify(importedBookId)}))?.data)()`); assert.ok(filePreserved,'imported EPUB Blob remains after removing source');
    console.log(`PASS exported Web: Sources/route/grid/list/search/import/reopen/stale/refresh-error/offline/auth/empty/remove; real IndexedDB rollback+links+personal book/file preserved; 1000 indexed ~${indexedMs.toFixed(0)}ms (includes 500ms injected latency), ${mounted} mounted cards. Screenshots .expo/source-library-validation. Supabase/remote fixture only; Drive real/Android NOT TESTED.`);
  } finally {
    client?.close(); const exited = new Promise(r => child.once('exit',r)); child.kill(); await Promise.race([exited,wait(2000)]); await new Promise(r => server.close(r));
    // Only this run's mkdtemp profile, never an installed browser/user profile.
    if (path.dirname(fs.realpathSync(profileDirectory)).toLowerCase() === fs.realpathSync(os.tmpdir()).toLowerCase() && path.basename(profileDirectory).startsWith('aldus-source-browser-')) {
      try { fs.rmSync(profileDirectory,{recursive:true,maxRetries:5,retryDelay:100}); } catch { console.warn('Temporary controlled Chrome profile could not be removed.'); }
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
