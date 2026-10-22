import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { ReactNode } from "react";
import { BottomFooter } from "@/src/presentation/components/BottomFooter";
import { TopHeader } from "@/src/presentation/components/TopHeader";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { readerUiDiagnostic, ReaderUiContext } from "@/src/utils/readerUiDiagnostics";

interface Props {
  layoutMode?: "overlay" | "flow";
  children?: ReactNode;
  visible: boolean;
  title: string;
  chapterTitle: string;
  progress: number;
  hideReadingCounts?: boolean;
  pageNumber: number;
  totalPages: number;
  accent: string;
  text: string;
  secondaryText: string;
  background: string;
  onBack: () => void;
  onSettings: () => void;
  onProgressChange: (value: number) => void;
  onPagePrevious: () => void;
  onPageNext: () => void;
  onSearch?: () => void;
  onContents?: () => void;
  onStudy?: () => void;
  onHeaderHeight?: (height: number) => void;
  diagnosticContext?: ReaderUiContext;
  requestedPage?: number | null;
  operationId?: number;
}

export function ReaderControls(readerProps: Props) {
  const { palette } = useAppTheme();
  const props = { ...readerProps, accent: palette.accent, text: palette.text, secondaryText: palette.secondaryText, background: palette.surface };
  const opacity = useRef(new Animated.Value(props.visible ? 1 : 0)).current;
  const isFlow = props.layoutMode === "flow";
  const hasDocument = props.children != null;
  const ControlView = Platform.OS === "web" ? Animated.View : View;
  const controlOpacity = isFlow ? 1 : Platform.OS === "web" ? opacity : props.visible ? 1 : 0;

  useEffect(() => {
    if (Platform.OS !== "web") return;
    Animated.timing(opacity, {
      toValue: props.visible ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [opacity, props.visible]);

  if (hasDocument) {
    return (
      <View
        pointerEvents="box-none"
        style={isFlow ? styles.reflowFlow : styles.reflowOverlay}
      >
        <View
          pointerEvents="box-none"
          style={isFlow ? styles.reflowDocumentFlow : styles.reflowDocumentOverlay}
        >
          {props.children}
        </View>
        <ControlView
          onLayout={event => readerUiDiagnostic("LAYOUT", "reflowHeader", props.diagnosticContext, event.nativeEvent.layout, { pointerEvents: props.visible ? "box-none" : "none", zIndex: 20, overflow: "visible" })}
          pointerEvents={props.visible ? "box-none" : "none"}
          style={[!isFlow && styles.controls, styles.reflowHeader, { opacity: controlOpacity }]}
        >
          <TopHeader
            diagnosticContext={props.diagnosticContext}
            onHeight={props.onHeaderHeight}
            layoutMode={props.layoutMode}
            title={props.title}
            chapterTitle={props.chapterTitle}
            accent={props.accent}
            text={props.text}
            background={props.background}
            onBack={props.onBack}
            onSettings={props.onSettings}
            onSearch={props.onSearch}
            onContents={props.onContents}
            onStudy={props.onStudy}
          />
        </ControlView>
        <ControlView
          onLayout={event => readerUiDiagnostic("LAYOUT", "reflowFooter", props.diagnosticContext, event.nativeEvent.layout, { pointerEvents: props.visible ? "box-none" : "none", zIndex: 20 })}
          pointerEvents={props.visible ? "box-none" : "none"}
          style={[!isFlow && styles.controls, styles.reflowFooter, { opacity: controlOpacity }]}
        >
          <BottomFooter
            requestedPage={props.requestedPage}
            operationId={props.operationId}
            controlsVisible={props.visible}
            hideReadingCounts={props.hideReadingCounts}
            layoutMode={props.layoutMode}
            progress={props.progress}
            pageNumber={props.pageNumber}
            totalPages={props.totalPages}
            accent={props.accent}
            secondaryText={props.secondaryText}
            background={props.background}
            onChange={props.onProgressChange}
            onPrevious={props.onPagePrevious}
            onNext={props.onPageNext}
          />
        </ControlView>
      </View>
    );
  }

  return (
    <ControlView
      pointerEvents={props.visible ? "box-none" : "none"}
      style={[isFlow ? styles.flow : styles.controls, { opacity: controlOpacity }]}
    >
      <TopHeader
        diagnosticContext={props.diagnosticContext}
        onHeight={props.onHeaderHeight}
        layoutMode={props.layoutMode}
        title={props.title}
        chapterTitle={props.chapterTitle}
        accent={props.accent}
        text={props.text}
        background={props.background}
        onBack={props.onBack}
        onSettings={props.onSettings}
        onSearch={props.onSearch}
        onContents={props.onContents}
        onStudy={props.onStudy}
      />
      <BottomFooter
        requestedPage={props.requestedPage}
        operationId={props.operationId}
        controlsVisible={props.visible}
        hideReadingCounts={props.hideReadingCounts}
        layoutMode={props.layoutMode}
        progress={props.progress}
        pageNumber={props.pageNumber}
        totalPages={props.totalPages}
        accent={props.accent}
        secondaryText={props.secondaryText}
        background={props.background}
        onChange={props.onProgressChange}
        onPrevious={props.onPagePrevious}
        onNext={props.onPageNext}
      />
    </ControlView>
  );
}

const styles = StyleSheet.create({
  controls: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  flow: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    flexDirection: "column",
  },
  reflowFlow: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    flexDirection: "column",
    position: "relative",
  },
  reflowOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  reflowDocumentFlow: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  reflowDocumentOverlay: {
    ...StyleSheet.absoluteFill,
  },
  reflowHeader: {
    zIndex: 20,
  },
  reflowFooter: {
    zIndex: 20,
  },
});
