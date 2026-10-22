// Chromium layout of the actual footer through React Native Web SSR.
// Slider/icon/safe-area are controlled adapters; this is not device or full-app proof.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const cp = require('node:child_process'), assert = require('node:assert/strict');
const ts = require('typescript'), React = require('react'), server = require('react-dom/server');
const native = require('react-native-web');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const compiled = ts.transpileModule(fs.readFileSync('src/presentation/components/BottomFooter.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const exportsForFooter = {};
new Function('require', 'exports', compiled)(name => {
  if (name === 'react') return React;
  if (name === 'react/jsx-runtime') return require('react/jsx-runtime');
  if (name === 'react-native') return native;
  if (name === '@expo/vector-icons') return { Ionicons: ({ name }) => React.createElement('span', null, name === 'chevron-back' ? '‹' : '›') };
  if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 0 }) };
  if (name === '@react-native-community/slider') return { __esModule: true, default: props => React.createElement('input', { type: 'range', 'aria-label': props.accessibilityLabel, min: 0, max: 1, step: props.step, defaultValue: props.value, style: { flex: 1, minWidth: 0 }, disabled: props.disabled }) };
  if (name.endsWith('/readerNavigationDiagnostics')) return { readerNavigationDiagnostic() {} };
  throw Error('Unexpected dependency: ' + name);
}, exportsForFooter);
(async () => {
  const output = path.resolve('.expo/research-cycle1'); fs.mkdirSync(output, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'aldus-concentration-'));
  const browser = cp.spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let ws;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) await wait(200);
    assert.ok(fs.existsSync(portFile), 'Isolated Chromium started');
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const jobs = new Map();
    ws.onmessage = ({ data }) => { const m = JSON.parse(data), job = jobs.get(m.id); if (job) { clearTimeout(job.timer); jobs.delete(m.id); m.error ? job.reject(Error(m.error.message)) : job.resolve(m.result); } };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; const timer = setTimeout(() => { jobs.delete(n); reject(Error('CDP timeout: ' + method)); }, 20000); jobs.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params })); });
    const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true }); assert.ok(!r.exceptionDetails); return r.result.value; };
    await send('Page.enable');
    const frameId = (await send('Page.getFrameTree')).frameTree.frame.id;
    const results = [];
    for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1440, 900]]) for (const dark of [false, true]) for (const scale of [1, 1.6]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 900 });
      let baseline;
      for (const hidden of [false, true]) {
        native.AppRegistry.registerComponent('ConcentrationFixture', () => () => React.createElement(native.View, { style: { height, width, position: 'relative', backgroundColor: dark ? '#202820' : '#f4f0e6' } }, React.createElement(native.Text, { style: { padding: 28, fontSize: 22, color: dark ? '#eee' : '#243b2d' } }, 'Leitura sem pressa'), React.createElement(native.Text, { style: { paddingHorizontal: 28, fontSize: 18, color: dark ? '#eee' : '#243b2d' } }, 'Texto sintético para validar o rodapé do Reader. Nenhum livro pessoal foi utilizado.'), React.createElement(exportsForFooter.BottomFooter, { hideReadingCounts: hidden, progress: .5, pageNumber: 51, totalPages: 101, accent: '#a85e45', secondaryText: dark ? '#ddd' : '#444', background: dark ? '#202820' : '#f4f0e6', onChange() {}, onPrevious() {}, onNext() {} })));
        const app = native.AppRegistry.getApplication('ConcentrationFixture');
        const html = server.renderToStaticMarkup(app.element), css = server.renderToStaticMarkup(app.getStyleElement());
        await send('Page.setDocumentContent', { frameId, html: `<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}<style>body{margin:0;background:${dark ? '#202820' : '#f4f0e6'};color:${dark ? '#eee' : '#243b2d'}}[style*="font-size"]{font-size:${18 * scale}px!important}</style></head><body>${html}</body></html>` });
        const geometry = await evaluate(`(()=>{const r=document.querySelector('input').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,overflow:document.documentElement.scrollWidth>innerWidth,hidden:!!document.querySelector('[aria-hidden="true"]')}})()`);
        assert.equal(geometry.overflow, false);
        assert.ok(geometry.w > 0 && geometry.y > height / 2 && geometry.y + geometry.h <= height, JSON.stringify(geometry));
        assert.equal(geometry.hidden, hidden);
        if (!hidden) baseline = geometry;
        else assert.deepEqual({ ...geometry, hidden: false }, baseline, 'Hiding counters cannot move the page slider');
        if (width === 390 && !dark && scale === 1) {
          const shot = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync(path.join(output, hidden ? 'depois.png' : 'antes.png'), Buffer.from(shot.data, 'base64'));
        }
      }
      results.push({ width, height, dark, scale, pass: true });
    }
    fs.writeFileSync(path.join(output, 'web-results.json'), JSON.stringify({ scope: 'RN Web footer SSR, synthetic text, controlled slider; no Android proof', cases: results }, null, 2));
    console.log('PASS 16 Chromium layout pairs: counters on/off, four viewports, light/dark, 160% text, stable slider and accessibility hiding. Screenshots: .expo/research-cycle1');
  } finally {
    ws?.close(); browser.kill();
    // Keep this isolated temporary profile if Windows still has it locked; never touch user profiles.
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
