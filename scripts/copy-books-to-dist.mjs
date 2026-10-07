import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, "assets", "Livros");
const destDir = path.join(projectRoot, "dist", "assets", "Livros");
const vercelSrc = path.join(projectRoot, "vercel.json");
const vercelDest = path.join(projectRoot, "dist", "vercel.json");

if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log("Livros copiados com sucesso para dist/assets/Livros.");
} else {
  console.warn("Diretório assets/Livros não encontrado.");
}

if (fs.existsSync(vercelSrc)) {
  fs.copyFileSync(vercelSrc, vercelDest);
  console.log("vercel.json copiado com sucesso para dist/vercel.json.");
}
