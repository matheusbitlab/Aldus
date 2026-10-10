import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { PDFDocument } from "pdf-lib";
import * as FileSystem from "expo-file-system/legacy";
import { PdfPageViewerProps } from "@/src/presentation/components/PdfPageViewerProps";

export function PdfPageViewer({ uri, pageNumber, pageMode, fitMode, zoom, rotation, onTotalPages }: PdfPageViewerProps) {
  const webView = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const totalPagesCallback = useRef(onTotalPages);

  useEffect(() => {
    totalPagesCallback.current = onTotalPages;
  }, [onTotalPages]);

  // Load PDF file into Base64 and get page count via pdf-lib for instant feedback
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setPdfBase64(null);

    void (async () => {
      try {
        let base64 = "";
        if (uri.startsWith("data:application/pdf;base64,")) {
          base64 = uri.split(",")[1];
        } else if (uri.startsWith("file://") || uri.startsWith("content://") || !uri.includes("://")) {
          base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" } as never);
        } else {
          const res = await fetch(uri);
          const blob = await res.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = String(reader.result ?? "");
              resolve(result.includes(",") ? result.split(",")[1] : result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        if (!active) return;

        // Try getting page count via pdf-lib quickly
        try {
          const binary = atob(base64);
          const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
          const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          if (active) {
            totalPagesCallback.current(pdfDoc.getPageCount() * (pageMode === "double" ? 2 : 1));
          }
        } catch {
          /* pdf-lib fallback to PDF.js inside WebView */
        }

        if (active) {
          setPdfBase64(base64);
        }
      } catch {
        if (active) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [uri, pageMode]);

  // Navigate page without reloading WebView
  useEffect(() => {
    if (pdfBase64) {
      webView.current?.injectJavaScript(`window.renderPage && window.renderPage(${pageNumber}, ${JSON.stringify(pageMode)}, ${JSON.stringify(fitMode)}, ${zoom}, ${rotation}); true;`);
    }
  }, [pageNumber, pageMode, fitMode, zoom, rotation, pdfBase64]);

  const source = useMemo(
    () => ({ html: getPdfViewerHtml(), baseUrl: "https://aldus-reader.local/" }),
    []
  );

  const handleWebViewLoaded = useCallback(() => {
    if (pdfBase64) {
      webView.current?.injectJavaScript(
        `window.loadBase64 && window.loadBase64(${JSON.stringify(pdfBase64)}, ${pageNumber}, ${JSON.stringify(pageMode)}, ${JSON.stringify(fitMode)}, ${zoom}, ${rotation}); true;`
      );
    }
  }, [pageNumber, pageMode, fitMode, zoom, rotation, pdfBase64]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        totalPages?: number;
        pageNumber?: number;
        message?: string;
      };

      if (data.type === "totalPages" && typeof data.totalPages === "number") {
        totalPagesCallback.current(data.totalPages);
      } else if (data.type === "rendered") {
        setLoading(false);
      } else if (data.type === "error") {
        setFailed(true);
        setLoading(false);
      }
    } catch {
      /* Ignore parse error */
    }
  };

  return (
    <View style={styles.stage}>
      {pdfBase64 ? (
        <WebView
          ref={webView}
          source={source}
          style={styles.webview}
          originWhitelist={["*"]}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          onLoadEnd={handleWebViewLoaded}
          onMessage={handleMessage}
        />
      ) : null}

      {loading && !failed ? (
        <View style={styles.status}>
          <ActivityIndicator size="large" color="#315D56" />
          <Text style={styles.message}>Carregando PDF...</Text>
        </View>
      ) : null}

      {failed ? (
        <View style={styles.status}>
          <Text style={styles.message}>Não foi possível abrir este PDF no dispositivo.</Text>
        </View>
      ) : null}
    </View>
  );
}

function getPdfViewerHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: auto;
      background-color: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }
    #container {
      width: 100%;
      height: 100%;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 100%;
      flex: none;
      object-fit: contain;
      background-color: #ffffff;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      display: block;
      border-radius: 2px;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <div id="container">
    <canvas id="pdf-canvas"></canvas>
  </div>
  <script>
    var pdfDoc = null;
    var currentRenderTask = null;
    var currentPageNum = 1;
    var currentPageMode = "single";
    var currentFitMode = "page";
    var currentZoom = 1;
    var currentRotation = 0;

    function post(msg) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function renderPage(logicalPageNum, pageMode, fitMode, zoom, rotation) {
      pageMode = pageMode || currentPageMode;
      fitMode = fitMode || currentFitMode;
      zoom = zoom || currentZoom;
      rotation = rotation || currentRotation;
      var isDouble = pageMode === "double";
      var pageNum = isDouble ? Math.ceil(logicalPageNum / 2) : logicalPageNum;
      var isRightHalf = isDouble && logicalPageNum % 2 === 0;
      if (!pdfDoc) {
        currentPageNum = logicalPageNum;
        currentPageMode = pageMode;
        currentFitMode = fitMode;
        currentZoom = zoom;
        currentRotation = rotation;
        return;
      }
      currentPageNum = logicalPageNum;
      currentPageMode = pageMode;
      currentFitMode = fitMode;
      currentZoom = zoom;
      currentRotation = rotation;
      pdfDoc.getPage(pageNum).then(function(page) {
        if (currentRenderTask) {
          currentRenderTask.cancel();
        }
        var container = document.getElementById("container");
        var canvas = document.getElementById("pdf-canvas");
        var ctx = canvas.getContext("2d");
        var pageRotation = (page.rotate + rotation) % 360;
        var unscaledViewport = page.getViewport({ scale: 1, rotation: pageRotation });
        var containerW = window.innerWidth || container.clientWidth || 360;
        var containerH = window.innerHeight || container.clientHeight || 640;
        var widthScale = containerW / (unscaledViewport.width / (isDouble ? 2 : 1));
        var heightScale = containerH / unscaledViewport.height;
        var fitScale = fitMode === "width" ? widthScale : Math.min(widthScale, heightScale);
        var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        var viewport = page.getViewport({ scale: fitScale * zoom * dpr, rotation: pageRotation });

        canvas.width = Math.ceil(viewport.width / (isDouble ? 2 : 1));
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = (canvas.width / dpr) + "px";
        canvas.style.height = (canvas.height / dpr) + "px";
        canvas.style.objectFit = "contain";
        canvas.style.flex = "none";

        currentRenderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
          transform: isRightHalf ? [1, 0, 0, 1, -canvas.width, 0] : undefined
        });
        currentRenderTask.promise.then(function() {
          currentRenderTask = null;
          post({ type: "rendered", pageNumber: logicalPageNum });
        }).catch(function(err) {
          if (err && err.name !== "RenderingCancelledException") {
            post({ type: "error", message: err.message });
          }
        });
      }).catch(function(err) {
        post({ type: "error", message: err.message });
      });
    }

    window.renderPage = renderPage;

    function loadBase64(base64Data, initialPage, pageMode, fitMode, zoom, rotation) {
      try {
        currentPageNum = Math.max(1, Number(initialPage) || currentPageNum);
        currentPageMode = pageMode || "single";
        currentFitMode = fitMode || "page";
        currentZoom = zoom || 1;
        currentRotation = rotation || 0;
        var raw = window.atob(base64Data);
        var rawLength = raw.length;
        var array = new Uint8Array(new ArrayBuffer(rawLength));
        for (var i = 0; i < rawLength; i++) {
          array[i] = raw.charCodeAt(i);
        }

        if (window.pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          pdfjsLib.getDocument({
            data: array,
            cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
            cMapPacked: true
          }).promise.then(function(pdf) {
            pdfDoc = pdf;
            post({ type: "totalPages", totalPages: pdf.numPages * (currentPageMode === "double" ? 2 : 1) });
            renderPage(currentPageNum, currentPageMode, currentFitMode, currentZoom, currentRotation);
          }).catch(function(err) {
            post({ type: "error", message: err.message });
          });
        } else {
          post({ type: "error", message: "PDF.js não foi carregado." });
        }
      } catch(e) {
        post({ type: "error", message: e.message });
      }
    }

    window.loadBase64 = loadBase64;

    window.addEventListener("resize", function() {
      if (pdfDoc) renderPage(currentPageNum, currentPageMode, currentFitMode, currentZoom, currentRotation);
    });
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    position: "relative",
  },
  webview: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  status: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    gap: 12,
  },
  message: {
    color: "#444",
    fontSize: 13,
    fontWeight: "500",
  },
});
