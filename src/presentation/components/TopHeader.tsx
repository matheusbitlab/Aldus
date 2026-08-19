import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props { title: string; chapterTitle: string; accent: string; text: string; onBack: () => void; onSettings: () => void; }
export function TopHeader({ title, chapterTitle, accent, text, onBack, onSettings }: Props) {
  return <View style={styles.header}><Pressable accessibilityLabel="Back to library" hitSlop={12} onPress={onBack}><Ionicons name="arrow-back" size={22} color={text} /></Pressable><View style={styles.heading}><Text numberOfLines={1} style={[styles.title, { color: text }]}>{title}</Text><Text numberOfLines={1} style={[styles.chapter, { color: accent }]}>{chapterTitle}</Text></View><Pressable accessibilityLabel="Open reading settings" hitSlop={12} onPress={onSettings}><Ionicons name="text-outline" size={22} color={text} /></Pressable></View>;
}
const styles = StyleSheet.create({ header: { position: "absolute", zIndex: 2, top: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 18 }, heading: { flex: 1 }, title: { fontSize: 15, fontWeight: "700" }, chapter: { fontSize: 11, marginTop: 3, letterSpacing: 0.3 } });
