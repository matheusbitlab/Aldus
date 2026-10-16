const assert = require('node:assert/strict');
const config = require('../metro.config');
const rules = config.resolver.blockList;
const blocked = path => rules.some(rule => rule.test(path));
for (const root of ['C:\\Kindle\\', '/tmp/aldus/']) {
  const slash = root.includes('\\') ? '\\' : '/';
  const path = (...parts) => root + parts.join(slash);
  for (const folder of ['eas-archive-final', 'eas-archive-clean', 'saas-tools', 'saas-homologation', 'auth-test-tools', 'layout-test', 'redmi-qa']) {
    assert.ok(blocked(path('.expo', folder, 'app', 'index.tsx')), `Generated source must be excluded: ${folder}`);
  }
  for (const parts of [['app', 'plan', 'index.tsx'], ['src', 'presentation', 'ReaderScreen.tsx'], ['node_modules', 'expo', 'src', 'Expo.ts'], ['.expo', '.virtual-metro-entry'], ['assets', 'Livros', 'fixture.epub']]) {
    assert.equal(blocked(path(...parts)), false, `Runtime input must remain available: ${parts.join('/')}`);
  }
}
assert.ok(config.resolver.assetExts.includes('epub'));
assert.ok(config.resolver.assetExts.includes('wasm'));
assert.ok(rules.length > 1, 'Keep Expo default exclusions');
console.log('PASS Metro excludes copied source/test toolchains on Windows/POSIX and retains runtime sources, virtual entry and book assets.');
