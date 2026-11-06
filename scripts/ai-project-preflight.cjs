#!/usr/bin/env node
'use strict';

// Local read-only inventory. Do not import app code, load env files, or contact services.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function options(args) {
  const result = { root: path.resolve(__dirname, '..'), json: false, help: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') result.json = true;
    else if (args[i] === '--help') result.help = true;
    else if (args[i] === '--root' && args[i + 1] && !args[i + 1].startsWith('--')) result.root = path.resolve(args[++i]);
    else throw new Error('Argumento inválido. Use --help.');
  }
  return result;
}

function git(root, ...args) {
  const result = spawnSync('git', args, {
    cwd: root, encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024,
    windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  // Git errors may contain remote URLs/configuration. Never forward raw stderr.
  if (result.error || result.status !== 0) throw new Error(`Não foi possível consultar Git (${args[0]}). Confira a raiz e a instalação do Git.`);
  return result.stdout;
}

function changes(porcelain) {
  const fields = porcelain.split('\0');
  const result = [];
  for (let i = 0; i < fields.length; i++) {
    if (!fields[i]) continue;
    const entry = { status: fields[i].slice(0, 2), path: fields[i].slice(3) };
    if (/[RC]/.test(entry.status)) entry.from = fields[++i];
    result.push(entry);
  }
  return result;
}

function inspect(root) {
  const present = relative => fs.existsSync(path.join(root, relative));
  if (!present('package.json') || !present('PROJECT_CONTEXT.md') || !present('BUGS_ATUAIS.md')) {
    throw new Error('Raiz inválida: esperados package.json, PROJECT_CONTEXT.md e BUGS_ATUAIS.md do Aldus.');
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.name !== 'aldus-reader') throw new Error('Este utilitário aceita somente o projeto aldus-reader.');
  const gitRoot = git(root, 'rev-parse', '--show-toplevel').trim();
  const normalize = value => {
    const resolved = fs.realpathSync(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  if (normalize(root) !== normalize(gitRoot)) throw new Error('Use --root com a raiz exata do repositório Aldus.');
  const worktree = changes(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=normal'));
  const skillsRoot = path.join(root, '.agents', 'skills');
  const skills = fs.existsSync(skillsRoot)
    ? fs.readdirSync(skillsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())
      .map(entry => `.agents/skills/${entry.name}/SKILL.md`).filter(present).sort()
    : [];
  const requiredDocs = ['AGENTS.md', 'PROJECT_CONTEXT.md', 'BUGS_ATUAIS.md', 'README.md'];
  const toolPaths = {
    nodeModules: 'node_modules',
    reactTestTools: '.expo/auth-test-tools/node_modules/react-test-renderer',
    postgresTestTools: '.expo/library-db-test/node_modules/@electric-sql/pglite',
    indexedDbTestTools: '.expo/flashcard-db-test/node_modules/fake-indexeddb',
    layoutTestTools: '.expo/layout-test/node_modules/yoga-layout',
    browserBundler: '.expo/reader-matrix-tools/node_modules/esbuild',
    androidProject: 'android/app/build.gradle',
  };
  const warnings = [];
  if (worktree.length) warnings.push('Há alterações locais: preserve-as e revise o diff pertinente antes de editar.');
  if (!present('node_modules')) warnings.push('Dependências ausentes: consulte o README antes de instalar pelo lockfile.');
  if (Number(process.versions.node.split('.')[0]) !== 24) warnings.push('O README documenta Node 24; confira compatibilidade antes dos gates.');
  if (requiredDocs.some(doc => !present(doc))) warnings.push('Faltam instruções/documentos esperados; confira o checkout.');
  if (!skills.length) warnings.push('Nenhuma skill local encontrada; confira .agents/skills.');
  return {
    schemaVersion: 1, inspectedAt: new Date().toISOString(), root: path.resolve(root),
    node: process.version, platform: process.platform, gitVersion: git(root, '--version').trim(),
    branch: git(root, 'branch', '--show-current').trim() || '(detached HEAD)',
    head: git(root, 'rev-parse', 'HEAD').trim(), dirty: worktree.length > 0, worktree,
    documents: requiredDocs.map(file => ({ path: file, present: present(file) })),
    skills, scripts: Object.keys(pkg.scripts ?? {}).sort(),
    toolsPresent: Object.fromEntries(Object.entries(toolPaths).map(([name, file]) => [name, present(file)])),
    envLocalPresent: present('.env.local'), warnings,
    limits: 'Presença de arquivos não certifica versões, testes, build, credenciais, deploy ou aparelho. Nenhum serviço, env ou dado pessoal foi lido.',
    next: 'Leia AGENTS.md e PROJECT_CONTEXT.md inteiro (mapa e protocolo); abra docs/context/ só se o mapa indicar; carregue a skill de continuidade.',
  };
}

function main() {
  let opts;
  try {
    opts = options(process.argv.slice(2));
    if (opts.help) {
      console.log('Uso: node scripts/ai-project-preflight.cjs [--json] [--root CAMINHO]\nInspeção local somente leitura, sem instalar, testar, compilar, carregar env ou acessar rede/aparelho.');
      return;
    }
    const snapshot = inspect(opts.root);
    if (opts.json) console.log(JSON.stringify(snapshot, null, 2));
    else {
      console.log(`Aldus — inspeção local\nRaiz: ${snapshot.root}\nBranch: ${snapshot.branch}\nHEAD: ${snapshot.head}\nNode: ${snapshot.node}\nGit: ${snapshot.gitVersion}`);
      console.log(`\nWorktree: ${snapshot.dirty ? 'com alterações' : 'limpo'}`);
      snapshot.worktree.forEach(entry => console.log(`${entry.status} ${JSON.stringify(entry.path)}${entry.from ? ` <- ${JSON.stringify(entry.from)}` : ''}`));
      console.log('\nDocumentos:');
      snapshot.documents.forEach(doc => console.log(`${doc.present ? 'OK' : 'AUSENTE'} ${doc.path}`));
      console.log('\nSkills:');
      snapshot.skills.forEach(file => console.log(file));
      console.log('\nFerramentas (somente presença):');
      Object.entries(snapshot.toolsPresent).forEach(([name, present]) => console.log(`${name}: ${present ? 'presente' : 'ausente'}`));
      snapshot.warnings.forEach(warning => console.log(`\nATENÇÃO: ${warning}`));
      console.log(`\n${snapshot.limits}\nPróximo passo: ${snapshot.next}\nComandos npm atuais: use --json ou leia package.json.`);
    }
  } catch {
    // Do not echo parsed file contents, CLI arguments, environment, or external errors.
    const message = 'Falha na inspeção. Confira --help, Git, a raiz Aldus e os JSON do checkout. Nenhum dado de configuração foi exibido.';
    if (opts?.json || process.argv.includes('--json')) console.log(JSON.stringify({ error: message }));
    else console.error(message);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
