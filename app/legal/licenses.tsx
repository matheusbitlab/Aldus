import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { thirdPartyNoticeGroups, thirdPartyPackages } from "@/src/legal/thirdPartyNotices.generated";
import { LegalDocumentScreen } from "@/src/presentation/components/legal/LegalDocumentScreen";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export default function LicensesScreen() {
  const { palette } = useAppTheme();
  const [query, setQuery] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const cleanQuery = query.trim().toLocaleLowerCase("pt-BR");
  const packages = useMemo(() => thirdPartyPackages.filter((item) =>
    !cleanQuery || `${item.name} ${item.version} ${item.license}`.toLocaleLowerCase("pt-BR").includes(cleanQuery)
  ), [cleanQuery]);
  const selectedGroup = thirdPartyNoticeGroups.find((group) => group.id === selectedGroupId);

  return <LegalDocumentScreen showReviewStatus={false} document={{
    title: "Licenças de terceiros",
    subtitle: "Componentes de runtime identificados na instalação auditada.",
    sections: [
      { heading: "Sobre este inventário", paragraphs: ["O Aldus Reader usa software de código aberto. A lista abaixo foi gerada das dependências diretas de runtime e agrupa textos idênticos para evitar repetição. Dependências transitivas e artefatos nativos ainda precisam de conferência antes de uma distribuição comercial.", "Os avisos preservam os textos fornecidos pelos próprios pacotes; a licença de cada componente continua prevalecendo sobre este resumo."] },
    ],
  }} footer={
    <View style={styles.footer}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Textos agrupados</Text>
      <View style={styles.groupList}>
        {thirdPartyNoticeGroups.map((group) => (
          <Pressable key={group.id} accessibilityRole="button" accessibilityState={{ expanded: selectedGroupId === group.id }} onPress={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)} style={[styles.groupButton, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.flex}>
              <Text style={[styles.packageName, { color: palette.text }]}>{group.license}</Text>
              <Text style={[styles.meta, { color: palette.secondaryText }]}>{group.packages.length} {group.packages.length === 1 ? "pacote" : "pacotes"}</Text>
            </View>
            <Ionicons name={selectedGroupId === group.id ? "chevron-up" : "chevron-down"} size={18} color={palette.secondaryText} />
          </Pressable>
        ))}
      </View>
      {selectedGroup ? (
        <View style={[styles.noticeTextCard, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
          <Text style={[styles.packageName, { color: palette.text }]}>{selectedGroup.license}</Text>
          <Text style={[styles.meta, { color: palette.secondaryText }]}>{selectedGroup.packages.join(", ")}</Text>
          <Text selectable style={[styles.licenseText, { color: palette.textSecondary }]}>{selectedGroup.text}</Text>
        </View>
      ) : null}

      <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Pacotes ({thirdPartyPackages.length})</Text>
      <View style={[styles.search, { backgroundColor: palette.input, borderColor: palette.border }]}>
        <Ionicons name="search-outline" size={19} color={palette.secondaryText} />
        <TextInput accessibilityLabel="Buscar pacote ou licença" value={query} onChangeText={setQuery} placeholder="Buscar pacote ou licença" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text }]} />
      </View>
      <View style={styles.packageList}>
        {packages.map((item) => (
          <View key={item.name} style={[styles.packageCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.packageHeader}>
              <View style={styles.flex}>
                <Text selectable style={[styles.packageName, { color: palette.text }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: palette.secondaryText }]}>{item.version} · {item.license}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Abrir texto da licença de ${item.name}`} onPress={() => setSelectedGroupId(item.groupId)} style={styles.iconButton}>
                <Ionicons name="document-text-outline" size={20} color={palette.accent} />
              </Pressable>
            </View>
            {item.copyright.map((line) => <Text key={line} selectable style={[styles.copyright, { color: palette.textSecondary }]}>{line}</Text>)}
            {item.repository ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.repository!)} style={styles.repositoryLink}><Text style={[styles.linkText, { color: palette.accent }]}>Repositório do pacote</Text><Ionicons name="open-outline" size={15} color={palette.accent} /></Pressable> : null}
          </View>
        ))}
        {!packages.length ? <Text style={[styles.empty, { color: palette.secondaryText }]}>Nenhum pacote corresponde à busca.</Text> : null}
      </View>
    </View>
  } />;
}

const styles = StyleSheet.create({
  footer: { marginTop: 30, gap: 14 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: "700", marginTop: 6 },
  groupList: { gap: 8 },
  groupButton: { minHeight: 54, borderWidth: 1, borderRadius: 9, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  noticeTextCard: { borderWidth: 1, borderRadius: 9, padding: 14, gap: 8 },
  licenseText: { fontFamily: "monospace", fontSize: 12, lineHeight: 18, marginTop: 5 },
  search: { height: 48, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, height: 46, paddingHorizontal: 9, fontSize: 15 },
  packageList: { gap: 10 },
  packageCard: { borderWidth: 1, borderRadius: 9, padding: 14, gap: 7 },
  packageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  packageName: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  meta: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  copyright: { fontSize: 12, lineHeight: 18 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  repositoryLink: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
  empty: { paddingVertical: 20, textAlign: "center" },
});
