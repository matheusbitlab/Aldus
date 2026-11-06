// Copia para o site (dist/) somente o acervo embutido declarado, com hash SHA-256 conferido.
// Ativo: src/data/library/bundledBookManifest.json (domínio público, bundledCatalog.ts).
// Legado: src/data/library/legacyBundledAssets.json — mantido apenas para contas existentes até a
// etapa 3 da retirada (ver PROJECT_CONTEXT.md §8). Arquivo não declarado ou com hash divergente
// falha o export em vez de ser publicado. Para retirar o legado do dist: ALDUS_DIST_ACTIVE_BOOKS_ONLY=1.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, "assets", "Livros");
const destDir = path.join(projectRoot, "dist", "assets", "Livros");
const vercelSrc = path.join(projectRoot, "vercel.json");
const vercelDest = path.join(projectRoot, "dist", "vercel.json");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(projectRoot, file), "utf8"));

const active = readJson("src/data/library/bundledBookManifest.json");
const legacy = readJson("src/data/library/legacyBundledAssets.json");
const activeOnly = process.env.ALDUS_DIST_ACTIVE_BOOKS_ONLY === "1";

// Remove qualquer cópia anterior para que o dist reflita exatamente a política atual.
fs.rmSync(destDir, { recursive: true, force: true });

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  const problems = [];
  let copiedActive = 0, copiedLegacy = 0;
  for (const name of fs.readdirSync(srcDir)) {
    if (!/\.(pdf|epub)$/i.test(name)) continue;
    const activeEntry = active.find((item) => item.fileName === name);
    const legacyEntry = legacy.find((item) => item.fileName === name);
    const entry = activeEntry ?? legacyEntry;
    const bytes = fs.readFileSync(path.join(srcDir, name));
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (!entry) problems.push(`${name}: não declarado em bundledBookManifest.json nem em legacyBundledAssets.json`);
    else if (entry.hash !== hash) problems.push(`${name}: hash diferente do declarado`);
    else if (!activeEntry && activeOnly) continue;
    else {
      fs.writeFileSync(path.join(destDir, name), bytes);
      if (activeEntry) copiedActive++; else copiedLegacy++;
    }
  }
  if (problems.length) {
    fs.rmSync(destDir, { recursive: true, force: true });
    console.error(`Acervo embutido recusado para o site:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`dist/assets/Livros: ${copiedActive} em domínio público + ${copiedLegacy} legado(s) mantido(s) para contas existentes (hashes conferidos).`);
} else {
  console.warn("Diretório assets/Livros não encontrado.");
}

if (fs.existsSync(vercelSrc)) {
  fs.copyFileSync(vercelSrc, vercelDest);
  console.log("vercel.json copiado com sucesso para dist/vercel.json.");
}
