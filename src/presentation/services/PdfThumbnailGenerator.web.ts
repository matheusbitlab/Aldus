import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

if (typeof window !== "undefined") {
  try {
    GlobalWorkerOptions.workerPort = new Worker(
      new URL("../components/pdfjs.worker.ts", import.meta.url)
    );
  } catch {
    /* Fallback */
  }
}

export class WebPdfThumbnailGenerator {
  async generate(uri: string, _bookId: string, pickedFile?: Blob): Promise<string | null> {
    try {
      let loadingTask;
      if (pickedFile) {
        const buffer = await pickedFile.arrayBuffer();
        loadingTask = getDocument({
          data: new Uint8Array(buffer),
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
          cMapPacked: true,
        });
      } else if (uri.startsWith("data:application/pdf;base64,")) {
        const base64 = uri.split(",")[1];
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        loadingTask = getDocument({
          data: bytes,
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
          cMapPacked: true,
        });
      } else {
        loadingTask = getDocument({
          url: uri,
          cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
          cMapPacked: true,
        });
      }

      const pdf = await loadingTask.promise;
      if (pdf.numPages < 1) return null;

      const page = await pdf.getPage(1);
      const unscaledViewport = page.getViewport({ scale: 1 });

      // Target thumbnail width around 300px for sharp cards in 2/3 ratio
      const targetWidth = 300;
      const scale = targetWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return null;

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      return dataUrl;
    } catch {
      return null;
    }
  }
}

export const pdfThumbnailGenerator = new WebPdfThumbnailGenerator();
