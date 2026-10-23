import { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { StoredChapter } from "@/src/domain/entities/LibraryBook";
import { Highlight } from "@/src/domain/repositories/HighlightRepository";
import { ReaderPalette } from "@/src/theme/tokens";
import { EpubPageViewerProps, EpubNavigationRequest, EpubPageInfo, ReaderStudyRequest, ReaderStudyResult } from "@/src/presentation/components/EpubPageViewerProps";
import { PdfPageMode } from "@/src/presentation/components/PdfPageViewerProps";
import { PdfFitMode, PdfReadingMode } from "@/src/domain/types/pdfReader";
import { PdfPageViewer } from "@/src/presentation/components/PdfPageViewer";
import { EpubPageViewer } from "@/src/presentation/components/EpubPageViewer";
import { ReaderContent } from "@/src/presentation/components/ReaderContent";
import { ReadingTouchZones } from "@/src/presentation/components/reader/ReadingTouchZones";
import { epubDiagnosticConsole as console } from "@/src/utils/epubOpenMetrics";

export interface DocumentReaderAdapterProps {
  mimeType: string;
  filePath: string | null;
  chapters: StoredChapter[];
  pdfPage: number;
  pdfPageMode: PdfPageMode;
  pdfFitMode: PdfFitMode;
  pdfZoom: number;
  pdfRotation: number;
  pdfReadingMode: PdfReadingMode;
  pdfReflowChapters: StoredChapter[];
  searchTerm: string;
  onSearchResult: (found: boolean) => void;
  epubPage: number;
  initialRestorePending?: boolean;
  restoreTargetReady?: boolean;
  restoreTextAnchor?: EpubPageViewerProps["restoreTextAnchor"];
  epubNavigationRequest?: EpubNavigationRequest | null;
  settings: {
    fontSize: number;
    fontFamily: string;
    marginSize: number;
    lineHeight?: number;
    paragraphSpacing?: number;
    maxWidth?: number;
    alignment?: "left" | "justify";
    allowTextSelection?: boolean;
    palette: ReaderPalette;
    theme: string;
  };
  onPdfTotalPages: (count: number) => void;
  onEpubPageInfo: (info: EpubPageInfo) => void;
  onProgressChange: (progress: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onToggleControls: () => void;
  studyRequest?: ReaderStudyRequest | null;
  onStudyResult?: (result: ReaderStudyResult) => void;
  studyHighlights?: Highlight[];
  studySelecting?: boolean;
  panelOpen?: boolean;
}

/**
 * Universal Hybrid Document Reader Adapter Factory.
 * Determines document format (PDF vs EPUB) and dispatches to optimized
 * platform-specific renderers (Web canvas / Mobile WebView) while providing
 * unified Instagram Stories-style touch & keyboard navigation zones.
 */
export function DocumentReaderAdapter({
  mimeType,
  filePath,
  chapters,
  pdfPage,
  pdfPageMode,
  pdfFitMode,
  pdfZoom,
  pdfRotation,
  pdfReadingMode,
  pdfReflowChapters,
  searchTerm,
  onSearchResult,
  epubPage,
  initialRestorePending,
  restoreTargetReady,
  restoreTextAnchor,
  epubNavigationRequest,
  settings,
  onPdfTotalPages,
  onEpubPageInfo,
  onProgressChange,
  onPreviousPage,
  onNextPage,
  onToggleControls,
  studyRequest,
  onStudyResult,
  studyHighlights,
  studySelecting,
  panelOpen,
}: DocumentReaderAdapterProps) {
  const renderCount = useRef(0);
  const previousEpubProps = useRef<{
    chapters: StoredChapter[];
    epubPage: number;
    navigationRequest?: EpubNavigationRequest | null;
    onEpubPageInfo: (info: EpubPageInfo) => void;
    onSearchResult: (found: boolean) => void;
    fontSize: number;
    fontFamily: string;
    marginSize: number;
    textColor: string;
    backgroundColor: string;
  } | null>(null);
  renderCount.current += 1;
  const isPdf =
    mimeType === "application/pdf" ||
    (filePath ? /\.pdf$/i.test(filePath) : false);

  const isEpub =
    mimeType === "application/epub+zip" ||
    (filePath ? /\.epub$/i.test(filePath) : false) ||
    (!isPdf && chapters.length > 0);

  const epubChapters = isPdf ? pdfReflowChapters : chapters;
  const currentEpubProps = {
    chapters: epubChapters,
    epubPage,
    navigationRequest: epubNavigationRequest,
    onEpubPageInfo,
    onSearchResult,
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    marginSize: settings.marginSize,
    textColor: settings.palette.text,
    backgroundColor: settings.palette.background,
  };
  const previous = previousEpubProps.current;
  const changedEpubProps = previous
    ? Object.keys(currentEpubProps).filter((key) => !Object.is(
        currentEpubProps[key as keyof typeof currentEpubProps],
        previous[key as keyof typeof previous]
      ))
    : ["initial"];
  previousEpubProps.current = currentEpubProps;
  console.log(`[FORENSIC:DocumentReaderAdapter] t=${performance.timeOrigin + performance.now()} render #${renderCount.current} mime=${mimeType} isEpub=${isEpub} isPdf=${isPdf} epubPage=${epubPage} changedEpubProps=${changedEpubProps.join(",")}`);

  useEffect(() => {
    console.log(`[FORENSIC:DocumentReaderAdapter] t=${performance.timeOrigin + performance.now()} mount`);
    return () => {
      console.log(`[FORENSIC:DocumentReaderAdapter] t=${performance.timeOrigin + performance.now()} unmount`);
    };
  }, []);

  return (
    <View style={styles.container}>
      {isPdf && pdfReadingMode === "original" && filePath ? (
        <View style={styles.pdfViewport}>
          <PdfPageViewer
            uri={filePath}
            pageNumber={pdfPage}
            pageMode={pdfPageMode}
            fitMode={pdfFitMode}
            zoom={pdfZoom}
            rotation={pdfRotation}
            onTotalPages={onPdfTotalPages}
          />
        </View>
      ) : isEpub || (isPdf && pdfReadingMode === "reflow") ? (
        <View style={styles.epubViewport}>
          <EpubPageViewer
            chapters={epubChapters}
            pageNumber={epubPage}
            initialRestorePending={initialRestorePending}
            restoreTargetReady={restoreTargetReady}
            restoreTextAnchor={restoreTextAnchor}
            navigationRequest={epubNavigationRequest}
            fontSize={settings.fontSize}
            fontFamily={settings.fontFamily}
            marginSize={settings.marginSize}
            lineHeight={settings.lineHeight}
            paragraphSpacing={settings.paragraphSpacing}
            maxWidth={settings.maxWidth}
            alignment={settings.alignment}
            allowTextSelection={settings.allowTextSelection}
            searchTerm={searchTerm}
            onSearchResult={onSearchResult}
            textColor={settings.palette.text}
            backgroundColor={settings.palette.background}
            onPageInfo={onEpubPageInfo}
            studyRequest={studyRequest}
            onStudyResult={onStudyResult}
            studyHighlights={studyHighlights}
          />
        </View>
      ) : (
        <ReaderContent
          chapters={chapters}
          onProgressChange={onProgressChange}
        />
      )}

      {/* Unified touch zones overlay: Left 30% prev, Center 40% toggle, Right 30% next */}
      {!studySelecting && !panelOpen ? <ReadingTouchZones
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        onToggleControls={onToggleControls}
      /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },
  pdfViewport: {
    flex: 1,
    width: "100%",
    height: "100%",
    paddingHorizontal: 0,
  },
  epubViewport: {
    flex: 1,
    width: "100%",
    height: "100%",
    paddingHorizontal: 0,
  },
});
