// Deterministic suites only. Browser/physical/remote QA are separate, never silently claimed.
const { spawnSync } = require('node:child_process');
const tests = [
  'beta-preparation', 'metro-test-isolation', 'pt-br', 'marketing', 'admin-security', 'admin-client', 'admin-presentation', 'admin-layout',
  'saas-quotas', 'saas-quota-client', 'saas-quota-driver',
  'saas-schema', 'saas-client', 'saas-compatibility', 'saas-experience', 'saas-ui',
  'auth', 'auth-flows', 'auth-callback', 'auth-native-callback', 'username-login', 'integrated-security', 'battle-account',
  'flashcards', 'flashcard-scoring', 'flashcard-storage', 'flashcard-sessions', 'flashcard-ui', 'flashcard-battles',
  'library-account', 'library-sync', 'library-remote', 'library-cancellation', 'library-files', 'library-reading-sync', 'library-coordinator', 'library-restart', 'library-rls', 'library-ui', 'library-organization',
  'google-drive', 'drive-tree', 'drive-download', 'source-catalog', 'source-library-actions', 'source-indexing', 'source-ownership', 'source-preparation', 'source-performance', 'source-ui', 'auth-native-pkce',
  'book-covers', 'cover-thumbnails', 'epub-resources', 'epub-native-read', 'epub-image-readiness', 'book-import', 'download-import', 'catalogs', 'reading-anchors', 'study-storage',
  'settings-navigation', 'reader-navigation', 'reader-native', 'reader-bytecode', 'reader-screen', 'reader-settings', 'reader-preferences-layout', 'reflow-native-scheduling', 'reflow-finalization', 'reflow-native-lifecycle', 'pdf-reflow',
  'community-domain', 'community-data', 'community-provider', 'community-ui', 'community-schema', 'legal', 'web-build', 'android-build-command',
];
let failures = 0;
for (const name of tests) {
  const start = Date.now();
  const result = spawnSync(process.execPath, [`scripts/test-${name}.cjs`], { encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
  const ok = !result.error && result.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${Date.now() - start}ms)`);
  if (!ok) { failures++; console.error((result.error?.message ?? '') + '\n' + (result.stdout ?? '').slice(-4000) + '\n' + (result.stderr ?? '').slice(-4000)); }
}
console.log(`${tests.length - failures}/${tests.length} critical suites passed. Remote/Android/browser results are separate.`);
process.exitCode = failures ? 1 : 0;
