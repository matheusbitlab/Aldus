import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { PdfPageViewerProps } from "@/src/presentation/components/PdfPageViewerProps";

type PdfPage = Awaited<ReturnType<PDFDocumentProxy["getPage"]>>;

export function PdfPageViewer({ uri, pageNumber, pageMode, fitMode, zoom, rotation, onTotalPages }: PdfPageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totalPagesCallback = useRef(onTotalPages);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    totalPagesCallback.current = onTotalPages;
  }, [onTotalPages]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setDocument(null);

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
      .then((pdf) => {
        if (!active) return;
        setDocument(pdf);
        totalPagesCallback.current(pdf.numPages * (pageMode === "double" ? 2 : 1));
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      void task.destroy();
    };
  }, [uri, pageMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!document || !canvas || !viewport.width || !viewport.height) return;

    let active = true;
    let renderTask: ReturnType<PdfPage["render"]> | null = null;
    setLoading(true);

    void document
      .getPage(pageMode === "double" ? Math.ceil(pageNumber / 2) : pageNumber)
      .then((page) => {
        if (!active) return;
        const isDouble = pageMode === "double";
        const isRightHalf = isDouble && pageNumber % 2 === 0;
        const pageRotation = (page.rotate + rotation) % 360;
        const baseViewport = page.getViewport({ scale: 1, rotation: pageRotation });
        const contentWidth = isDouble ? baseViewport.width / 2 : baseViewport.width;
        const widthScale = viewport.width / contentWidth;
        const heightScale = viewport.height / baseViewport.height;
        const fitScale = fitMode === "width" ? widthScale : Math.min(widthScale, heightScale);
        const deviceScale = Math.min(window.devicePixelRatio || 1, 2.5);
        const pageViewport = page.getViewport({
          scale: fitScale * zoom * deviceScale,
          rotation: pageRotation,
        });

        // High-resolution backing store
        canvas.width = Math.ceil(pageViewport.width / (isDouble ? 2 : 1));
        canvas.height = Math.ceil(pageViewport.height);

        // Force full viewport fit with dynamic flex and object-fit: contain
        canvas.style.width = `${canvas.width / deviceScale}px`;
        canvas.style.height = `${canvas.height / deviceScale}px`;
        canvas.style.maxWidth = "none";
        canvas.style.maxHeight = "none";
        canvas.style.objectFit = "contain";
        canvas.style.flex = "none";
        canvas.style.display = "block";

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas indisponível.");

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport: pageViewport,
          transform: isRightHalf ? [1, 0, 0, 1, -canvas.width, 0] : undefined,
        });
        return renderTask.promise;
      })
      .then(() => {
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, pageNumber, pageMode, fitMode, zoom, rotation, viewport]);

  return (
    <View
      style={styles.stage}
      onLayout={({ nativeEvent }) =>
        setViewport({
          width: nativeEvent.layout.width,
          height: nativeEvent.layout.height,
        })
      }
    >
      <canvas ref={canvasRef} style={canvasStyle} />
      {loading && !failed ? (
        <View style={styles.status}>
          <ActivityIndicator size="large" color="#315D56" />
          <Text style={styles.message}>Carregando página...</Text>
        </View>
      ) : null}
      {failed ? (
        <View style={styles.status}>
          <Text style={styles.message}>Não foi possível abrir este PDF.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "scroll",
    position: "relative",
  },
  status: {
    position: "absolute",
    alignItems: "center",
    gap: 12,
  },
  message: {
    color: "#555",
    fontSize: 13,
    fontWeight: "500",
  },
});

const canvasStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  maxWidth: "none",
  maxHeight: "none",
  objectFit: "contain",
  flex: 1,
  backgroundColor: "#ffffff",
  boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.18)",
  borderRadius: "2px",
};