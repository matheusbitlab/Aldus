import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getDocument, GlobalWorkerOptions, ImageKind, OPS, type PDFPageProxy } from "pdfjs-dist";
import { PdfReflowImage, PdfReflowPageData, PdfReflowTextItem } from "@/src/domain/types/pdfReader";
import { buildPdfReflowDocument } from "@/src/data/local/PdfReflowDocumentBuilder";
import { PdfReflowProgress, PdfReflowProcessorProps } from "@/src/presentation/components/PdfReflowProcessorProps";

interface PdfTextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

export function PdfReflowProcessor({ uri, onProgress, onComplete, onError, onCancel }: PdfReflowProcessorProps) {
  const [progress, setProgress] = useState<PdfReflowProgress>({ currentPage: 0, totalPages: 0 });

  useEffect(() => {
    let active = true;
    try {
      GlobalWorkerOptions.workerPort = new Worker(new URL("./pdfjs.worker.ts", import.meta.url));
    } catch {
      /* Fall back to PDF.js worker configuration. */
    }
    const task = getDocument({
      url: uri,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
      cMapPacked: true,
    });

    void task.promise
      .then(async (pdf) => {
        const pages: PdfReflowPageData[] = [];
        let extractedCharacters = 0;
        let controlCharacters = 0;
        let letterCharacters = 0;
        let corruptPages = 0;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (!active) return;
          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1 });
          const operatorList = await page.getOperatorList();
          const textItems = textContent.items.filter(isTextItem).map((item) => ({
            text: item.str,
            direction: item.dir,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            fontName: item.fontName,
            hasEOL: item.hasEOL,
          }));
          const quality = assessTextExtractionQuality(textItems);
          extractedCharacters += quality.totalChars;
          controlCharacters += quality.controlChars;
          letterCharacters += quality.letterChars;
          if (quality.totalChars > 0 && isClearlyCorruptedTextExtraction(quality)) {
            corruptPages += 1;
            if (isPdfReflowDiagnosticsEnabled()) {
              console.warn("[PDF Reflow] página com texto extraído corrompido", { pageNumber, totalPages: pdf.numPages, quality });
            }
          }
          if (quality.totalChars === 0 && isPdfReflowDiagnosticsEnabled()) {
            console.warn("[PDF Reflow] página sem texto extraído", { pageNumber, totalPages: pdf.numPages });
          }
          const images = await extractPageImages(page, operatorList.fnArray, operatorList.argsArray, viewport.width, viewport.height);
          pages.push({ pageNumber, pageWidth: viewport.width, pageHeight: viewport.height, textItems, images });
          page.cleanup();
          const nextProgress = { currentPage: pageNumber, totalPages: pdf.numPages, imageCount: images.length };
          setProgress(nextProgress);
          onProgress(nextProgress);
        }
        if (active) {
          const overallQuality = {
            totalChars: extractedCharacters,
            letterChars: letterCharacters,
            controlChars: controlCharacters,
          };
          if (isClearlyCorruptedTextExtraction(overallQuality) || (corruptPages > 0 && extractedCharacters > 0 && controlCharacters >= 100 && controlCharacters / extractedCharacters >= 0.2 && letterCharacters / extractedCharacters < 0.35)) {
            onError("A extração de texto deste PDF está corrompida. O PDF Original continua disponível.");
            return;
          }
          const document = buildPdfReflowDocument(pages, pdf.numPages);
          onComplete(document);
        }
      })
      .catch((failure: unknown) => {
        if (active) onError(failure instanceof Error ? failure.message : "Não foi possível extrair o conteúdo deste PDF.");
      });

    return () => {
      active = false;
      void task.destroy();
    };
  }, [uri, onComplete, onError, onProgress]);

  const percentage = progress.totalPages > 0
    ? Math.round((progress.currentPage / progress.totalPages) * 100)
    : 0;

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <ActivityIndicator size="large" color="#B65F42" />
        <Text style={styles.title}>Preparando leitura livre</Text>
        <Text style={styles.description}>
          {progress.totalPages > 0
            ? `Analisando página ${progress.currentPage} de ${progress.totalPages} (${percentage}%) · ${progress.imageCount ?? 0} ilustrações`
            : "Abrindo PDF para análise..."}
        </Text>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function assessTextExtractionQuality(items: Array<{ text: string }>) {
  let totalChars = 0;
  let replacementChars = 0;
  let controlChars = 0;
  let letterChars = 0;

  for (const item of items) {
    const text = item.text ?? "";
    totalChars += text.length;
    for (const char of Array.from(text)) {
      const code = char.codePointAt(0) ?? 0;
      if (char === "�" || char === "\uFFFD") {
        replacementChars += 1;
      }
      if (/^[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]$/u.test(char)) {
        controlChars += 1;
      }
      if (/\p{L}/u.test(char)) {
        letterChars += 1;
      }
      if (code >= 0xE000 && code <= 0xF8FF) {
        // Private Use Area may appear in legitimate PDFs with custom glyph maps.
        // Do not reject the document solely because of it.
      }
    }
  }

  const replacementRatio = totalChars > 0 ? replacementChars / totalChars : 0;
  return {
    totalChars,
    replacementChars,
    controlChars,
    letterChars,
    replacementRatio,
  };
}

function isClearlyCorruptedTextExtraction(quality: { totalChars: number; controlChars: number; letterChars: number }): boolean {
  const totalCharacters = quality.totalChars;
  if (totalCharacters <= 0) return false;

  const controlRatio = quality.controlChars / totalCharacters;
  const letterRatio = quality.letterChars / totalCharacters;

  if (quality.controlChars < 100) return false;
  if (controlRatio < 0.2) return false;

  return letterRatio < 0.35 || (controlRatio > 0.6 && letterRatio < 0.5);
}

function isPdfReflowDiagnosticsEnabled(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("pdfReflowDiagnostics") === "1";
  } catch {
    return false;
  }
}

function isTextItem(item: unknown): item is PdfTextItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<PdfTextItem>;
  return typeof candidate.str === "string" && candidate.str.length > 0 && Array.isArray(candidate.transform) && typeof candidate.width === "number";
}

async function extractPageImages(
  page: PDFPageProxy,
  operators: number[],
  argumentsList: unknown[][],
  pageWidth: number,
  pageHeight: number
): Promise<PdfReflowImage[]> {
  const imageOperators = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintXObject]);
  const candidates: Array<{ source: unknown; bounds: ReturnType<typeof getImageBounds> }> = [];
  let transform = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];

  for (let index = 0; index < operators.length; index += 1) {
    const operator = operators[index];
    const args = argumentsList[index] ?? [];
    if (operator === OPS.save) {
      stack.push(transform);
      transform = [...transform];
    } else if (operator === OPS.restore) {
      transform = stack.pop() ?? transform;
    } else if (operator === OPS.transform && args.length >= 6) {
      transform = multiplyTransform(transform, args.slice(0, 6).map(Number));
    } else if (imageOperators.has(operator)) {
      const bounds = getImageBounds(transform, pageWidth, pageHeight);
      if (bounds.width < 28 || bounds.height < 28) continue;
      candidates.push({ source: typeof args[0] === "string" ? getImageObject(page, args[0]) : args[0], bounds });
    }
  }

  const images = await Promise.all(candidates.map(async (candidate) => {
    const source = candidate.source instanceof Promise ? await candidate.source : candidate.source;
    if (!source || typeof source !== "object") return null;
      const src = imageObjectToDataUri(source as ImageSource);
      return src ? { src, ...candidate.bounds } : null;
  }));
  return images.filter((image): image is PdfReflowImage => image !== null);
}

interface ImageSource {
  width: number;
  height: number;
  kind?: number;
  data?: Uint8ClampedArray | Uint8Array;
  src?: CanvasImageSource;
}

function getImageObject(page: PDFPageProxy, id: string): Promise<unknown> {
  return new Promise((resolve) => {
    let completed = false;
    let timeout: number;
    const finish = (value: unknown) => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeout);
      resolve(value);
    };
    timeout = window.setTimeout(() => {
      try {
        const value = page.commonObjs.get(id, finish);
        if (value) finish(value);
        else finish(undefined);
      } catch {
        finish(undefined);
      }
    }, 1500);
    try {
      const value = page.objs.get(id, finish);
      if (value) finish(value);
    } catch {
      try {
        const value = page.commonObjs.get(id, finish);
        if (value) finish(value);
        else finish(undefined);
      } catch {
        finish(undefined);
      }
    }
  });
}

function multiplyTransform(first: number[], second: number[]): number[] {
  const [a, b, c, d, e, f] = first;
  const [g, h, i, j, k, l] = second;
  return [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f];
}

function getImageBounds(transform: number[], pageWidth: number, pageHeight: number) {
  const [a, b, c, d, e, f] = transform;
  const points = [[e, f], [a + e, b + f], [c + e, d + f], [a + c + e, b + d + f]];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.max(0, Math.min(pageWidth, Math.min(...xs)));
  const right = Math.max(0, Math.min(pageWidth, Math.max(...xs)));
  const top = Math.max(0, Math.min(pageHeight, pageHeight - Math.max(...ys)));
  const bottom = Math.max(0, Math.min(pageHeight, pageHeight - Math.min(...ys)));
  return { x, y: top, width: Math.max(0, right - x), height: Math.max(0, bottom - top) };
}

function imageObjectToDataUri(image: ImageSource): string | undefined {
  const { width, height, data, kind } = image;
  if (!width || !height) return undefined;
  const targetScale = Math.min(1, 1400 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * targetScale));
  canvas.height = Math.max(1, Math.round(height * targetScale));
  const context = canvas.getContext("2d");
  if (!context) return undefined;

  if (data) {
    const rgba = context.createImageData(width, height);
    if (kind === ImageKind.RGBA_32BPP || data.length >= width * height * 4) {
      rgba.data.set(data.subarray(0, width * height * 4));
    } else if (kind === ImageKind.RGB_24BPP || data.length >= width * height * 3) {
      for (let source = 0, target = 0; source < width * height * 3; source += 3, target += 4) {
        rgba.data[target] = data[source];
        rgba.data[target + 1] = data[source + 1];
        rgba.data[target + 2] = data[source + 2];
        rgba.data[target + 3] = 255;
      }
    } else if (kind === ImageKind.GRAYSCALE_1BPP) {
      for (let pixel = 0; pixel < width * height; pixel += 1) {
        const value = data[pixel >> 3] & (1 << (7 - (pixel & 7))) ? 0 : 255;
        const target = pixel * 4;
        rgba.data[target] = value;
        rgba.data[target + 1] = value;
        rgba.data[target + 2] = value;
        rgba.data[target + 3] = 255;
      }
    } else {
      return undefined;
    }
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceCanvas.getContext("2d")?.putImageData(rgba, 0, 0);
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    sourceCanvas.width = 0;
    sourceCanvas.height = 0;
  } else if (image.src) {
    context.drawImage(image.src, 0, 0, canvas.width, canvas.height);
  } else {
    return undefined;
  }
  const dataUri = canvas.toDataURL("image/jpeg", 0.82);
  canvas.width = 0;
  canvas.height = 0;
  return dataUri;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 30, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(21,25,24,0.88)" },
  panel: { alignItems: "center", gap: 14, padding: 24, maxWidth: 360 },
  title: { color: "#F3E5C8", fontSize: 18, fontWeight: "600" },
  description: { color: "#D4C5A9", fontSize: 14, textAlign: "center" },
  cancel: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 18 },
  cancelText: { color: "#F3E5C8", fontSize: 14, fontWeight: "600" },
});
