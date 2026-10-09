import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readerNavigationDiagnostic, ReaderNavigationOrigin } from "@/src/utils/readerNavigationDiagnostics";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { createEpubReaderDocument } from "@/src/presentation/components/EpubReaderDocument";
import { EpubPageInfo, EpubPageViewerProps, ReaderStudyResult } from "@/src/presentation/components/EpubPageViewerProps";
import { epubDiagnosticConsole as console, markEpubOpenEvent } from "@/src/utils/epubOpenMetrics";

function EpubPageViewerComponent({
  chapters,
  pageNumber,
  initialRestorePending = false,
  restoreTargetReady = false,
  navigationRequest,
  fontSize,
  fontFamily,
  marginSize,
  lineHeight,
  paragraphSpacing,
  maxWidth,
  alignment,
  allowTextSelection,
  searchTerm,
  onSearchResult,
  textColor,
  backgroundColor,
  onPageInfo,
  studyRequest,
  onStudyResult,
  studyHighlights,
}: EpubPageViewerProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const firstPageReported = useRef(false);
  const callback = useRef(onPageInfo);
  const searchCallback = useRef(onSearchResult);
  const studyCallback = useRef(onStudyResult);
  useEffect(() => { studyCallback.current = onStudyResult; }, [onStudyResult]);
  useEffect(() => { if (studyRequest) frame.current?.contentWindow?.postMessage(studyRequest, "*"); }, [studyRequest]);
  useEffect(() => { if (studyHighlights) frame.current?.contentWindow?.postMessage({ type: "studyRenderHighlights", id: -1, highlights: studyHighlights }, "*"); }, [studyHighlights]);
  const [loading, setLoading] = useState(true);
  const [layoutReady, setLayoutReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const viewerRenderCount = useRef(0);
  viewerRenderCount.current++;
  console.log(`[FORENSIC:EpubPageViewer] t=${performance.timeOrigin + performance.now()} render #${viewerRenderCount.current} pageNumber=${pageNumber} chapters=${chapters.length} navigationId=${navigationRequest?.id ?? null}`);

  // Generate initial HTML once per chapters list
  const html = useMemo(
    () => {
      const startedAt = performance.now();
      markEpubOpenEvent("srcdoc_generation_start", {
        chapterCount: chapters.length,
      });
      const documentHtml = createEpubReaderDocument(chapters, {
        initialRestorePending,
        fontSize,
        fontFamily,
        marginSize,
        lineHeight,
        paragraphSpacing,
        maxWidth,
        alignment,
        allowTextSelection,
        textColor,
        backgroundColor,
      });
      markEpubOpenEvent(
        "srcdoc_generation_end",
        { chapterCount: chapters.length, htmlCharacters: documentHtml.length },
        performance.now() - startedAt
      );
      return documentHtml;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapters]
  );

  useEffect(() => {
    callback.current = onPageInfo;
  }, [onPageInfo]);

  useEffect(() => {
    searchCallback.current = onSearchResult;
  }, [onSearchResult]);

  useEffect(() => {
    console.log(`[FORENSIC:EpubPageViewer] t=${performance.timeOrigin + performance.now()} mount`);
    return () => {
      console.log(`[FORENSIC:EpubPageViewer] t=${performance.timeOrigin + performance.now()} unmount`);
    };
  }, []);

  useEffect(() => {
    console.log(`[FORENSIC:EpubPageViewer:srcDoc] t=${performance.timeOrigin + performance.now()} html identity changed length=${html.length}`);
    setLoading(true);
    setRenderError(null);
  }, [html]);

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const info = (typeof event.data === "string" ? JSON.parse(event.data) : event.data) as EpubPageInfo & {
          type?: string;
          message?: string;
          found?: boolean;
        };
        if (info?.type === "navigationDiagnostic") {
          const record = info as unknown as Record<string, unknown>;
          readerNavigationDiagnostic(record.origin as ReaderNavigationOrigin, record);
        } else if (info?.type === "error") {
          console.log(`[FORENSIC:EpubPageViewer:message] t=${performance.timeOrigin + performance.now()} error message=${info.message ?? ""}`);
          setRenderError(info.message ?? "Não foi possível renderizar este EPUB.");
          setLoading(false);
        } else if (info && info.type === "page") {
          if (info.layoutReady) setLayoutReady(true);
          markEpubOpenEvent("pagination_available", {
            pageNumber: info.pageNumber,
            totalPages: info.totalPages,
            chapterCount: info.chapterLocations?.length ?? null,
          });
          if (!firstPageReported.current) {
            firstPageReported.current = true;
            markEpubOpenEvent("first_page_pagination_ready", {
              pageNumber: info.pageNumber,
              totalPages: info.totalPages,
            });
          }
          setLoading(false);
          console.log(`[FORENSIC:EpubPageViewer:message] t=${performance.timeOrigin + performance.now()} received page=${info.pageNumber} total=${info.totalPages} layoutReady=${Boolean(info.layoutReady)} chapter=${info.chapterIndex} from iframe`);
          callback.current(info);
          if (firstPageReported.current) {
            markEpubOpenEvent("first_page_state_received", {
              pageNumber: info.pageNumber,
              totalPages: info.totalPages,
              visiblePixelsMeasured: false,
            });
          }
        } else if (info?.type === "study") {
          studyCallback.current?.(info as unknown as ReaderStudyResult);
        } else if (info?.type === "searchResult") {
          console.log(`[FORENSIC:EpubPageViewer:message] t=${performance.timeOrigin + performance.now()} searchResult found=${Boolean(info.found)}`);
          searchCallback.current?.(Boolean(info.found));
        }
      } catch {
        /* Ignore non-reader messages */
      }
    };
    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  // Update page position dynamically
  useEffect(() => {
    if (!initialRestorePending || !layoutReady || !restoreTargetReady) return;
    console.log(`[FORENSIC:EpubPageViewer:postMessage] t=${performance.timeOrigin + performance.now()} effect -> iframe goToPage(${pageNumber})`);
    frame.current?.contentWindow?.postMessage({ type: "goToPage", pageNumber, origin: "RESTORE", operationId: 0 }, "*");
  }, [initialRestorePending, layoutReady, pageNumber, restoreTargetReady]);

  const wasRestorePending = useRef(initialRestorePending);
  useEffect(() => {
    if (wasRestorePending.current && !initialRestorePending) {
      console.log(`[FORENSIC:EpubPageViewer:postMessage] t=${performance.timeOrigin + performance.now()} restore acknowledged; enabling live page info`);
      frame.current?.contentWindow?.postMessage({ type: "completeInitialRestore" }, "*");
    } else if (!wasRestorePending.current && initialRestorePending) {
      console.log(`[FORENSIC:EpubPageViewer:postMessage] t=${performance.timeOrigin + performance.now()} starting initial restore`);
      frame.current?.contentWindow?.postMessage({ type: "beginInitialRestore" }, "*");
    }
    wasRestorePending.current = initialRestorePending;
  }, [initialRestorePending]);

  useEffect(() => {
    if (!navigationRequest) return;
    console.log(`[FORENSIC:EpubPageViewer:postMessage] t=${performance.timeOrigin + performance.now()} effect -> iframe navigatePage(${navigationRequest.direction}) id=${navigationRequest.id}`);
    frame.current?.contentWindow?.postMessage(
      { ...navigationRequest, operationId: navigationRequest.id, type: navigationRequest.pageNumber !== undefined ? "goToPage" : "navigatePage" },
      "*"
    );
  }, [navigationRequest]);

  useEffect(() => {
    if (searchTerm) {
      console.log(`[FORENSIC:EpubPageViewer:postMessage] t=${performance.timeOrigin + performance.now()} effect -> iframe search`);
      frame.current?.contentWindow?.postMessage({ type: "search", query: searchTerm }, "*");
    }
  }, [searchTerm]);

  // Update typography dynamically without reloading iframe
  useEffect(() => {
    console.log(`[FORENSIC:EpubPageViewer:postMessage] t=${performance.timeOrigin + performance.now()} effect -> iframe updateTypography`);
    frame.current?.contentWindow?.postMessage(
      {
        type: "updateTypography",
        fontSize,
        fontFamily,
        marginSize,
        lineHeight,
        paragraphSpacing,
        maxWidth,
        alignment,
        allowTextSelection,
        textColor,
        backgroundColor,
      },
      "*"
    );
  }, [fontSize, fontFamily, marginSize, lineHeight, paragraphSpacing, maxWidth, alignment, allowTextSelection, textColor, backgroundColor]);

  const attachFrame = useCallback((element: HTMLIFrameElement | null) => {
    frame.current = element;
    console.log(`[FORENSIC:EpubPageViewer:iframe-ref] t=${performance.timeOrigin + performance.now()} ${element ? "attached" : "detached"}`);
    if (element) markEpubOpenEvent("iframe_dom_attached");
  }, []);

  const handleFrameLoad = () => {
    if (studyHighlights) frame.current?.contentWindow?.postMessage({ type: "studyRenderHighlights", id: -1, highlights: studyHighlights }, "*");
    console.log(`[FORENSIC:EpubPageViewer:onLoad] t=${performance.timeOrigin + performance.now()} iframe loaded restorePending=${initialRestorePending}; sending display/${initialRestorePending ? "waiting-for-layout-ready" : `goToPage(${pageNumber})`}/updateTypography`);
    markEpubOpenEvent("iframe_onload");
    try {
      if (initialRestorePending) {
        frame.current?.contentWindow?.postMessage({ type: "beginInitialRestore" }, "*");
      }
      frame.current?.contentWindow?.postMessage({ type: "display" }, "*");
      if (!initialRestorePending) {
        frame.current?.contentWindow?.postMessage({ type: "goToPage", pageNumber }, "*");
      }
      frame.current?.contentWindow?.postMessage(
        {
          type: "updateTypography",
          fontSize,
          fontFamily,
          marginSize,
          lineHeight,
          paragraphSpacing,
          maxWidth,
          alignment,
          allowTextSelection,
          textColor,
          backgroundColor,
        },
        "*"
      );
    } catch {
      /* Ignore frame access error */
    }
  };

  return (
    <View style={[styles.viewport, { backgroundColor }]}>
      <iframe
        ref={attachFrame}
        title="Leitor de EPUB"
        sandbox="allow-scripts"
        srcDoc={html}
        onLoad={handleFrameLoad}
        style={frameStyle}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={textColor} />
          <Text style={[styles.loadingText, { color: textColor }]}>Carregando página...</Text>
        </View>
      ) : null}
      {renderError ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Text style={styles.errorText}>{renderError}</Text>
        </View>
      ) : null}
    </View>
  );
}

// UI-only changes in the surrounding ReaderScreen (such as showing controls)
// must not rerender the EPUB iframe. ReaderScreen keeps onPageInfo stable
// between page/layout updates, so memoization isolates the document subtree.
export const EpubPageViewer = memo(EpubPageViewerComponent);

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: "100%",
    height: "100%",
    minWidth: "100%",
    minHeight: "100%",
    position: "relative",
    overflow: "hidden",
  },
  error: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 12,
    backgroundColor: "rgba(125, 38, 38, 0.94)",
    borderRadius: 6,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    pointerEvents: "none",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
});

const frameStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  minWidth: "100%",
  minHeight: "100%",
  border: "none",
  backgroundColor: "transparent",
};
