const assert = require('node:assert/strict');
const path = require('node:path');
const config = require('../metro.config');
const rules = config.resolver.blockList;
assert.equal(new Set(rules.map(rule => rule.flags)).size, 1, 'Metro composes exclusions only when regex flags match');
const cliRoot = path.dirname(require.resolve('@expo/cli/package.json', { paths: [path.dirname(require.resolve('expo/package.json'))] }));
const { composeMetroIgnorePatterns } = require(path.join(cliRoot, 'build/src/utils/composeMetroIgnorePatterns.js'));
const combined = composeMetroIgnorePatterns(rules);
const blocked = candidate => combined.test(candidate);
for (const root of ['C:\\Kindle\\', '/tmp/aldus/', '', '.\\']) {
  const slash = root.includes('\\') ? '\\' : '/';
  const path = (...parts) => root + parts.join(slash);
  for (const folder of ['eas-archive-final', 'eas-archive-clean', 'saas-tools', 'saas-homologation', 'auth-test-tools', 'layout-test', 'redmi-qa']) {
    assert.ok(blocked(path('.expo', folder, 'app', 'index.tsx')), `Generated source must be excluded: ${folder}`);
  }
  for (const parts of [['android','app','build','generated','fixture.js'], ['android','.kotlin','session'], ['node_modules','expo-modules-core','android','build','generated','fixture.js'], ['modules','aldus-pdf-ocr','android','.cxx','fixture'], ['.browser-diagnostic-chrome-all','Cache','fixture'], ['.expo','dev','logs','start.log']]) {
    assert.ok(blocked(path(...parts)), `Generated churn must not reach watcher: ${parts.join('/')}`);
  }
  for (const parts of [['app', 'plan', 'index.tsx'], ['src', 'presentation', 'ReaderScreen.tsx'], ['node_modules', 'expo', 'src', 'Expo.ts'], ['node_modules', 'package', 'dist', 'index.js'], ['.expo', '.virtual-metro-entry'], ['assets', 'Livros', 'fixture.epub']]) {
    assert.equal(blocked(path(...parts)), false, `Runtime input must remain available: ${parts.join('/')}`);
  }
}
for (const generated of ['dist/assets/fixture.js', 'dist\\assets\\fixture.js', '.\\dist\\assets\\fixture.js', path.resolve(__dirname, '../dist/assets/fixture.js')]) assert.ok(blocked(generated), 'Exclude project export: ' + generated);
for (const generated of ['artifacts/delivery/web-preview/_expo/entry.js', 'artifacts\\apk\\app.apk', '.\\artifacts\\delivery\\index.html', path.resolve(__dirname, '../artifacts/delivery/index.html')]) assert.ok(blocked(generated), 'Exclude local delivery archive: ' + generated);
assert.equal(blocked(path.resolve(__dirname, '../node_modules/package/artifacts/runtime.js')), false, 'Dependency artifact folders remain available');
assert.ok(config.resolver.assetExts.includes('epub'));
assert.ok(config.resolver.assetExts.includes('wasm'));
assert.ok(rules.length > 1, 'Keep Expo default exclusions');
console.log('PASS Metro excludes copied source/test toolchains on Windows/POSIX and retains runtime sources, virtual entry and book assets.');
