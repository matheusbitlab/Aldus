import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { readerUiDiagnostic, ReaderUiContext } from "@/src/utils/readerUiDiagnostics";

interface Props {
  layoutMode?: "overlay" | "flow";
  title: string;
  chapterTitle: string;
  accent: string;
  text: string;
  background?: string;
  onBack: () => void;
  onSettings: () => void;
  onSearch?: () => void;
  onContents?: () => void;
  onStudy?: () => void;
  onHeight?: (height: number) => void;
  diagnosticContext?: ReaderUiContext;
}

export function TopHeader({
  layoutMode = "overlay",
  title,
  chapterTitle,
  accent,
  text,
  background,
  onBack,
  onSettings,
  onSearch,
  onContents,
  onStudy,
  onHeight,
  diagnosticContext,
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === "web" ? 16 : Math.max(insets.top, 16);
  const press = (button: string, action: () => void) => () => { readerUiDiagnostic("PRESS", button, diagnosticContext); action(); };

  return (
    <View
      onLayout={event => { onHeight?.(event.nativeEvent.layout.height); readerUiDiagnostic("LAYOUT", "header", diagnosticContext, event.nativeEvent.layout, { zIndex: 20, elevation: 4, pointerEvents: "auto" }); }}
      style={[
        layoutMode === "flow" ? styles.headerFlow : styles.header,
        { paddingTop },
        background ? { backgroundColor: background } : null,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar à biblioteca"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={press("back", onBack)}
        style={styles.iconButton}
      >
        <Ionicons name="arrow-back" size={24} color={text} />
      </Pressable>
      <View style={styles.heading}>
        <Text numberOfLines={1} style={[styles.title, { color: text }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.chapter, { color: accent }]}>
          {chapterTitle}
        </Text>
      </View>
      {onSearch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar no livro"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={press("search", onSearch)}
          style={styles.iconButton}
        >
          <Ionicons name="search-outline" size={22} color={text} />
        </Pressable>
      ) : null}
      {onContents ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir sumário"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={press("contents", onContents)}
          style={styles.iconButton}
        >
          <Ionicons name="list-outline" size={22} color={text} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir configurações de leitura"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={press("settings", onSettings)}
        style={styles.iconButton}
      >
        <Ionicons name="text-outline" size={24} color={text} />
      </Pressable>
      {onStudy ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir marcadores e notas" hitSlop={8} onPress={press("study", onStudy)} style={styles.iconButton}><Ionicons name="bookmark-outline" size={22} color={text} /></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    zIndex: 20,
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerFlow: {
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  chapter: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
