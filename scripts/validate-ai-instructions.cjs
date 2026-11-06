#!/usr/bin/env node
'use strict';

// Validate the instruction package without executing any workflow it describes.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const failures = [];
const fail = message => failures.push(message);
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const skillsRoot = path.join(root, '.agents', 'skills');
const folders = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory());
const markdown = ['AGENTS.md', 'README.md'];
const skillPaths = [];

for (const folder of folders) {
  const relative = `.agents/skills/${folder.name}/SKILL.md`;
  if (!fs.existsSync(path.join(root, relative))) { fail(`${folder.name}: SKILL.md ausente`); continue; }
  skillPaths.push(relative);
  const content = read(relative);
  const frontmatter = content.match(/^---\r?\nname: ([a-z0-9-]+)\r?\ndescription: ("[^\r\n]+")\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) fail(`${relative}: frontmatter esperado com name e description em string JSON/YAML`);
  else {
    if (frontmatter[1] !== folder.name || folder.name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(folder.name)) fail(`${relative}: nome incompatível com a pasta`);
    try {
      const description = JSON.parse(frontmatter[2]);
      if (!description.trim() || description.length > 1024) fail(`${relative}: description vazia ou longa demais`);
    } catch { fail(`${relative}: description não é string válida`); }
  }
  const pending = [path.join(root, '.agents', 'skills', folder.name)];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (entry.name.endsWith('.md')) markdown.push(path.relative(root, full));
    }
  }
}

const linked = new Set();
for (const relative of markdown) {
  const content = read(relative);
  if (/^\s*\[TODO:[^\n]*\]\s*$/m.test(content)) fail(`${relative}: scaffold não concluído`);
  for (const match of content.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const destination = path.resolve(path.dirname(path.join(root, relative)), decodeURIComponent(target.split('#')[0]));
    if (!fs.existsSync(destination)) fail(`${relative}: link local inexistente: ${target}`);
    linked.add(path.relative(root, destination).split(path.sep).join('/'));
  }
  // Literal executable references only; prose/examples can name parameters separately.
  for (const match of content.matchAll(/\bnpm(?:\.cmd)? run ([\w:-]+)/g)) {
    if (!Object.hasOwn(pkg.scripts ?? {}, match[1])) fail(`${relative}: npm script inexistente: ${match[1]}`);
  }
  for (const match of content.matchAll(/\bnode (scripts\/[\w.-]+\.(?:cjs|mjs|js))/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) fail(`${relative}: utilitário inexistente: ${match[1]}`);
  }
}
for (const relative of skillPaths) if (!linked.has(relative)) fail(`${relative}: skill sem link no pacote de instruções`);
if (!skillPaths.length) fail('Nenhuma skill encontrada.');

if (failures.length) {
  failures.forEach(message => console.error(`FAIL ${message}`));
  process.exitCode = 1;
} else {
  console.log(`PASS ${skillPaths.length} skills; ${markdown.length} documentos; frontmatter, links e comandos locais conferidos.`);
  console.log('Validação estrutural: não comprova descoberta pela interface da IA nem executa testes do aplicativo.');
}
