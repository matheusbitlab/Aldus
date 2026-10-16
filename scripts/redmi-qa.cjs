// Physical USB smoke tests. Never installs, clears data, changes accounts or
// calls backend APIs directly. Reader tests use normal progress persistence.
// Screenshots stay in ignored .expo/redmi-qa.
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
let notificationSetting;
let networkSettings;
let scenario = 'precondition';
function nodes() {
  shell('uiautomator', 'dump', '--compressed', '/sdcard/aldus-qa-window.xml');
  const xml = run(['exec-out', 'cat', '/sdcard/aldus-qa-window.xml']);
  return [...xml.matchAll(/<node\b[^>]+>/g)].map(([tag]) => {
    const get = key => new RegExp(key + '="([^"]*)"').exec(tag)?.[1] || '';
    return { text: get('text'), label: get('content-desc'), package: get('package'), scrollable: get('scrollable') === 'true', selected: get('selected') === 'true', checked: get('checked') === 'true', bounds: get('bounds').match(/-?\d+/g)?.map(Number) };
  }).filter(n => n.package === packageName && n.bounds && n.bounds[2] > n.bounds[0] && n.bounds[3] > n.bounds[1] && n.bounds[0] < screenWidth && n.bounds[1] < screenHeight && n.bounds[2] > 0 && n.bounds[3] > 0);
}
function tap(label) {
  const all = nodes();
  const n = all.find(n => n.label === label) || all.find(n => n.text === label) || all.find(n => n.label.startsWith(label));
  assert.ok(n, 'Missing control: ' + label);
  const [l,t,r,b] = n.bounds;
  console.log('TAP', JSON.stringify({ label, bounds: n.bounds }));
  input('tap', Math.round((Math.max(0,l)+Math.min(screenWidth,r))/2), Math.round((Math.max(0,t)+Math.min(screenHeight,b))/2));
}
const has = (all, text) => all.some(n => n.text === text || n.label === text);
const hasText = (all, text) => all.some(n => n.text === text);
const readingPage = all => {
  const page = all.filter(n => n.bounds[1] > screenHeight * .8).map(n => n.text).map(text => /^Página (\d+) de (\d+)$/.exec(text)).find(Boolean);
  return page && { current: +page[1], total: +page[2] };
};
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
async function protectCaptures() {
  notificationSetting = shell('settings', 'get', 'global', 'heads_up_notifications_enabled').trim();
  shell('settings', 'put', 'global', 'heads_up_notifications_enabled', '0');
  await new Promise(resolve => setTimeout(resolve, 5000));
}
async function readerReady(expected) {
  const started = Date.now();
  const all = await waitFor(all => {
    if (!has(all, 'Buscar no livro') && !hasText(all, 'Carregando página...') && has(all, 'Alternar menus e controles de leitura')) {
      input('tap', Math.round(screenWidth / 2), Math.round(screenHeight * .45));
      return false;
    }
    const page = readingPage(all);
    return page && !hasText(all, 'Carregando página...') && (!expected || page.current === expected.current && page.total === expected.total);
  });
  console.log('PAGE_ACK', JSON.stringify({ ...readingPage(all), automationWaitMs: Date.now() - started }));
  return readingPage(all);
}
async function main() {
  if (command === 'inventory') {
    assert.ok(report.version.length > 0, 'Aldus package is not installed');
    report.results.push({ status: 'PASS físico', scenario: 'ADB autorizado e pacote presente', packagePresent: report.version.length > 0 });
  } else if (command === 'saas-unavailable') {
    // Start on Ajustes with the owner's existing session. Do not bypass Auth.
    assert.ok(nodes().some(n=>n.label==='Meu Plano'), 'Start on Ajustes with Meu Plano row visible');
    await protectCaptures();
    scenario = 'SaaS unavailable navigation';
    tap('Meu Plano');
    let all = await waitFor(all => has(all, 'Sua conta, sua biblioteca e o espaço privado na nuvem.') && has(all, 'Consulta indisponível'));
    assert.ok(!all.some(n => /Gratuito e permanente\.|Plano Pro/.test(n.text)), 'Unavailable backend cannot invent a plan');
    screenshot('my-plan-unavailable');
    tap('Tentar novamente');
    await waitFor(all => has(all, 'Consulta indisponível'));
    tap('Comparar Planos');
    await waitFor(all => has(all, 'A leitura é para todos. Compare a capacidade disponível no catálogo do Aldus.') && !has(all, 'Sua conta, sua biblioteca e o espaço privado na nuvem.') && has(all, 'Consulta indisponível'));
    screenshot('compare-unavailable');
    tap('Meu Plano');
    await waitFor(all => has(all, 'Sua conta, sua biblioteca e o espaço privado na nuvem.') && !has(all, 'A leitura é para todos. Compare a capacidade disponível no catálogo do Aldus.') && has(all, 'Consulta indisponível'));
    for (let attempt = 0; attempt < 6 && !has(nodes(), 'Voltar aos Ajustes'); attempt++) {
      input('swipe', Math.round(screenWidth * .8), Math.round(screenHeight * .8), Math.round(screenWidth * .8), Math.round(screenHeight * .35), 500);
    }
    tap('Voltar aos Ajustes');
    await waitFor(all => has(all, 'Ajustes') && all.some(n=>n.label==='Meu Plano'));
    report.results.push({ status: 'PASS físico', scenario: 'Meu Plano/Comparar: backend indisponível, retry e retorno', commerciallyAvailable: false });
  } else if (command === 'admin-unavailable') {
    await protectCaptures();
    await waitFor(all=>has(all,'Sua Biblioteca')||has(all,'Meu Plano')||has(all,'Painel administrativo'));
    scenario = 'Native direct Admin route unavailable/denied';
    shell('am','start','-a','android.intent.action.VIEW','-d','aldus://admin',packageName);
    const all=await waitFor(all=>has(all,'Acesso administrativo indisponível'));
    assert.ok(!hasText(all,'Usuários cadastrados'));
    assert.ok(!has(all,'Configurar autenticador TOTP'));
    screenshot('admin-native-unavailable');
    tap('Voltar aos Ajustes');
    await waitFor(all=>has(all,'Ajustes')&&all.some(n=>n.label==='Meu Plano'));
    report.results.push({status:'PASS físico',scenario,authorizedAdminNotTested:true,remoteOwnerNotProvisioned:true});
  } else if (command === 'saas-offline') {
    assert.ok(has(nodes(), 'Meu Plano'), 'Start on Ajustes with Meu Plano visible');
    await protectCaptures();
    networkSettings = {
      wifi: shell('settings', 'get', 'global', 'wifi_on').trim(),
      data: shell('settings', 'get', 'global', 'mobile_data').trim(),
    };
    assert.ok(['0','1'].includes(networkSettings.wifi) && ['0','1'].includes(networkSettings.data), 'Unknown network setting; do not change it');
    scenario = 'Physical offline plan and local reading';
    shell('svc','wifi','disable');
    shell('svc','data','disable');
    await new Promise(resolve => setTimeout(resolve, 3000));
    assert.equal(shell('settings','get','global','wifi_on').trim(), '0');
    assert.equal(shell('settings','get','global','mobile_data').trim(), '0');
    tap('Meu Plano');
    const unavailable = await waitFor(all => has(all, 'Consulta indisponível'));
    assert.ok(!unavailable.some(n => /Plano Pro|Gratuito e permanente\./.test(n.text)));
    screenshot('my-plan-offline');
    tap('Comparar Planos');
    await waitFor(all => has(all, 'Consulta indisponível'));
    screenshot('compare-offline');
    input('keyevent','KEYCODE_BACK');
    await waitFor(all => has(all, 'Voltar aos Ajustes'));
    tap('Voltar aos Ajustes');
    await waitFor(all => has(all, 'Biblioteca') && has(all, 'Meu Plano'));
    tap('Biblioteca');
    const bookLabel = process.argv[3];
    assert.ok(bookLabel?.startsWith('Abrir '), 'Provide exact existing local book label');
    await waitFor(all => has(all, bookLabel));
    tap(bookLabel);
    const page = await readerReady();
    tap('Próxima página');
    const next = await readerReady({ current: page.current + 1, total: page.total });
    tap('Voltar à biblioteca');
    await waitFor(all => has(all, bookLabel));
    tap(bookLabel);
    assert.deepEqual(await readerReady(next), next);
    report.results.push({ status: 'PASS físico', scenario, page: next, metroOverUsb: true, releaseOfflineColdStartProven: false });
  } else if (command === 'reader-controls') {
    // Explicit label avoids selecting an arbitrary library book. Start with that
    // book open. --restart simulates process death only after returning to Library.
    const bookLabel = process.argv[3];
    assert.ok(bookLabel?.startsWith('Abrir '), 'Provide the exact existing book accessibility label');
    assert.ok(has(nodes(), 'Alternar menus e controles de leitura'), 'Start in the selected book Reader');
    await protectCaptures();
    scenario = 'Reader pagination';
    console.log('STEP', scenario);
    const initial = await readerReady();
    for (let step = 1; step <= 3; step++) {
      tap('Próxima página');
      const next = await readerReady({ current: initial.current + step, total: initial.total });
      assert.equal(next.current, initial.current + step);
      assert.equal(next.total, initial.total);
    }
    const target = await readerReady();
    tap('Página anterior');
    assert.equal((await readerReady({ current: target.current - 1, total: target.total })).current, target.current - 1);
    tap('Próxima página');
    assert.deepEqual(await readerReady(target), target);
    report.results.push({ status: 'PASS físico', scenario: 'Reader footer next/previous', target });
    for (const [label, title] of [['Buscar no livro','Buscar no livro'], ['Abrir sumário','Sumário'], ['Abrir configurações de leitura','Aparência'], ['Abrir marcadores e notas','Marcadores e notas']]) {
      scenario = 'Reader panel: ' + title;
      console.log('STEP', scenario);
      await new Promise(resolve => setTimeout(resolve, 1000));
      tap(label);
      // A book can itself contain the heading "Sumário". Require the native
      // modal marker as well, so content cannot impersonate an opened panel.
      const marker = title === 'Marcadores e notas' ? 'Nome do marcador' : 'Fechar preferências';
      await waitFor(all => hasText(all, title) && has(all, marker));
      input('keyevent','KEYCODE_BACK');
      await waitFor(all => !has(all, marker) && readingPage(all));
      assert.deepEqual(await readerReady(target), target, 'Panel must preserve reading position');
      report.results.push({ status: 'PASS físico', scenario, page: target.current });
    }
    scenario = 'Reader reopen';
    console.log('STEP', scenario);
    screenshot('amendoas-before-reopen');
    tap('Voltar à biblioteca');
    let library = await waitFor(all => all.some(n => /^\d+ livros$/.test(n.text)));
    report.libraryCount = library.find(n => /^\d+ livros$/.test(n.text)).text;
    await waitFor(all => has(all, bookLabel));
    tap(bookLabel);
    assert.deepEqual(await readerReady(target), target);
    report.results.push({ status: 'PASS físico', scenario: 'Header Back/Library/reopen', target });
    if (process.argv.includes('--restart')) {
      scenario = 'Reader cold reopen';
      console.log('STEP', scenario);
      tap('Voltar à biblioteca');
      await waitFor(all => all.some(n => /^\d+ livros$/.test(n.text)));
      shell('am','force-stop',packageName);
      shell('am','start','-a','android.intent.action.VIEW','-d','exp+aldus-reader://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',packageName);
      await waitFor(all => all.some(n => /^\d+ livros$/.test(n.text)));
      await waitFor(all => has(all, bookLabel));
      tap(bookLabel);
      assert.deepEqual(await readerReady(target), target);
      report.results.push({ status: 'PASS físico', scenario: 'Process stop/relaunch/reopen; no data clearing', target, metroOverUsb: true });
    }
    screenshot('amendoas-after-reopen');
  } else {
    throw Error('Supported commands: inventory, saas-unavailable, admin-unavailable, saas-offline, reader-controls');
  }
}
main().catch(error => { report.results.push({ status: scenario === 'precondition' ? 'BLOQUEADO' : 'FAIL físico', scenario, reason: error.message }); process.exitCode = 1; }).finally(() => {
  if (networkSettings) {
    try {
      shell('svc','wifi',networkSettings.wifi === '1' ? 'enable' : 'disable');
      shell('svc','data',networkSettings.data === '1' ? 'enable' : 'disable');
      report.networkSettingsRestored = true;
    } catch { report.networkSettingsRestored = false; process.exitCode = 1; }
  }
  if (notificationSetting !== undefined) {
    try {
      if (notificationSetting === 'null') shell('settings', 'delete', 'global', 'heads_up_notifications_enabled');
      else shell('settings', 'put', 'global', 'heads_up_notifications_enabled', notificationSetting);
      report.notificationSettingRestored = true;
    } catch { report.notificationSettingRestored = false; process.exitCode = 1; }
  }
  fs.writeFileSync(path.join(output, command + '-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
