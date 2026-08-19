import { useCallback } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { Chapter } from "@/src/domain/types/reader";
import { useReaderSettings } from "@/src/presentation/contexts/ReaderSettingsContext";
import { ChapterRenderer } from "@/src/presentation/components/ChapterRenderer";

interface Props { chapters: Chapter[]; onProgressChange: (progress: number) => void; }
export function ReaderContent({ chapters, onProgressChange }: Props) {
  const { marginSize, palette } = useReaderSettings();
  const { height } = useWindowDimensions();
  const renderItem = useCallback(({ item }: { item: Chapter }) => <ChapterRenderer chapter={item} />, []);
  return <FlatList data={chapters} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={[styles.content, { paddingHorizontal: marginSize, paddingTop: height * 0.12, paddingBottom: height * 0.2 }]} showsVerticalScrollIndicator={false} onScroll={(event) => onProgressChange(event.nativeEvent.contentOffset.y / Math.max(1, event.nativeEvent.contentSize.height - height))} scrollEventThrottle={250} style={{ backgroundColor: palette.background }} />;
}
const styles = StyleSheet.create({ content: { flexGrow: 1 } });
