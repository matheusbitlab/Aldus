const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const root = path.resolve('dist');
if (!fs.existsSync(path.join(root, 'index.html'))) throw Error('Web export missing.');
// Vercel CLI archive deployments omit .git. Preserve verified content hashes without inventing an unknown commit.
const git = (...args) => {
  try { return cp.execFileSync('git', args, { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
};
const checkedOut = git('rev-parse', '--verify', 'HEAD');
const declared = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;
if (declared && !/^[a-f0-9]{40}$/i.test(declared)) throw Error('Invalid CI/deployment commit identifier.');
if (checkedOut && declared && checkedOut.toLowerCase() !== declared.toLowerCase()) throw Error('Build commit does not match CI/deployment commit.');
const commit = checkedOut || (declared ? declared.toLowerCase() : null);
const dirty = checkedOut ? !!git('status', '--porcelain', '--untracked-files=no') : null;
const commitSource = checkedOut ? 'git' : declared ? 'deployment-env' : 'unavailable';
const files = [];
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) walk(absolute);
    else if (item.isFile() && /\.(js|html|css)$/.test(item.name)) files.push(path.relative(root, absolute).replaceAll('\\', '/'));
  }
}
walk(root); files.sort();
const hash = crypto.createHash('sha256');
for (const file of files) { hash.update(file); hash.update('\0'); hash.update(fs.readFileSync(path.join(root, file))); }
const metadata = { schemaVersion: 1, commit, dirty, commitSource,
  builtAt: new Date().toISOString(), environment: process.env.VERCEL_ENV ?? (process.env.CI ? 'ci' : 'local'),
  contentSha256: hash.digest('hex'), webFiles: files.length };
fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log(`Web build identified: ${commit?.slice(0, 12) ?? 'unavailable (archive without Git metadata)'}; dirty=${metadata.dirty}; ${files.length} Web files. No environment values exported.`);
