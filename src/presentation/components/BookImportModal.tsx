import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BookImportState, bookImportPhaseLabel, isBookImportTerminal } from "@/src/domain/types/bookImport";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

interface Props {
  state: BookImportState;
  onCancel: () => void;
  onClose: () => void;
  onOpenBook: () => void;
  onImportAnother: () => void;
}

export function BookImportModal({ state, onCancel, onClose, onOpenBook, onImportAnother }: Props) {
  const { palette } = useAppTheme();
  const visible = state.phase !== "idle" && state.phase !== "selecting";
  const terminal = isBookImportTerminal(state.phase);
  const ratio = state.progress && state.progress.total > 0
    ? Math.min(1, Math.max(0, state.progress.completed / state.progress.total))
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={state.cancellable ? onCancel : terminal ? onClose : undefined}>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.separator }]}>
          <Text style={[styles.title, { color: palette.text }]}>Importando livro</Text>
          {state.fileName ? <Text numberOfLines={2} style={[styles.fileName, { color: palette.text }]}>{state.fileName}</Text> : null}
          {state.format ? <Text style={[styles.meta, { color: palette.secondaryText }]}>{state.format.toUpperCase()}{state.fileSize ? ` · ${formatBytes(state.fileSize)}` : ""}</Text> : null}

          {!terminal ? <ActivityIndicator color={palette.accent} size="large" /> : null}
          <Text accessibilityLiveRegion="polite" style={[styles.phase, { color: palette.secondaryText }]}>{bookImportPhaseLabel(state.phase)}</Text>

          {ratio !== null ? (
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }} style={[styles.track, { backgroundColor: palette.surfaceSecondary }]}>
              <View style={[styles.value, { backgroundColor: palette.accent, width: `${Math.round(ratio * 100)}%` }]} />
            </View>
          ) : null}
          {ratio !== null ? <Text style={[styles.percent, { color: palette.secondaryText }]}>{Math.round(ratio * 100)}%</Text> : null}

          {state.error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.accent }]}>{state.error}</Text> : null}

          {state.cancellable ? <Action label="Cancelar" onPress={onCancel} color={palette.accent} border={palette.separator} /> : null}
          {state.phase === "success" ? (
            <View style={styles.actions}>
              <Action label="Abrir livro" onPress={onOpenBook} color={palette.accent} border={palette.separator} />
              <Action label="Ir para biblioteca" onPress={onClose} color={palette.text} border={palette.separator} />
            </View>
          ) : null}
          {state.phase === "error" || state.phase === "cancelled" ? (
            <View style={styles.actions}>
              <Action label="Importar outro" onPress={onImportAnother} color={palette.accent} border={palette.separator} />
              <Action label="Fechar" onPress={onClose} color={palette.text} border={palette.separator} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function Action({ label, onPress, color, border }: { label: string; onPress: () => void; color: string; border: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.action, { borderColor: border }]}><Text style={{ color, fontWeight: "700" }}>{label}</Text></Pressable>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 22 },
  card: { width: "100%", maxWidth: 440, borderWidth: 1, borderRadius: 12, padding: 22, gap: 13, alignItems: "stretch" },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  fileName: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  meta: { fontSize: 12, textAlign: "center" },
  phase: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  value: { height: "100%", borderRadius: 4 },
  percent: { fontSize: 12, textAlign: "center" },
  error: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  actions: { gap: 8 },
  action: { minHeight: 44, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
});
