import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  layoutMode?: "overlay" | "flow";
  progress: number;
  pageNumber: number;
  totalPages: number;
  accent: string;
  secondaryText: string;
  background: string;
  onChange: (progress: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function BottomFooter({
  layoutMode = "overlay",
  progress,
  pageNumber,
  totalPages,
  accent,
  secondaryText,
  background,
  onChange,
  onPrevious,
  onNext,
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === "web" ? 20 : Math.max(insets.bottom, 20);

  return (
    <View style={[layoutMode === "flow" ? styles.footerFlow : styles.footer, { backgroundColor: background, paddingBottom }]}>
      <View style={styles.sliderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Página anterior"
          disabled={pageNumber <= 1}
          hitSlop={8}
          onPress={onPrevious}
          style={[styles.navButton, pageNumber <= 1 && styles.disabled]}
        >
          <Ionicons name="chevron-back" size={22} color={accent} />
        </Pressable>
        <Slider
          accessibilityLabel="Progresso da leitura"
          style={styles.slider}
          value={progress}
          minimumValue={0}
          maximumValue={1}
          onValueChange={onChange}
          minimumTrackTintColor={accent}
          maximumTrackTintColor={`${secondaryText}55`}
          thumbTintColor={accent}
          disabled={totalPages < 1}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próxima página"
          disabled={totalPages < 1 || pageNumber >= totalPages}
          hitSlop={8}
          onPress={onNext}
          style={[styles.navButton, (totalPages < 1 || pageNumber >= totalPages) && styles.disabled]}
        >
          <Ionicons name="chevron-forward" size={22} color={accent} />
        </Pressable>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.label, { color: secondaryText }]}>
          {Math.round(progress * 100)}% lido
        </Text>
        <Text style={[styles.label, { color: secondaryText }]}>
          {totalPages > 0 ? `Página ${pageNumber} de ${totalPages}` : "Calculando páginas..."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    zIndex: 10,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  footerFlow: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  slider: {
    flex: 1,
    height: 38,
  },
  disabled: {
    opacity: 0.35,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
});
