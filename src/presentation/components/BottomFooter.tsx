import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useState } from "react";
import { readerNavigationDiagnostic } from "@/src/utils/readerNavigationDiagnostics";

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
  requestedPage?: number | null;
  operationId?: number;
  controlsVisible?: boolean;
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
  requestedPage,
  operationId = 0,
  controlsVisible = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === "web" ? 20 : Math.max(insets.bottom, 20);
  const [preview, setPreview] = useState<number | null>(null);
  const dragging = useRef(false);
  const sliderOperation = useRef<number | null>(null);
  const pendingProgress = requestedPage != null && totalPages > 1 ? (requestedPage - 1) / (totalPages - 1) : null;
  const shownProgress = preview ?? pendingProgress ?? progress;
  const previewPage = totalPages > 0 ? Math.round(shownProgress * Math.max(0, totalPages - 1)) + 1 : pageNumber;
  const trace = (origin: "SLIDER_PREVIEW" | "SLIDER_COMMIT", value: number) => readerNavigationDiagnostic(origin, {
    operationId: sliderOperation.current ?? operationId + 1, requestedPage: Math.round(value * Math.max(0, totalPages - 1)) + 1,
    confirmedPage: pageNumber, currentPage: pageNumber, targetPage: requestedPage ?? pageNumber,
    totalPages, sliderDragging: dragging.current, controlsVisible,
  });

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
          value={shownProgress}
          minimumValue={0}
          maximumValue={1}
          step={totalPages > 1 ? 1 / (totalPages - 1) : 1}
          onSlidingStart={(value) => { sliderOperation.current = operationId + 1; dragging.current = true; setPreview(value); trace("SLIDER_PREVIEW", value); }}
          onValueChange={(value) => { dragging.current = true; setPreview(value); trace("SLIDER_PREVIEW", value); }}
          onSlidingComplete={(value) => {
            dragging.current = false;
            setPreview(null);
            trace("SLIDER_COMMIT", value);
            onChange(value);
            sliderOperation.current = null;
          }}
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
          {Math.round(shownProgress * 100)}% lido
        </Text>
        <Text style={[styles.label, { color: secondaryText }]}>
          {totalPages > 0 ? `${preview !== null ? "Prévia" : requestedPage != null ? "Destino" : "Página"} ${previewPage} de ${totalPages}` : "Calculando páginas..."}
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
