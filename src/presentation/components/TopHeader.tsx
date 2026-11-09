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

/** Hex #RRGGBB + alfa; outras notações (nome, rgb) seguem sem transparência em vez de virarem cor inválida. */
const withAlpha = (color: string, alpha: string) => /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;

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
        { paddingTop, borderBottomColor: withAlpha(text, "1F") },
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
        <Text numberOfLines={1} style={[styles.chapter, { color: withAlpha(text, "B3") }]}>
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

// Moldura editorial discreta: linha fina em vez de sombra, título serifado, alvos de 44.
// Só aparência: posição, ordem, rótulos e onLayout (altura medida) são contrato do Reader.
const serif = Platform.OS === "web" ? 'Literata, Georgia, "Times New Roman", serif' : Platform.OS === "android" ? "serif" : Platform.OS === "ios" ? "Georgia" : undefined;

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    zIndex: 20,
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  headerFlow: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontFamily: serif,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  chapter: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
});
