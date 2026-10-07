import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { ReactNode } from "react";
import { BottomFooter } from "@/src/presentation/components/BottomFooter";
import { TopHeader } from "@/src/presentation/components/TopHeader";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

interface Props {
  layoutMode?: "overlay" | "flow";
  children?: ReactNode;
  visible: boolean;
  title: string;
  chapterTitle: string;
  progress: number;
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
}

export function ReaderControls(readerProps: Props) {
  const { palette } = useAppTheme();
  const props = { ...readerProps, accent: palette.accent, text: palette.text, secondaryText: palette.secondaryText, background: palette.surface };
  const opacity = useRef(new Animated.Value(props.visible ? 1 : 0)).current;
  const isFlow = props.layoutMode === "flow";
  const hasDocument = props.children != null;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: props.visible ? 1 : 0,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
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
        <Animated.View
          pointerEvents={props.visible ? "box-none" : "none"}
          style={[styles.reflowHeader, { opacity: isFlow ? 1 : opacity }]}
        >
          <TopHeader
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
        </Animated.View>
        <Animated.View
          pointerEvents={props.visible ? "box-none" : "none"}
          style={[styles.reflowFooter, { opacity: isFlow ? 1 : opacity }]}
        >
          <BottomFooter
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
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      pointerEvents={props.visible ? "box-none" : "none"}
      style={[isFlow ? styles.flow : styles.controls, { opacity: isFlow ? 1 : opacity }]}
    >
      <TopHeader
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
    </Animated.View>
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
