import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserSource } from "@/src/domain/types/sources";
import { SourceCatalogItem, SourceFolder, sourceIdentity } from "@/src/domain/types/sourceCatalog";
import { enterSourceFolder, sourceFolderContents, sourceFolderRoute, sourceFolderTrail, sourceTreeIndex } from "@/src/domain/sources/sourceTree";
import { SourceCatalogSort, querySourceCatalog, querySourceCatalogAsync } from "@/src/data/sources/SourceCatalogService";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";
import { useSourceCatalog } from "@/src/presentation/hooks/useSourceCatalog";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { BookCard } from "./BookCard";
import { SourceManagerModal, SourceManagerAction } from "./SourceManagerModal";
import { sourceLibraryTypeLabel, sourceProgressCounts, sourceProgressLabel, sourceVisibleInAccount, useSourceAccountGeneration, useSourceAccountId } from './sourcePresentation';
import { SourceBookSheet } from "./SourceBookSheet";
import { useSourceImports } from "@/src/presentation/hooks/useSourceImports";
import { useDownloadStore } from "@/src/presentation/stores/downloadStore";
import { sourceAcquisitionState, sourceItemJob } from "@/src/presentation/services/sourceAcquisition";
import { sourcePerformance } from "@/src/utils/sourcePerformance";

type LibraryRow = { type: "folder"; folder: SourceFolder } | { type: "book"; book: SourceCatalogItem };
const CatalogCard = memo(function CatalogCard({ item, layout, onSelect, statusLabel, showPath }: { item: SourceCatalogItem; layout: "grid" | "list"; onSelect: (item: SourceCatalogItem) => void; statusLabel: string; showPath: boolean }) {
  const { resolvedTheme, palette } = useAppTheme();
  return <View style={{ flex: 1, maxWidth: layout === "grid" ? "50%" : "100%", padding: 5 }}><BookCard book={{ id: item.remoteBookId, title: item.title, author: item.author ?? "Autor não informado", format: item.format === "pdf" ? "pdf" : "epub", coverUri: item.coverUrl, fileUri: "", progress: 0 }} showProgress={false} statusLabel={statusLabel} layout={layout} themeMode={resolvedTheme} onPress={() => onSelect(item)} />{showPath && item.parentFolderId ? <Text style={{ color: palette.secondaryText, fontSize: 11, paddingTop: 5 }}>{item.relativeFolderPath || "Raiz da fonte"}</Text> : null}</View>;
});
export function SourceLibraryScreen({ source }: { source: UserSource }) {
  const accountId = useSourceAccountId(), generation = useSourceAccountGeneration(), { palette } = useAppTheme();
  if (!sourceVisibleInAccount(source, accountId)) return <View style={{ flex: 1, padding: 24, backgroundColor: palette.background }}><Text style={{ color: palette.text }}>Esta biblioteca não está disponível nesta conta.</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/sources' as never)}><Text style={{ color: palette.accent }}>Voltar às minhas bibliotecas</Text></Pressable></View>;
  return <SourceLibraryContent key={`${accountId}:${generation}:${source.id}`} source={source} />;
}
function SourceLibraryContent({ source }: { source: UserSource }) {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets(), view = useSourceCatalog(source);
  const openedAt = useRef(performance.now()), measuredFrame = useRef(false);
  useEffect(() => {
    if (!view.catalog || measuredFrame.current) return;
    const frame = requestAnimationFrame(() => { measuredFrame.current = true; sourcePerformance('initial_frame', openedAt.current, view.catalog!.items.length); });
    return () => cancelAnimationFrame(frame);
  }, [view.catalog]);
  const { imported, error: importError, reload } = useSourceImports(source.id);
  const jobs = useDownloadStore(state => state.jobs);
  const labels = { remote_only: "Remoto · importar sob demanda", downloading: "Importando…", imported: "Na biblioteca", unavailable: "Indisponível" };
  const [query, setQuery] = useState(""), [sort, setSort] = useState<SourceCatalogSort>("az"), [layout, setLayout] = useState<"grid" | "list">("grid"), [managing, setManaging] = useState<SourceManagerAction | null>(null), [selected, setSelected] = useState<SourceCatalogItem | null>(null), [menu, setMenu] = useState(false);
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [searchResult, setSearchResult] = useState<{ input: SourceCatalogItem[]; query: string; sort: SourceCatalogSort; items: SourceCatalogItem[] } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  useEffect(() => {
    const input = view.catalog?.items;
    setSearchError(null);
    if (!input || !query.trim()) { setSearchResult(null); return; }
    const controller = new AbortController();
    void querySourceCatalogAsync(input, query, sort, controller.signal).then(items => {
      if (!controller.signal.aborted) setSearchResult({ input, query, sort, items });
    }).catch(() => {
      if (!controller.signal.aborted) { setSearchResult({ input, query, sort, items: [] }); setSearchError('Não foi possível concluir a pesquisa. Tente novamente.'); }
    });
    return () => controller.abort();
  }, [view.catalog?.items, query, sort]);
  const refreshOperation = useRef<AbortController | null>(null);
  useFocusEffect(useCallback(() => () => { refreshOperation.current?.abort(); refreshOperation.current = null; }, []));
  const identity = sourceIdentity(source);
  useEffect(() => { setFolderIds([]); setQuery(""); setSelected(null); }, [source.id, identity]);
  const trail = useMemo(() => view.catalog ? sourceFolderTrail(view.catalog, folderIds) : [], [view.catalog, folderIds]);
  const currentFolder = trail.at(-1), searching = !!query.trim();
  const contents = useMemo(() => view.catalog ? sourceFolderContents(view.catalog, currentFolder?.remoteFolderId) : { folders: [], books: [] }, [view.catalog, currentFolder]);
  const items = useMemo(() => searching ? searchResult && searchResult.input === view.catalog?.items && searchResult.query === query && searchResult.sort === sort ? searchResult.items : [] : querySourceCatalog(contents.books, '', sort), [view.catalog, contents, searching, query, sort, searchResult]);
  const searchingItems = searching && !(searchResult && searchResult.input === view.catalog?.items && searchResult.query === query && searchResult.sort === sort);
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
  const refresh = () => {
    if (updating) return;
    if (view.status === 'auth_required' || !source.enabled) { setManaging('reconnect'); return; }
    const controller = new AbortController(); refreshOperation.current = controller;
    void sourceCatalogs.refresh(source, controller.signal).finally(() => { if (refreshOperation.current === controller) refreshOperation.current = null; });
  };
  const stateLabel = view.status === "auth_required" ? "Reconecte o Google Drive para atualizar esta biblioteca. O catálogo local continua disponível." : view.status === "offline" || view.status === "stale" ? "Exibindo a última atualização disponível." : updating ? sourceProgressLabel(view.operation) ?? (view.status === 'refreshing' ? 'Atualizando catálogo; livros conhecidos continuam disponíveis…' : 'Carregando catálogo…') : view.status === "error" ? "Não foi possível carregar esta biblioteca." : null;
  const header = <View style={styles.header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Pressable accessibilityRole="button" accessibilityLabel={trail.length > 1 ? "Voltar para a pasta anterior" : "Voltar para Minhas bibliotecas"} onPress={goBack} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.accent }}>{trail.length > 1 ? "← Pasta anterior" : "← Minhas bibliotecas"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Opções da biblioteca ${source.name}`} accessibilityState={{ expanded: menu }} onPress={() => setMenu(!menu)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="ellipsis-horizontal" size={23} color={palette.text} /></Pressable></View>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 25, fontWeight: "700" }}>{source.name}</Text>
      <Text style={{ color: palette.secondaryText, fontSize: 12 }}>{view.catalog ? `${view.catalog.items.length.toLocaleString('pt-BR')} ${view.catalog.items.length === 1 ? "livro" : "livros"}${view.catalog.rootFolderId ? ` · ${Math.max(0, (view.catalog.folders?.length ?? 1) - 1).toLocaleString('pt-BR')} pastas` : ""} · ${sourceLibraryTypeLabel(source.kind)}` : "Ainda não atualizada"}</Text>
      {menu ? <View style={{ padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 10, gap: 8 }}>{([['Gerenciar biblioteca', 'manage'], ['Editar biblioteca', 'edit'], ['Remover biblioteca', 'remove']] as const).map(([label, action]) => <Pressable key={action} accessibilityRole="button" accessibilityLabel={label} onPress={() => { setMenu(false); setManaging(action); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: action === 'remove' ? palette.accent : palette.text }}>{label}</Text></Pressable>)}</View> : null}
      {trail.length ? <View accessibilityLabel="Caminho da pasta" style={styles.controls}>{trail.map((folder, index) => <View key={folder.id} style={{ flexDirection: "row", gap: 6 }}><Text style={{ color: palette.secondaryText }}>{index ? "›" : ""}</Text><Pressable accessibilityRole="button" accessibilityLabel={index ? `Ir para pasta: ${folder.name}` : "Ir para raiz da fonte"} onPress={() => { setFolderIds(trail.slice(1, index + 1).map(parent => parent.id)); setQuery(""); }}><Text style={{ color: index === trail.length - 1 ? palette.text : palette.accent }}>{index ? folder.name : source.name}</Text></Pressable></View>)}</View> : null}
      {view.catalog ? <Text style={{ color: palette.secondaryText, fontSize: 11 }}>Última atualização: {new Date(view.catalog.lastUpdated).toLocaleString("pt-BR")}</Text> : null}
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" disabled={updating} onPress={refresh} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.accent, opacity: updating ? 0.5 : 1 }}>{view.status === "auth_required" ? "Reconectar" : "Atualizar"}</Text></Pressable>
        {updating && refreshOperation.current ? <Pressable accessibilityRole="button" accessibilityLabel="Cancelar atualização da biblioteca" onPress={() => refreshOperation.current?.abort()} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.accent }}>Cancelar atualização</Text></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={layout === "grid" ? "Mostrar lista" : "Mostrar grade"} onPress={() => setLayout(layout === "grid" ? "list" : "grid")}><Text style={{ color: palette.accent }}>{layout === "grid" ? "Lista" : "Grade"}</Text></Pressable>
      </View>
      <TextInput accessibilityLabel="Pesquisar nesta biblioteca" value={query} onChangeText={setQuery} placeholder="Pesquisar nesta biblioteca" placeholderTextColor={palette.secondaryText} style={[styles.search, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} />
      {searching ? <Text accessibilityLiveRegion="polite" style={{ color: palette.secondaryText, fontSize: 12 }}>{searchingItems ? 'Pesquisando na biblioteca…' : `Resultados em toda a biblioteca · ${items.length} livros · ${folders.length} pastas`}</Text> : null}
      {searchError ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{searchError}</Text> : null}
      {source.kind === "google-drive" && view.catalog && !view.catalog.rootFolderId ? <Text style={{ color: palette.secondaryText, fontSize: 12 }}>Atualize a fonte para incluir pastas e subpastas. O catálogo anterior continua disponível.</Text> : null}
      <View style={styles.controls}>{([ ["az", "Título A–Z"], ["za", "Título Z–A"], ["recent", "Mais recentes"] ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)}><Text style={{ color: sort === value ? palette.accent : palette.secondaryText, fontSize: 12 }}>{label}</Text></Pressable>)}</View>
      {stateLabel ? <Text accessibilityLiveRegion="polite" style={{ color: palette.secondaryText, fontSize: 12 }}>{stateLabel}</Text> : null}
      {updating && sourceProgressCounts(view.operation) ? <Text style={{ color: palette.secondaryText, fontSize: 12 }}>{sourceProgressCounts(view.operation)}</Text> : null}
      {view.error ? <Text accessibilityRole="alert" style={{ color: palette.accent, fontSize: 12 }}>{view.error}</Text> : null}
      {updating ? <ActivityIndicator color={palette.accent} /> : null}
      {importError ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{importError}</Text> : null}
    </View>;
  return <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }}>
    <FlatList key={`${layout}-${currentFolder?.id ?? "root"}`} data={rows} ListHeaderComponent={header} keyboardShouldPersistTaps="handled" numColumns={layout === "grid" ? 2 : 1} keyExtractor={row => row.type === "folder" ? `folder:${row.folder.id}` : `book:${row.book.remoteBookId}`} initialNumToRender={12} maxToRenderPerBatch={10} windowSize={5} contentContainerStyle={{ padding: 11 }} renderItem={({ item: row }) => {
      if (row.type === "book") return <CatalogCard item={row.book} layout={layout} onSelect={setSelected} showPath={searching} statusLabel={labels[sourceAcquisitionState(row.book, imported[row.book.remoteBookId], sourceItemJob(row.book, jobs))]} />;
      const folder = row.folder, children = view.catalog ? sourceFolderContents(view.catalog, folder.remoteFolderId) : null;
      return <View style={{ flex: 1, maxWidth: layout === "grid" ? "50%" : "100%", padding: 5 }}><Pressable accessibilityRole="button" accessibilityLabel={`Abrir pasta: ${folder.name}`} onPress={() => openFolder(folder)} style={[styles.folder, { backgroundColor: palette.surface, borderColor: palette.border }]}><Ionicons name="folder-outline" size={30} color={palette.accent} /><Text style={{ color: palette.text, fontWeight: "600" }}>{folder.name}</Text><Text style={{ color: palette.secondaryText, fontSize: 11 }}>{folder.isShortcut ? "Atalho · " : ""}{children ? `${children.folders.length + children.books.length} itens conhecidos` : "Pasta"}</Text>{searching ? <Text style={{ color: palette.secondaryText, fontSize: 11 }}>{folder.relativePath}</Text> : null}</Pressable></View>;
    }} ListEmptyComponent={!updating && !searchingItems ? <Text style={{ color: palette.secondaryText, padding: 16 }}>{searching ? "Nenhum resultado nesta fonte. Experimente outro título ou autor." : currentFolder ? "Esta pasta não contém livros ou subpastas." : view.catalog && view.status !== "auth_required" ? "Nenhum EPUB ou PDF foi encontrado nesta fonte." : "Use Atualizar ou Reconectar para obter o catálogo. Nada será baixado durante a indexação."}</Text> : null} />
    <SourceManagerModal visible={managing !== null} sourceId={source.id} action={managing ?? 'manage'} onClose={() => setManaging(null)} />
    {selected ? <SourceBookSheet key={selected.remoteBookId} source={source} item={selected} importedBookId={imported[selected.remoteBookId]} onImported={reload} onClose={() => setSelected(null)} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  header: { padding: 16, gap: 10 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  search: { minHeight: 44, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12 },
  folder: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 8, minHeight: 110 },
});
