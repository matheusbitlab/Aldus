import { useRef, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LibraryBulkAction, organizeLibrarySelection } from "@/src/domain/usecases/OrganizeLibrarySelection";
import { readingStatuses } from "@/src/domain/types/libraryOrganization";
import { libraryOrganization } from "@/src/presentation/services/dependencies";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { readingStatusLabels } from "./BookOrganizationModal";

const actions: { key: string; label: string; action: LibraryBulkAction }[] = [
  { key: "add-collection", label: "Adicionar à coleção", action: { kind: "add-collection", name: "" } },
  { key: "remove-collection", label: "Remover da coleção", action: { kind: "remove-collection", name: "" } },
  { key: "add-tag", label: "Adicionar tag", action: { kind: "add-tag", name: "" } },
  { key: "remove-tag", label: "Remover tag", action: { kind: "remove-tag", name: "" } },
  { key: "favorite", label: "Favoritar", action: { kind: "favorite", value: true } },
  { key: "unfavorite", label: "Desfavoritar", action: { kind: "favorite", value: false } },
  ...[null, ...readingStatuses].map(value => ({ key: "status-" + value, label: value ? readingStatusLabels[value] : "Estado pelo progresso", action: { kind: "status" as const, value } })),
];

export function LibraryBulkModal({ bookIds, collections, rename, onClose, onSaved }: {
  bookIds: string[]; collections: string[]; rename?: string; onClose: () => void;
  onSaved: (count: number, replacement?: string) => Promise<void>;
}) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [scope] = useState(() => libraryAccountScope.capture());
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const [selected, setSelected] = useState(actions[0]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);
  const needsName = !!rename || "name" in selected.action;
  const apply = async () => {
    setSaving(true); setError(null);
    try {
      const action: LibraryBulkAction = rename ? { kind: "rename-collection", name: rename, replacement: name }
        : "name" in selected.action ? { ...selected.action, name } : selected.action;
      const count = await organizeLibrarySelection(libraryOrganization, bookIds, action, scope.check);
      scope.check(); if (!live.current) return;
      setCommitted(true);
      await onSaved(count, rename ? name.trim() : undefined);
      scope.check(); if (live.current) onClose();
    } catch (failure) {
      try { scope.check(); } catch { return; }
      if (live.current) setError(failure instanceof Error ? failure.message : "Não foi possível confirmar a organização. Recarregue e tente novamente.");
    } finally { if (live.current) setSaving(false); }
  };
  const button = (label: string, onPress: () => void, active = false) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active }} disabled={saving || committed} onPress={onPress} style={[styles.choice, { borderColor: active ? palette.accent : palette.separator }]}><Text style={{ color: palette.text }}>{label}</Text></Pressable>;
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!saving) onClose(); }}>
    <View style={[styles.backdrop, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
      <View style={[styles.panel, { backgroundColor: palette.panel }]} accessibilityViewIsModal>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>{rename ? "Renomear coleção" : "Organizar seleção"}</Text>
          <Text style={{ color: palette.secondaryText }}>{bookIds.length} {bookIds.length === 1 ? "livro selecionado" : "livros selecionados"}{rename ? ` · ${rename}` : ""}</Text>
          {!rename ? <View style={styles.options}>{actions.map(option => button(option.label, () => { setSelected(option); setName(""); }, selected.key === option.key))}</View> : null}
          {needsName ? <View style={{ gap: 8 }}>
            <Text style={{ color: palette.text }}>{rename ? "Novo nome" : selected.action.kind.endsWith("tag") ? "Nome da tag" : "Nome da coleção"}</Text>
            <TextInput autoFocus accessibilityLabel={rename ? "Novo nome da coleção" : selected.action.kind.endsWith("tag") ? "Nome da tag" : "Nome da coleção"} value={name} maxLength={120} editable={!saving && !committed} onChangeText={setName} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} />
            {!rename && selected.action.kind.endsWith("collection") ? <View style={styles.options}>{collections.map(value => button(value, () => setName(value), name === value))}</View> : null}
          </View> : null}
          <Text style={{ color: palette.secondaryText }}>{rename ? "O nome será alterado em todos os livros desta coleção na conta atual. Se o novo nome já existir, os livros serão reunidos nessa coleção." : "As demais coleções, tags, capas e anotações de cada livro serão preservadas. Nenhum arquivo será removido."}</Text>
          <Text style={{ color: palette.secondaryText }}>A alteração local é aplicada por inteiro. O envio à nuvem usa a fila existente e pode continuar pendente por livro quando você estiver offline.</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{committed ? "Organização salva. Não foi possível atualizar a lista; feche e recarregue a biblioteca." : error}</Text> : null}
        </ScrollView>
        <View style={[styles.actions, { borderColor: palette.separator }]}>
          <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.choice}><Text style={{ color: palette.text }}>{committed ? "Fechar" : "Cancelar"}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={rename ? "Confirmar novo nome" : "Aplicar à seleção"} disabled={saving || committed || (needsName && !name.trim())} onPress={() => void apply()} style={[styles.choice, { backgroundColor: palette.accent, opacity: saving || committed || (needsName && !name.trim()) ? .55 : 1 }]}>{saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "600" }}>{rename ? "Renomear" : "Aplicar"}</Text>}</Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }, panel: { width: "100%", maxWidth: 600, maxHeight: "100%", borderRadius: 16 }, content: { padding: 20, gap: 16 }, heading: { fontSize: 24, fontWeight: "600" }, options: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { minHeight: 44, borderWidth: 1, borderColor: "transparent", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center" }, input: { minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 8 }, actions: { padding: 16, borderTopWidth: 1, flexDirection: "row", justifyContent: "flex-end", gap: 8 } });
