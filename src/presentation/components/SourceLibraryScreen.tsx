import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserSource } from "@/src/domain/types/sources";
import { SourceCatalogItem, SourceFolder, sourceIdentity, sourceTypeLabel } from "@/src/domain/types/sourceCatalog";
import { enterSourceFolder, sourceFolderContents, sourceFolderRoute, sourceFolderTrail, sourceTreeIndex } from "@/src/domain/sources/sourceTree";
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

type LibraryRow = { type: "folder"; folder: SourceFolder } | { type: "book"; book: SourceCatalogItem };
const CatalogCard = memo(function CatalogCard({ item, layout, onSelect, statusLabel, showPath }: { item: SourceCatalogItem; layout: "grid" | "list"; onSelect: (item: SourceCatalogItem) => void; statusLabel: string; showPath: boolean }) {
  const { resolvedTheme, palette } = useAppTheme();
  return <View style={{ flex: 1, maxWidth: layout === "grid" ? "50%" : "100%", padding: 5 }}><BookCard book={{ id: item.remoteBookId, title: item.title, author: item.author ?? "Autor não informado", format: item.format === "pdf" ? "pdf" : "epub", coverUri: item.coverUrl, fileUri: "", progress: 0 }} showProgress={false} statusLabel={statusLabel} layout={layout} themeMode={resolvedTheme} onPress={() => onSelect(item)} />{showPath && item.parentFolderId ? <Text style={{ color: palette.secondaryText, fontSize: 11, paddingTop: 5 }}>{item.relativeFolderPath || "Raiz da fonte"}</Text> : null}</View>;
});
export function SourceLibraryScreen({ source }: { source: UserSource }) {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets(), view = useSourceCatalog(source);
  const { imported, error: importError, reload } = useSourceImports(source.id);
  const jobs = useDownloadStore(state => state.jobs);
  const labels = { remote_only: "Remoto · importar sob demanda", downloading: "Importando…", imported: "Na biblioteca", unavailable: "Indisponível" };
  const [query, setQuery] = useState(""), [sort, setSort] = useState<SourceCatalogSort>("az"), [layout, setLayout] = useState<"grid" | "list">("grid"), [managing, setManaging] = useState(false), [selected, setSelected] = useState<SourceCatalogItem | null>(null);
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const identity = sourceIdentity(source);
  useEffect(() => { setFolderIds([]); setQuery(""); setSelected(null); }, [source.id, identity]);
  const trail = useMemo(() => view.catalog ? sourceFolderTrail(view.catalog, folderIds) : [], [view.catalog, folderIds]);
  const currentFolder = trail.at(-1), searching = !!query.trim();
  const contents = useMemo(() => view.catalog ? sourceFolderContents(view.catalog, currentFolder?.remoteFolderId) : { folders: [], books: [] }, [view.catalog, currentFolder]);
  const items = useMemo(() => querySourceCatalog(searching ? view.catalog?.items ?? [] : contents.books, query, sort), [view.catalog, contents, searching, query, sort]);
  const folders = useMemo(() => searching && view.catalog ? sourceTreeIndex(view.catalog).searchFolders(query) : contents.folders, [view.catalog, contents, searching, query]);
  const rows = useMemo<LibraryRow[]>(() => {
    const folderRows = folders.map(folder => ({ type: "folder" as const, folder })), bookRows = items.map(book => ({ type: "book" as const, book }));
    return searching ? [...bookRows, ...folderRows] : [...folderRows, ...bookRows];
  }, [folders, items, searching]);
  const parentIds = useCallback(() => trail.slice(1, -1).map(folder => folder.id), [trail]);
  const goBack = useCallback(() => { if (trail.length > 1) { setFolderIds(parentIds()); setQuery(""); } else router.replace("/sources" as never); }, [trail, parentIds]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selected || managing) return false;
      goBack(); return true;
    });
    return () => subscription.remove();
  }, [trail, selected, managing, goBack]));
  const openFolder = (folder: SourceFolder) => {
    setFolderIds(searching && view.catalog ? sourceFolderRoute(view.catalog, folder.id) : enterSourceFolder(trail, folder));
    setQuery("");
  };
  const updating = view.status === "loading" || view.status === "refreshing";
  const stateLabel = view.status === "auth_required" ? "Reconecte o Google Drive para atualizar esta fonte. O catálogo local continua disponível." : view.status === "offline" || view.status === "stale" ? "Exibindo a última atualização disponível." : view.status === "refreshing" ? "Atualizando catálogo; livros conhecidos continuam disponíveis…" : view.status === "loading" ? "Carregando catálogo…" : view.status === "error" ? "Não foi possível carregar esta fonte." : null;
  return <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={trail.length > 1 ? "Voltar para a pasta anterior" : "Voltar para Fontes"} onPress={goBack}><Text style={{ color: palette.accent }}>{trail.length > 1 ? "← Pasta anterior" : "← Fontes"}</Text></Pressable>
      <Text style={{ color: palette.text, fontSize: 24, fontWeight: "700" }}>{source.name}</Text>
      <Text style={{ color: palette.secondaryText }}>{view.catalog ? `${view.catalog.items.length} ${view.catalog.items.length === 1 ? "livro" : "livros"}${view.catalog.rootFolderId ? ` · ${(view.catalog.folders?.length ?? 1) - 1} pastas` : ""} · ${sourceTypeLabel(source.kind)}` : "Ainda não indexada"}</Text>
      {trail.length ? <View accessibilityLabel="Caminho da pasta" style={styles.controls}>{trail.map((folder, index) => <View key={folder.id} style={{ flexDirection: "row", gap: 6 }}><Text style={{ color: palette.secondaryText }}>{index ? "›" : ""}</Text><Pressable accessibilityRole="button" accessibilityLabel={index ? `Ir para pasta: ${folder.name}` : "Ir para raiz da fonte"} onPress={() => { setFolderIds(trail.slice(1, index + 1).map(parent => parent.id)); setQuery(""); }}><Text style={{ color: index === trail.length - 1 ? palette.text : palette.accent }}>{index ? folder.name : source.name}</Text></Pressable></View>)}</View> : null}
      {view.catalog ? <Text style={{ color: palette.secondaryText, fontSize: 11 }}>Última atualização: {new Date(view.catalog.lastUpdated).toLocaleString("pt-BR")}</Text> : null}
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" disabled={updating} onPress={() => view.status === "auth_required" || !source.enabled ? setManaging(true) : void sourceCatalogs.refresh(source)}><Text style={{ color: palette.accent, opacity: updating ? 0.5 : 1 }}>{view.status === "auth_required" ? "Reconectar" : "Atualizar"}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setManaging(true)}><Text style={{ color: palette.accent }}>Gerenciar fonte</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={layout === "grid" ? "Mostrar lista" : "Mostrar grade"} onPress={() => setLayout(layout === "grid" ? "list" : "grid")}><Text style={{ color: palette.accent }}>{layout === "grid" ? "Lista" : "Grade"}</Text></Pressable>
      </View>
      <TextInput accessibilityLabel="Pesquisar nesta fonte" value={query} onChangeText={setQuery} placeholder="Pesquisar em toda esta fonte" placeholderTextColor={palette.secondaryText} style={[styles.search, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
      {searching ? <Text style={{ color: palette.secondaryText, fontSize: 12 }}>Resultados em toda a fonte · {items.length} livros · {folders.length} pastas</Text> : null}
      {source.kind === "google-drive" && view.catalog && !view.catalog.rootFolderId ? <Text style={{ color: palette.secondaryText, fontSize: 12 }}>Atualize a fonte para incluir pastas e subpastas. O catálogo anterior continua disponível.</Text> : null}
      <View style={styles.controls}>{([ ["az", "Título A–Z"], ["za", "Título Z–A"], ["recent", "Mais recentes"] ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)}><Text style={{ color: sort === value ? palette.accent : palette.secondaryText, fontSize: 12 }}>{label}</Text></Pressable>)}</View>
      {stateLabel ? <Text accessibilityLiveRegion="polite" style={{ color: palette.secondaryText, fontSize: 12 }}>{stateLabel}</Text> : null}
      {view.error ? <Text accessibilityRole="alert" style={{ color: palette.accent, fontSize: 12 }}>{view.error}</Text> : null}
      {updating ? <ActivityIndicator color={palette.accent} /> : null}
    </View>
    {importError ? <Text accessibilityRole="alert" style={{ color: palette.accent, paddingHorizontal: 16 }}>{importError}</Text> : null}
    <FlatList key={`${layout}-${currentFolder?.id ?? "root"}-${searching}`} data={rows} numColumns={layout === "grid" ? 2 : 1} keyExtractor={row => row.type === "folder" ? `folder:${row.folder.id}` : `book:${row.book.remoteBookId}`} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={5} contentContainerStyle={{ padding: 11 }} renderItem={({ item: row }) => {
      if (row.type === "book") return <CatalogCard item={row.book} layout={layout} onSelect={setSelected} showPath={searching} statusLabel={labels[sourceAcquisitionState(row.book, imported[row.book.remoteBookId], sourceItemJob(row.book, jobs))]} />;
      const folder = row.folder, children = view.catalog ? sourceFolderContents(view.catalog, folder.remoteFolderId) : null;
      return <View style={{ flex: 1, maxWidth: layout === "grid" ? "50%" : "100%", padding: 5 }}><Pressable accessibilityRole="button" accessibilityLabel={`Abrir pasta: ${folder.name}`} onPress={() => openFolder(folder)} style={[styles.folder, { backgroundColor: palette.surface, borderColor: palette.border }]}><Ionicons name="folder-outline" size={30} color={palette.accent} /><Text style={{ color: palette.text, fontWeight: "600" }}>{folder.name}</Text><Text style={{ color: palette.secondaryText, fontSize: 11 }}>{folder.isShortcut ? "Atalho · " : ""}{children ? `${children.folders.length + children.books.length} itens conhecidos` : "Pasta"}</Text>{searching ? <Text style={{ color: palette.secondaryText, fontSize: 11 }}>{folder.relativePath}</Text> : null}</Pressable></View>;
    }} ListEmptyComponent={!updating ? <Text style={{ color: palette.secondaryText, padding: 16 }}>{searching ? "Nenhum resultado nesta fonte. Experimente outro título ou autor." : currentFolder ? "Esta pasta não contém livros ou subpastas." : view.catalog && view.status !== "auth_required" ? "Nenhum EPUB ou PDF foi encontrado nesta fonte." : "Use Atualizar ou Reconectar para obter o catálogo. Nada será baixado durante a indexação."}</Text> : null} />
    <SourceManagerModal visible={managing} onClose={() => setManaging(false)} />
    {selected ? <SourceBookSheet key={selected.remoteBookId} source={source} item={selected} importedBookId={imported[selected.remoteBookId]} onImported={reload} onClose={() => setSelected(null)} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  header: { padding: 16, gap: 10 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  search: { minHeight: 44, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12 },
  folder: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8, minHeight: 110 },
});
