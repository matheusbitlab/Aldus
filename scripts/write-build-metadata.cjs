const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const root = path.resolve('dist');
if (!fs.existsSync(path.join(root, 'index.html'))) throw Error('Web export missing.');
const git = (...args) => cp.execFileSync('git', args, { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD'), declared = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
if (declared && declared !== commit) throw Error('Build commit does not match CI/deployment commit.');
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
const metadata = { schemaVersion: 1, commit, dirty: !!git('status', '--porcelain', '--untracked-files=no'),
  builtAt: new Date().toISOString(), environment: process.env.VERCEL_ENV ?? (process.env.CI ? 'ci' : 'local'),
  contentSha256: hash.digest('hex'), webFiles: files.length };
fs.writeFileSync(path.join(root, 'build-info.json'), JSON.stringify(metadata, null, 2) + '\n');
console.log(`Web build identified: ${commit.slice(0, 12)}; dirty=${metadata.dirty}; ${files.length} Web files. No environment values exported.`);
