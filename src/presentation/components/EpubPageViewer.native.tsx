import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { createEpubReaderDocument } from "@/src/presentation/components/EpubReaderDocument";
import { EpubPageInfo, EpubPageViewerProps, ReaderStudyResult } from "@/src/presentation/components/EpubPageViewerProps";
import { readerNavigationDiagnostic, ReaderNavigationOrigin } from "@/src/utils/readerNavigationDiagnostics";

export function EpubPageViewer({
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
  const webView = useRef<WebView>(null);
  const callback = useRef(onPageInfo);
  const searchCallback = useRef(onSearchResult);
  const studyCallback = useRef(onStudyResult);
  useEffect(() => { studyCallback.current = onStudyResult; }, [onStudyResult]);
  useEffect(() => {
    if (studyRequest) webView.current?.injectJavaScript(`window.readerStudy && window.readerStudy(${JSON.stringify(studyRequest)}); true;`);
  }, [studyRequest]);
  useEffect(() => {
    if (studyHighlights) webView.current?.injectJavaScript(`window.readerStudy && window.readerStudy(${JSON.stringify({ type: "studyRenderHighlights", id: -1, highlights: studyHighlights })}); true;`);
  }, [studyHighlights]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Generate initial HTML once per chapters list
  const html = useMemo(
    () =>
      createEpubReaderDocument(chapters, {
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
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapters]
  );
  const source = useMemo(() => ({ html, baseUrl: "https://kindle-reader.local/" }), [html]);

  useEffect(() => {
    callback.current = onPageInfo;
  }, [onPageInfo]);

  useEffect(() => {
    searchCallback.current = onSearchResult;
  }, [onSearchResult]);

  useEffect(() => {
    setLoading(true);
    setLoaded(false);
    setLayoutReady(false);
    setRenderError(null);
  }, [html]);

  // Turn page smoothly via JS injection
  useEffect(() => {
    if (!loaded || !initialRestorePending || !layoutReady || !restoreTargetReady) return;
    webView.current?.injectJavaScript(`window.goToPage && window.goToPage(${pageNumber}, 0, 'RESTORE'); true;`);
  }, [loaded, initialRestorePending, layoutReady, restoreTargetReady, pageNumber]);

  useEffect(() => {
    if (!loaded) return;
    const type = initialRestorePending ? "beginInitialRestore" : "completeInitialRestore";
    webView.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: {type: '${type}'} })); true;`);
  }, [loaded, initialRestorePending]);

  useEffect(() => {
    if (!loaded || !navigationRequest) return;
    const command = { ...navigationRequest, operationId: navigationRequest.id,
      type: navigationRequest.pageNumber !== undefined ? "goToPage" : "navigatePage" };
    webView.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(command)} })); true;`);
  }, [loaded, navigationRequest]);

  useEffect(() => {
    if (loaded && searchTerm) {
      webView.current?.injectJavaScript(`window.searchText && window.searchText(${JSON.stringify(searchTerm)}); true;`);
    }
  }, [loaded, searchTerm]);

  // Update typography dynamically without reloading WebView
  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({
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
    });
    webView.current?.injectJavaScript(`window.updateTypography && window.updateTypography(${payload}); true;`);
  }, [loaded, fontSize, fontFamily, marginSize, lineHeight, paragraphSpacing, maxWidth, alignment, allowTextSelection, textColor, backgroundColor]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const info = JSON.parse(event.nativeEvent.data) as EpubPageInfo & { type?: string; message?: string; found?: boolean };
      if (info?.type === "navigationDiagnostic") {
        const record = info as unknown as Record<string, unknown>;
        readerNavigationDiagnostic(record.origin as ReaderNavigationOrigin, record);
      } else if (info?.type === "error") {
        setRenderError(info.message ?? "Não foi possível renderizar este EPUB.");
        setLoading(false);
      } else if (info && info.type === "page") {
        if (info.layoutReady) setLayoutReady(true);
        setLoading(false);
        callback.current(info);
      } else if (info?.type === "study") {
        studyCallback.current?.(info as unknown as ReaderStudyResult);
      } else if (info?.type === "searchResult") {
        searchCallback.current?.(Boolean(info.found));
      }
    } catch {
      /* Ignore non-reader messages */
    }
  };

  return (
    <View style={[styles.viewport, { backgroundColor }]}>
      <WebView
        ref={webView}
        source={source}
        style={[styles.webview, { backgroundColor }]}
        originWhitelist={["*"]}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        directionalLockEnabled
        setSupportMultipleWindows={false}
        onMessage={handleMessage}
        onLoadEnd={() => {
          setLoaded(true);
          if (!initialRestorePending) webView.current?.injectJavaScript(`window.goToPage && window.goToPage(${pageNumber}, 0, 'RESTORE'); true;`);
          if (studyHighlights) webView.current?.injectJavaScript(`window.readerStudy && window.readerStudy(${JSON.stringify({ type: "studyRenderHighlights", id: -1, highlights: studyHighlights })}); true;`);
        }}
        onError={({ nativeEvent }) => {
          setRenderError(nativeEvent.description || "Não foi possível abrir este EPUB.");
          setLoading(false);
        }}
        onHttpError={({ nativeEvent }) => {
          setRenderError(`Falha ao carregar recurso do EPUB (${nativeEvent.statusCode}).`);
          setLoading(false);
        }}
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

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
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
