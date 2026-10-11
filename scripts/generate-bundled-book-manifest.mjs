import { createHash } from 'node:crypto';
import { createReadStream, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const files = execFileSync('git', ['ls-files', '-z', 'assets/Livros'], { encoding: 'utf8' }).split('\0').filter(file => /\.(pdf|epub)$/i.test(file));
const entries = [];
for (const file of files) {
  const hash = createHash('sha256'); let size = 0;
  for await (const bytes of createReadStream(file)) { hash.update(bytes); size += bytes.length; }
  const contentHash = hash.digest('hex'), format = /\.pdf$/i.test(file) ? 'pdf' : 'epub';
  const fileName = file.split('/').pop();
  let legacy = 2166136261;
  for (const character of fileName.toLowerCase()) legacy = Math.imul(legacy ^ character.charCodeAt(0), 16777619);
  entries.push({ fileName, format, id: `bundled-${format}-${contentHash}`, hash: contentHash, size, legacyId: `bundled-${format}-${(legacy >>> 0).toString(16)}` });
}
writeFileSync('src/data/library/bundledBookManifest.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`Generated ${entries.length} bundled content identities with streaming SHA-256.`);
