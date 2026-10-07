import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coversDirectory = path.join(root, "assets", "covers");
const pdfDirectory = path.join(root, "Livros");
const epubDirectory = path.join(root, "assets", "Livros");
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

await mkdir(coversDirectory, { recursive: true });
await writeDefaultCover(path.join(coversDirectory, "default.jpg"));

for (const fileName of (await readdir(pdfDirectory)).filter((name) => /\.pdf$/i.test(name))) {
  const outputPath = path.join(coversDirectory, `${slugify(path.parse(fileName).name)}.jpg`);
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(await readFile(path.join(pdfDirectory, fileName))),
      useSystemFonts: true,
      useWasm: false,
      wasmUrl: new URL("../node_modules/pdfjs-dist/wasm/", import.meta.url).href,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = 300 / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const cover = await createOptimizedJpeg(canvas, 72);
    await writeFile(outputPath, cover);
    console.log(`${path.basename(outputPath)} ${(await readFile(outputPath)).byteLength} bytes`);
    await loadingTask.destroy();
  } catch (error) {
    console.warn(`Could not render ${fileName}: ${error instanceof Error ? error.message : error}`);
  }
}

for (const fileName of (await readdir(epubDirectory)).filter((name) => /\.epub$/i.test(name))) {
  const outputPath = path.join(coversDirectory, `${slugify(path.parse(fileName).name)}.jpg`);
  try {
    const zip = await JSZip.loadAsync(await readFile(path.join(epubDirectory, fileName)));
    const container = xmlParser.parse(await zip.file("META-INF/container.xml").async("string"));
    const opfPath = container.container.rootfiles.rootfile["@_full-path"];
    const opfDirectory = path.posix.dirname(opfPath);
    const opf = xmlParser.parse(await zip.file(opfPath).async("string")).package;
    const manifestItems = asArray(opf.manifest?.item);
    const metadataItems = asArray(opf.metadata?.meta);
    const legacyCoverId = String(metadataItems.find((item) => item["@_name"] === "cover")?.["@_content"] ?? "");
    const cover = manifestItems.find((item) => String(item["@_properties"] ?? "").split(/\s+/).includes("cover-image"))
      ?? manifestItems.find((item) => String(item["@_id"] ?? "") === legacyCoverId);
    if (!cover?.["@_href"]) continue;

    const coverPath = path.posix.normalize(path.posix.join(opfDirectory, decodeURIComponent(cover["@_href"])));
    const coverFile = zip.file(coverPath);
    if (!coverFile) continue;
    const image = await loadImage(await coverFile.async("nodebuffer"));
    const canvas = createCanvas(300, 450);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 300, 450);
    const scale = Math.min(300 / image.width, 450 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (300 - width) / 2, (450 - height) / 2, width, height);
    const coverImage = await createOptimizedJpeg(canvas, 76);
    await writeFile(outputPath, coverImage);
    console.log(`${path.basename(outputPath)} ${(await readFile(outputPath)).byteLength} bytes`);
  } catch (error) {
    console.warn(`Could not extract ${fileName}: ${error instanceof Error ? error.message : error}`);
  }
}

function asArray(value) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function createOptimizedJpeg(sourceCanvas, initialQuality) {
  let quality = initialQuality;
  let scale = 1;
  let output;
  do {
    const width = Math.max(180, Math.round(sourceCanvas.width * scale));
    const height = Math.max(240, Math.round(sourceCanvas.height * scale));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(sourceCanvas, 0, 0, width, height);
    output = canvas.toBuffer("image/jpeg", quality);
    if (output.byteLength <= 30_000) return output;
    if (quality > 52) quality -= 8;
    else scale *= 0.84;
  } while (scale >= 0.5);
  return output;
}

async function writeDefaultCover(outputPath) {
  const canvas = createCanvas(300, 450);
  const context = canvas.getContext("2d");
  context.fillStyle = "#e8e4dc";
  context.fillRect(0, 0, 300, 450);
  context.strokeStyle = "#a7a093";
  context.lineWidth = 3;
  context.strokeRect(74, 128, 152, 194);
  context.beginPath();
  context.moveTo(150, 130);
  context.lineTo(150, 320);
  context.stroke();
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(96, 180);
  context.lineTo(136, 180);
  context.moveTo(164, 180);
  context.lineTo(204, 180);
  context.moveTo(96, 194);
  context.lineTo(136, 194);
  context.moveTo(164, 194);
  context.lineTo(204, 194);
  context.stroke();
  await writeFile(outputPath, canvas.toBuffer("image/jpeg", 72));
}
