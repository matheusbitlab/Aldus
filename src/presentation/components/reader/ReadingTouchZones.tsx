import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { epubDiagnosticConsole as console } from "@/src/utils/epubOpenMetrics";

interface Props {
  onPreviousPage: () => void;
  onNextPage: () => void;
  onToggleControls: () => void;
}

export function ReadingTouchZones({ onPreviousPage, onNextPage, onToggleControls }: Props) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.altKey || event.ctrlKey || event.metaKey ||
        target?.closest("input, textarea, select, button, a, [role='button'], [contenteditable='true']")
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPreviousPage();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNextPage();
      } else if (event.key === "Escape") {
        event.preventDefault();
        onToggleControls();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNextPage, onPreviousPage, onToggleControls]);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Página anterior"
        style={styles.leftZone}
        onPress={onPreviousPage}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Alternar menus e controles de leitura"
        style={styles.centerZone}
        onPress={() => {
          console.log(`[FORENSIC:center-click] t=${performance.timeOrigin + performance.now()} center Pressable onPress`);
          onToggleControls();
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próxima página"
        style={styles.rightZone}
        onPress={onNextPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: "20%",
    bottom: "20%",
    left: 0,
    right: 0,
    flexDirection: "row",
    zIndex: 5,
  },
  leftZone: {
    width: "30%",
    height: "100%",
  },
  centerZone: {
    width: "40%",
    height: "100%",
  },
  rightZone: {
    width: "30%",
    height: "100%",
  },
});
