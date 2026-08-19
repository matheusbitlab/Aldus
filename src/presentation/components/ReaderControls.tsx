import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { BottomFooter } from "@/src/presentation/components/BottomFooter";
import { TopHeader } from "@/src/presentation/components/TopHeader";

interface Props { visible: boolean; title: string; chapterTitle: string; progress: number; pageNumber: number; totalPages: number; accent: string; text: string; secondaryText: string; onBack: () => void; onSettings: () => void; onProgressChange: (value: number) => void; }
export function ReaderControls(props: Props) {
  const opacity = useRef(new Animated.Value(props.visible ? 1 : 0)).current;
  useEffect(() => { Animated.timing(opacity, { toValue: props.visible ? 1 : 0, duration: 180, useNativeDriver: true }).start(); }, [opacity, props.visible]);
  return <Animated.View pointerEvents={props.visible ? "box-none" : "none"} style={[styles.controls, { opacity }]}><TopHeader title={props.title} chapterTitle={props.chapterTitle} accent={props.accent} text={props.text} onBack={props.onBack} onSettings={props.onSettings} /><BottomFooter progress={props.progress} pageNumber={props.pageNumber} totalPages={props.totalPages} accent={props.accent} secondaryText={props.secondaryText} onChange={props.onProgressChange} /></Animated.View>;
}
const styles = StyleSheet.create({ controls: { ...StyleSheet.absoluteFillObject, zIndex: 2 } });
