import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exportOrganizationBackup, OrganizationRecords, parseOrganizationBackup } from "@/src/domain/types/libraryOrganization";
import { libraryOrganization } from "@/src/presentation/services/dependencies";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export function OrganizationBackupModal({ records, bookIds, onClose, onSaved }: { records: OrganizationRecords; bookIds: string[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const { palette } = useAppTheme(); const insets = useSafeAreaInsets();
  const [text, setText] = useState(""); const [preview, setPreview] = useState<OrganizationRecords | null>(null);
  const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const action = (label: string, press: () => void) => <Pressable accessibilityRole="button" disabled={busy} onPress={press} style={[styles.button, { borderColor: palette.separator }]}><Text style={{ color: palette.text }}>{label}</Text></Pressable>;
  const exportData = async () => {
    setBusy(true); setMessage(null);
    try {
      const json = exportOrganizationBackup(await libraryOrganization.list());
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "kindle-organizacao.json"; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else await Share.share({ title: "Organização da biblioteca", message: json });
      setText(json); setPreview(null); setMessage("Backup gerado. Guarde o JSON para restaurar sua organização.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Falha ao exportar."); } finally { setBusy(false); }
  };
  const inspect = () => {
    try { const values = parseOrganizationBackup(text); setPreview(values); setMessage(null); }
    catch (e) { setPreview(null); setMessage(e instanceof Error ? e.message : "Backup inválido."); }
  };
  const restore = async (policy: "keep-local" | "use-imported") => {
    if (!preview) return;
    setBusy(true);
    try { const result = await libraryOrganization.merge(preview, policy); await onSaved(); setPreview(null); setMessage(`${result.imported} registros restaurados; ${result.conflicts} conflitos tratados conforme sua escolha.`); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Não foi possível restaurar."); } finally { setBusy(false); }
  };
  const values = Object.values(preview ?? {});
  return <Modal visible transparent onRequestClose={() => { if (!busy) onClose(); }}><View style={[styles.backdrop, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}><View style={[styles.panel, { backgroundColor: palette.panel }]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}>Backup da organização</Text>
    <Text style={{ color: palette.secondaryText }}>Inclui metadados editados, favoritos, coleções, tags, série e estado de leitura. Não inclui arquivos dos livros, progresso, configurações ou anotações. Usa os identificadores desta biblioteca; registros sem livro ficam preservados para recuperação posterior.</Text>
    {action("Exportar organização", () => void exportData())}
    <TextInput accessibilityLabel="JSON do backup de organização" value={text} onChangeText={v => { setText(v); setPreview(null); }} multiline placeholder="Cole o JSON exportado para conferir e restaurar" placeholderTextColor={palette.secondaryText} style={[styles.input, { borderColor: palette.separator, color: palette.text }]} />
    {action("Conferir backup", inspect)}
    {preview ? <><Text style={{ color: palette.text }}>{values.length} registros; {values.filter(v => records[v.bookId]).length} identificadores já existentes; {values.filter(v => !bookIds.includes(v.bookId)).length} sem livro nesta biblioteca. Escolha como tratar registros diferentes:</Text>{action("Restaurar mantendo os dados locais", () => void restore("keep-local"))}{action("Restaurar usando os dados importados", () => void restore("use-imported"))}</> : null}
    {message ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{message}</Text> : null}
    {action("Fechar", onClose)}
  </ScrollView></View></View></Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.5)", paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, panel: { width: "100%", maxWidth: 620, maxHeight: "100%", borderRadius: 12 }, content: { padding: 20, gap: 14 }, button: { padding: 12, minHeight: 44, borderWidth: 1, borderRadius: 6 }, input: { borderWidth: 1, borderRadius: 6, padding: 12, minHeight: 160, textAlignVertical: "top" } });
