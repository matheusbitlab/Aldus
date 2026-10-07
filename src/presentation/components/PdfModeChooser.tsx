import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PdfReadingMode } from "@/src/domain/types/pdfReader";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

interface Props {
  visible: boolean;
  onChoose: (mode: PdfReadingMode) => void;
  onCancel: () => void;
}

export function PdfModeChooser({ visible, onChoose, onCancel }: Props) {
  const { palette } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: palette.panel }]}>
          <Text style={[styles.title, { color: palette.text }]}>Como deseja ler?</Text>
          <Pressable accessibilityRole="button" onPress={() => onChoose("original")} style={[styles.option, { borderColor: palette.separator }]}>
            <Text style={[styles.optionTitle, { color: palette.text }]}>PDF Original</Text>
            <Text style={[styles.description, { color: palette.secondaryText }]}>Mantém o layout, as páginas e as ilustrações do documento.</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onChoose("reflow")} style={[styles.option, { borderColor: palette.separator }]}>
            <Text style={[styles.optionTitle, { color: palette.text }]}>Leitura Livre</Text>
            <Text style={[styles.description, { color: palette.secondaryText }]}>Adapta o texto à tela e permite personalizar a leitura.</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}>
            <Text style={[styles.cancelText, { color: palette.secondaryText }]}>Continuar no PDF Original</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.48)" },
  dialog: { width: "100%", maxWidth: 420, padding: 22, gap: 12, borderRadius: 8, backgroundColor: "#F9EED9" },
  title: { marginBottom: 4, color: "#57463A", fontSize: 20, fontWeight: "700" },
  option: { padding: 14, borderWidth: 1, borderColor: "#D7C5A6", borderRadius: 6, gap: 5 },
  optionTitle: { color: "#57463A", fontSize: 16, fontWeight: "600" },
  description: { color: "#8A7561", fontSize: 13, lineHeight: 19 },
  cancel: { alignSelf: "flex-end", paddingVertical: 10, paddingHorizontal: 6 },
  cancelText: { color: "#8A7561", fontSize: 13, fontWeight: "600" },
});
