// Physical USB smoke tests. Never installs, clears data, changes accounts or
// writes to backend services. Screenshots stay in ignored .expo/redmi-qa.
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const packageName = 'com.aldus.reader';
const output = path.resolve(__dirname, '../.expo/redmi-qa');
const adb = process.env.ADB_PATH || path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const command = process.argv[2] || 'inventory';
const exec = (args, binary = false) => cp.execFileSync(adb, args, { encoding: binary ? undefined : 'utf8', timeout: 30000, maxBuffer: 20 * 1024 * 1024 });
const devices = exec(['devices']).split(/\r?\n/).slice(1).filter(line => /\S+\s+(device|unauthorized|offline)\b/.test(line));
assert.equal(devices.length, 1, 'Exactly one USB target is required; do not guess between devices.');
assert.match(devices[0], /\sdevice\b/, 'Confirm USB debugging on the phone if unauthorized.');
const serial = devices[0].split(/\s/)[0];
const run = (args, binary = false) => exec(['-s', serial, ...args], binary);
const shell = (...args) => run(['shell', ...args.map(String)]);
const input = (...args) => shell('input', ...args);
const screenSizes = [...shell('wm', 'size').matchAll(/(?:Physical|Override) size: (\d+)x(\d+)/g)];
assert.ok(screenSizes.length, 'Screen size unavailable');
const [, screenWidth, screenHeight] = screenSizes.at(-1).map(Number);
fs.mkdirSync(output, { recursive: true });
const report = {
  at: new Date().toISOString(), command,
  workspaceHead: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim(),
  workspaceDirty: !!cp.execFileSync('git', ['status', '--porcelain'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim(),
  installedCommit: null, // Version/code alone do not identify the installed bundle.
  device: shell('getprop', 'ro.product.model').trim(), android: shell('getprop', 'ro.build.version.release').trim(),
  package: packageName,
  version: shell('dumpsys', 'package', packageName).split(/\r?\n/).filter(line => /versionCode=|versionName=/.test(line)).map(line => line.trim()),
  results: [],
};
function nodes() {
  shell('uiautomator', 'dump', '--compressed', '/sdcard/aldus-qa-window.xml');
  const xml = run(['exec-out', 'cat', '/sdcard/aldus-qa-window.xml']);
  return [...xml.matchAll(/<node\b[^>]+>/g)].map(([tag]) => {
    const get = key => new RegExp(key + '="([^"]*)"').exec(tag)?.[1] || '';
    return { text: get('text'), label: get('content-desc'), package: get('package'), bounds: get('bounds').match(/\d+/g)?.map(Number) };
  }).filter(n => n.package === packageName && n.bounds && n.bounds[2] > n.bounds[0] && n.bounds[3] > n.bounds[1] && n.bounds[0] < screenWidth && n.bounds[1] < screenHeight && n.bounds[2] > 0 && n.bounds[3] > 0);
}
function tap(label) {
  const all = nodes();
  const n = all.find(n => n.label === label) || all.find(n => n.text === label) || all.find(n => n.label.startsWith(label));
  assert.ok(n, 'Missing control: ' + label);
  const [l,t,r,b] = n.bounds;
  input('tap', Math.round((Math.max(0,l)+Math.min(screenWidth,r))/2), Math.round((Math.max(0,t)+Math.min(screenHeight,b))/2));
}
const has = (all, text) => all.some(n => n.text === text || n.label === text);
async function waitFor(predicate, timeout = 45000) {
  const deadline = Date.now() + timeout;
  do { const all = nodes(); if (predicate(all)) return all; await new Promise(resolve => setTimeout(resolve, 500)); } while (Date.now() < deadline);
  throw Error('Expected UI state did not appear before deadline');
}
function screenshot(name) {
  const focus = shell('dumpsys', 'window');
  assert.ok(focus.split(/\r?\n/).some(line => /mCurrentFocus/.test(line) && line.includes(packageName)), 'Capture only Aldus foreground');
  fs.writeFileSync(path.join(output, name + '.png'), run(['exec-out', 'screencap', '-p'], true));
}
async function main() {
  if (command === 'inventory') {
    assert.ok(report.version.length > 0, 'Aldus package is not installed');
    report.results.push({ status: 'PASS físico', scenario: 'ADB autorizado e pacote presente', packagePresent: report.version.length > 0 });
  } else if (command === 'saas-unavailable') {
    // Start on Ajustes with the owner's existing session. Do not bypass Auth.
    tap('Meu Plano');
    let all = await waitFor(all => has(all, 'Consulta indisponível'));
    assert.ok(!all.some(n => /Gratuito e permanente\.|Plano Pro/.test(n.text)), 'Unavailable backend cannot invent a plan');
    screenshot('my-plan-unavailable');
    tap('Tentar novamente');
    await waitFor(all => has(all, 'Consulta indisponível'));
    tap('Comparar Planos');
    await waitFor(all => has(all, 'Consulta indisponível'));
    screenshot('compare-unavailable');
    tap('Meu Plano');
    await waitFor(all => has(all, 'Consulta indisponível'));
    tap('Voltar aos Ajustes');
    await waitFor(all => has(all, 'Meu Plano'));
    report.results.push({ status: 'PASS físico', scenario: 'Meu Plano/Comparar: backend indisponível, retry e retorno', commerciallyAvailable: false });
  } else {
    throw Error('Supported commands: inventory, saas-unavailable');
  }
}
main().catch(error => { report.results.push({ status: 'BLOQUEADO', scenario: command, reason: error.message }); process.exitCode = 1; }).finally(() => {
  fs.writeFileSync(path.join(output, command + '-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
