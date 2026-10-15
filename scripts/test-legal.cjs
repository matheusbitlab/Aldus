const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const routeFiles = ["privacy", "terms", "copyright", "licenses", "data", "about", "version"];
for (const route of routeFiles) assert.ok(fs.existsSync(path.join(root, "app", "legal", `${route}.tsx`)), `rota legal ausente: ${route}`);

const layout = read("app/_layout.tsx");
const protectedAt = layout.indexOf("<Stack.Protected");
for (const route of routeFiles) {
  const routeAt = layout.indexOf(`name="legal/${route}"`);
  assert.ok(routeAt > -1 && routeAt < protectedAt, `rota legal/${route} deve ser pública`);
}

const settings = read("app/(tabs)/settings.tsx");
for (const label of ["LEGAL E INFORMAÇÕES", "Sobre o Aldus Reader", "Política de Privacidade", "Termos de Uso", "Direitos Autorais e Conteúdo", "Licenças de terceiros", "Privacidade e Dados", "Versão do aplicativo"]) {
  assert.match(settings, new RegExp(label), `item ausente em Ajustes: ${label}`);
}

for (const authFile of ["app/auth/login.tsx", "app/auth/signup.tsx"]) {
  const source = read(authFile);
  assert.match(source, /AuthLegalNotice/);
}
assert.match(read("app/auth/signup.tsx"), /Ao criar uma conta, você declara que leu/);
const authForm = read("src/presentation/components/AuthForm.tsx");
assert.match(authForm, /\/legal\/terms/);
assert.match(authForm, /\/legal\/privacy/);

const content = read("src/legal/legalContent.ts");
const publicLegalText = content + read("src/legal/legalConfig.ts");
for (const expected of ["Supabase", "Google", "Gutendex", "Project Gutenberg", "BibliON", "MEC Livros", "armazenamento local", "Lei nº 13.709/2018", "Lei nº 12.965/2014", "Lei nº 9.610/1998", "c. 1450–1515", "formato octavo", "revisão profissional pendente"]) {
  assert.match(publicLegalText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `conteúdo esperado ausente: ${expected}`);
}
assert.doesNotMatch(publicLegalText, /flashcard|batalha|deck/i, "dados de Flashcards preparados, mas fora desta implantação funcional, não devem ser anunciados publicamente");
assert.match(read("PROJECT_CONTEXT.md"), /Batalha[\s\S]*Supabase/i, "o contexto único deve manter o tratamento técnico de batalha");
for (const forbidden of [/\bTODO\b/, /100% segur[oa]/i, /totalmente (em )?conformidade/i, /garantimos? conformidade/i, /inventou o livro de bolso/i]) {
  assert.doesNotMatch(publicLegalText, forbidden, `afirmação pública proibida: ${forbidden}`);
}

const legalScreen = read("src/presentation/components/legal/LegalDocumentScreen.tsx");
for (const expected of ["ScrollView", "router.back", "router.canGoBack", "useAppTheme", "useSafeAreaInsets"]) assert.match(legalScreen, new RegExp(expected.replace(".", "\\.")));
const metadata = read("src/legal/appMetadata.ts");
assert.match(metadata, /Constants\.expoConfig\?\.version/);
assert.match(metadata, /Constants\.nativeBuildVersion/);
assert.doesNotMatch(read("app/legal/version.tsx"), /version:\s*["']\d/);

const pkg = JSON.parse(read("package.json"));
const generated = read("src/legal/thirdPartyNotices.generated.ts");
for (const dependency of Object.keys(pkg.dependencies)) assert.ok(generated.includes(`"name": "${dependency}"`), `dependência ausente dos avisos: ${dependency}`);
assert.equal((generated.match(/"name": /g) ?? []).length, Object.keys(pkg.dependencies).length, "o inventário público deve conter apenas dependências diretas de runtime");
const noticesCheck = spawnSync(process.execPath, [path.join(root, "scripts", "generate-third-party-notices.cjs"), "--check"], { cwd: root, encoding: "utf8" });
assert.equal(noticesCheck.status, 0, noticesCheck.stderr || noticesCheck.stdout);

console.log(`Legal PASS: ${routeFiles.length} rotas públicas, conteúdo auditável e ${Object.keys(pkg.dependencies).length} dependências de runtime inventariadas.`);
