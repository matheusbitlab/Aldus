import { memo, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserSource } from "@/src/domain/types/sources";
import { SourceCatalogItem, sourceTypeLabel } from "@/src/domain/types/sourceCatalog";
import { SourceCatalogSort, querySourceCatalog } from "@/src/data/sources/SourceCatalogService";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";
import { useSourceCatalog } from "@/src/presentation/hooks/useSourceCatalog";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { BookCard } from "./BookCard";
import { SourceManagerModal } from "./SourceManagerModal";
import { SourceBookSheet } from "./SourceBookSheet";
import { useSourceImports } from "@/src/presentation/hooks/useSourceImports";
import { useDownloadStore } from "@/src/presentation/stores/downloadStore";
import { sourceAcquisitionState, sourceItemJob } from "@/src/presentation/services/sourceAcquisition";

const CatalogCard = memo(function CatalogCard({ item, layout, onSelect, statusLabel }: { item: SourceCatalogItem; layout: "grid" | "list"; onSelect: (item: SourceCatalogItem) => void; statusLabel: string }) {
  const { resolvedTheme } = useAppTheme();
  return <View style={{ flex: 1, maxWidth: layout === "grid" ? "50%" : "100%", padding: 5 }}><BookCard book={{ id: item.remoteBookId, title: item.title, author: item.author ?? "Autor não informado", format: item.format === "pdf" ? "pdf" : "epub", coverUri: item.coverUrl, fileUri: "", progress: 0 }} showProgress={false} statusLabel={statusLabel} layout={layout} themeMode={resolvedTheme} onPress={() => onSelect(item)} /></View>;
});
export function SourceLibraryScreen({ source }: { source: UserSource }) {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets(), view = useSourceCatalog(source);
  const { imported, error: importError, reload } = useSourceImports(source.id);
  const jobs = useDownloadStore(state => state.jobs);
  const labels = { remote_only: "Remoto · importar sob demanda", downloading: "Importando…", imported: "Na biblioteca", unavailable: "Indisponível" };
  const [query, setQuery] = useState(""), [sort, setSort] = useState<SourceCatalogSort>("az"), [layout, setLayout] = useState<"grid" | "list">("grid"), [managing, setManaging] = useState(false), [selected, setSelected] = useState<SourceCatalogItem | null>(null);
  const items = useMemo(() => querySourceCatalog(view.catalog?.items ?? [], query, sort), [view.catalog, query, sort]);
  const updating = view.status === "loading" || view.status === "refreshing";
  const stateLabel = view.status === "auth_required" ? "Reconecte o Google Drive para atualizar esta fonte. O catálogo local continua disponível." : view.status === "offline" || view.status === "stale" ? "Exibindo a última atualização disponível." : view.status === "refreshing" ? "Atualizando catálogo; livros conhecidos continuam disponíveis…" : view.status === "loading" ? "Carregando catálogo…" : view.status === "error" ? "Não foi possível carregar esta fonte." : null;
  return <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={{ color: palette.accent }}>← Fontes</Text></Pressable>
      <Text style={{ color: palette.text, fontSize: 24, fontWeight: "700" }}>{source.name}</Text>
      <Text style={{ color: palette.secondaryText }}>{view.catalog ? `${view.catalog.items.length} ${view.catalog.items.length === 1 ? "livro" : "livros"} · ${sourceTypeLabel(source.kind)}` : "Ainda não indexada"}</Text>
      {view.catalog ? <Text style={{ color: palette.secondaryText, fontSize: 11 }}>Última atualização: {new Date(view.catalog.lastUpdated).toLocaleString("pt-BR")}</Text> : null}
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" disabled={updating} onPress={() => view.status === "auth_required" || !source.enabled ? setManaging(true) : void sourceCatalogs.refresh(source)}><Text style={{ color: palette.accent, opacity: updating ? 0.5 : 1 }}>{view.status === "auth_required" ? "Reconectar" : "Atualizar"}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setManaging(true)}><Text style={{ color: palette.accent }}>Gerenciar fonte</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={layout === "grid" ? "Mostrar lista" : "Mostrar grade"} onPress={() => setLayout(layout === "grid" ? "list" : "grid")}><Text style={{ color: palette.accent }}>{layout === "grid" ? "Lista" : "Grade"}</Text></Pressable>
      </View>
      <TextInput accessibilityLabel="Pesquisar nesta fonte" value={query} onChangeText={setQuery} placeholder="Pesquisar título ou autor nesta fonte" placeholderTextColor={palette.secondaryText} style={[styles.search, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
      <View style={styles.controls}>{([ ["az", "Título A–Z"], ["za", "Título Z–A"], ["recent", "Mais recentes"] ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)}><Text style={{ color: sort === value ? palette.accent : palette.secondaryText, fontSize: 12 }}>{label}</Text></Pressable>)}</View>
      {stateLabel ? <Text accessibilityLiveRegion="polite" style={{ color: palette.secondaryText, fontSize: 12 }}>{stateLabel}</Text> : null}
      {view.error ? <Text accessibilityRole="alert" style={{ color: palette.accent, fontSize: 12 }}>{view.error}</Text> : null}
      {updating ? <ActivityIndicator color={palette.accent} /> : null}
    </View>
    {importError ? <Text accessibilityRole="alert" style={{ color: palette.accent, paddingHorizontal: 16 }}>{importError}</Text> : null}
    <FlatList key={layout} data={items} numColumns={layout === "grid" ? 2 : 1} keyExtractor={item => item.remoteBookId} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={5} contentContainerStyle={{ padding: 11 }} renderItem={({ item }) => <CatalogCard item={item} layout={layout} onSelect={setSelected} statusLabel={labels[sourceAcquisitionState(item, imported[item.remoteBookId], sourceItemJob(item, jobs))]} />} ListEmptyComponent={!updating ? <Text style={{ color: palette.secondaryText, padding: 16 }}>{query ? "Nenhum resultado nesta fonte. Experimente outro título ou autor." : view.catalog && view.status !== "auth_required" ? "Nenhum EPUB ou PDF foi encontrado nesta fonte." : "Use Atualizar ou Reconectar para obter o catálogo. Nada será baixado durante a indexação."}</Text> : null} />
    <SourceManagerModal visible={managing} onClose={() => setManaging(false)} />
    {selected ? <SourceBookSheet key={selected.remoteBookId} source={source} item={selected} importedBookId={imported[selected.remoteBookId]} onImported={reload} onClose={() => setSelected(null)} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  header: { padding: 16, gap: 10 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  search: { minHeight: 44, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12 },
});
