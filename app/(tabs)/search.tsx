import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { useSearchStore } from "@/src/presentation/stores/searchStore";
import { useDownloadStore } from "@/src/presentation/stores/downloadStore";
import { useSourceStore } from "@/src/presentation/stores/sourceStore";
import { useLibraryStore } from "@/src/presentation/stores/libraryStore";
import { ScrapedLink } from "@/src/domain/types/search";
import { BUILTIN_CATALOG_NAMES } from "@/src/data/scraping/catalogPlugins";
import { BNDIGITAL_BLOCK_REASON } from "@/src/data/scraping/BNDigitalSearchPlugin";
import { appDependencies } from "@/src/presentation/services/dependencies";

export default function Search() {
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const {
    query,
    results,
    sourceStatuses,
    nextPageUrl,
    status,
    error,
    setQuery,
    search,
    loadMore,
    isSearching,
    pendingSources,
    cancel,
    selectSource,
  } = useSearchStore();
  const { jobs, enqueue, cancel: cancelDownload } = useDownloadStore();
  const sources = useSourceStore((state) => state.sources);
  const activeSources = useMemo(() => sources.filter((source) => source.enabled && source.status === "active"), [sources]);
  const [touched, setTouched] = useState(false);
  const [sourceFilter, setSourceFilter] = useState(useSearchStore.getState().selectedSource);
  const [selectedBook, setSelectedBook] = useState<ScrapedLink | null>(null);
  const [acquisitionMessage, setAcquisitionMessage] = useState<string | null>(null);
  const [acquiring, setAcquiring] = useState(false);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const acquisitionController = useRef<AbortController | null>(null);
  useEffect(() => () => acquisitionController.current?.abort(), []);
  const loadSources = useSourceStore((state) => state.load);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const filters = useMemo(
    () => ["Todos", ...BUILTIN_CATALOG_NAMES, "Minhas Fontes", ...activeSources.map((source) => source.name)],
    [activeSources]
  );
  const visibleResults = useMemo(
    () => results.filter((item) => sourceFilter === "Todos" || (sourceFilter === "Minhas Fontes" ? activeSources.some(source => source.name === item.sourceSite) : item.sourceSite === sourceFilter)),
    [results, sourceFilter, activeSources]
  );

  useEffect(() => {
    if (!filters.includes(sourceFilter)) { setSourceFilter("Todos"); selectSource("Todos"); }
  }, [filters, sourceFilter, selectSource]);

  const submitSearch = () => {
    setTouched(true);
    setAcquisitionMessage(null);
    void search(sourceFilter);
  };

  const acquireBook = async (book: ScrapedLink) => {
    if (acquiring) return;
    setAcquisitionMessage(null);
    const controller = acquisitionController.current = new AbortController();
    setAcquiring(true);
    try {
    book = await appDependencies.searchBooks.resolveAcquisition(book, controller.signal);
    if (controller.signal.aborted) return;
    setSelectedBook(book);
    const fileName = `${safeFileBase(book.title)}.epub`;
    await enqueue({
      id: book.url,
      url: book.url,
      fileName,
      status: "queued",
      progress: 0,
      localUri: null,
      error: null,
      attempts: 0,
    });

    const job = useDownloadStore.getState().jobs[book.url];
    if (job?.status === "completed") {
      await useLibraryStore.getState().load();
      setAcquisitionMessage("EPUB baixado e adicionado à Biblioteca.");
    } else if (job?.error) {
      setAcquisitionMessage(job.error);
    }
    } catch (error) {
      if (!controller.signal.aborted) setAcquisitionMessage(error instanceof Error ? error.message : "Não foi possível adquirir este livro.");
    } finally {
      if (acquisitionController.current === controller) { acquisitionController.current = null; setAcquiring(false); }
    }
  };

  const cancelAcquisition = async (book: ScrapedLink) => {
    acquisitionController.current?.abort();
    acquisitionController.current = null;
    setAcquiring(false);
    await cancelDownload(book.url);
    setAcquisitionMessage("Importação cancelada. Nenhum livro foi adicionado.");
  };

  const retrySearch = () => {
    setTouched(true);
    void search(sourceFilter);
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background, paddingTop: Platform.OS === "web" ? 16 : Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.text }]}>Descobrir livros</Text>
          <Text style={[styles.subtitle, { color: palette.secondaryText }]}>Catálogos públicos e fontes adicionadas</Text>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: palette.surface, borderColor: palette.separator }]}>
        <Ionicons name="search-outline" size={20} color={palette.secondaryText} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          placeholder="Título, autor ou assunto"
          placeholderTextColor={palette.secondaryText}
          style={[styles.searchInput, { color: palette.text }]}
          returnKeyType="search"
          accessibilityLabel="Buscar livros"
        />
        {query.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setQuery("")} hitSlop={8} style={styles.clearButton}>
            <Ionicons name="close-circle" size={19} color={palette.secondaryText} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          disabled={!query.trim()}
          onPress={submitSearch}
          style={[styles.searchButton, { backgroundColor: palette.accent, opacity: !query.trim() ? 0.5 : 1 }]}
        >
          <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((filter) => {
          const selected = sourceFilter === filter;
          return (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => { setSourceFilter(filter); selectSource(filter); if (touched && query.trim()) void search(filter); }}
              style={[styles.filterChip, { backgroundColor: selected ? palette.accent : palette.surfaceSecondary }]}
            >
              <Text style={[styles.filterText, { color: selected ? "#FFFFFF" : palette.text }]}>{filter}</Text>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={() => setSourceNotice(BNDIGITAL_BLOCK_REASON)} style={[styles.futureChip, { borderColor: palette.separator }]}>
          <Text style={[styles.futureText, { color: palette.secondaryText }]}>BNDigital · Indisponível</Text>
        </Pressable>
      </ScrollView>

      {sourceNotice ? <Text accessibilityRole="alert" style={[styles.stateText, { color: palette.secondaryText }]}>{sourceNotice}</Text> : null}
      {sourceStatuses.length ? <Text accessibilityLiveRegion="polite" style={[styles.stateText, { color: palette.secondaryText }]}>{sourceStatuses.map(source => `${source.sourceName}: ${{ loading: "consultando", success: "concluída", empty: "sem resultados", error: "erro", cancelled: "cancelada" }[source.status]}`).join(" · ")}</Text> : null}

      {isSearching ? (
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color={palette.accent} />
          <Text style={[styles.stateText, { color: palette.secondaryText }]}>Consultando fontes…</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancelar busca" onPress={cancel}><Text style={{ color: palette.accent }}>Cancelar</Text></Pressable>
        </View>
      ) : null}

      {status === "error" ? (
        <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.separator }]}>
          <Text style={[styles.noticeTitle, { color: palette.text }]}>Não foi possível concluir a busca</Text>
          <Text style={[styles.noticeBody, { color: palette.secondaryText }]}>{error ?? "Confira sua conexão e tente novamente."}</Text>
          <Pressable accessibilityRole="button" onPress={retrySearch} style={styles.retryButton}>
            <Ionicons name="refresh-outline" size={16} color={palette.accent} />
            <Text style={{ color: palette.accent, fontWeight: "600" }}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      {status === "partial" && (pendingSources.length > 0 || sourceStatuses.some(source => source.status === "error")) ? (
        <View style={[styles.partialNotice, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="alert-circle-outline" size={17} color={palette.accent} />
          <Text style={[styles.partialText, { color: palette.text }]}>
            {pendingSources.length ? `Resultados parciais. Aguardando: ${pendingSources.join(", ")}.` : `Algumas fontes falharam: ${sourceStatuses.filter((source) => source.status === "error").map((source) => source.sourceName).join(", ")}.`}
          </Text>
        </View>
      ) : null}

      {status === "cancelled" ? <Text accessibilityLiveRegion="polite" style={[styles.stateText, { color: palette.secondaryText }]}>Busca cancelada. Os resultados já recebidos continuam disponíveis.</Text> : null}

      {touched && (status === "empty" || (status === "partial" && results.length === 0)) ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={25} color={palette.secondaryText} />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>Nenhum resultado</Text>
          <Text style={[styles.emptyBody, { color: palette.secondaryText }]}>Experimente outro título, autor ou assunto.</Text>
        </View>
      ) : null}

      {status === "idle" ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={26} color={palette.secondaryText} />
          <Text style={[styles.emptyTitle, { color: palette.text }]}>O que você quer ler?</Text>
          <Text style={[styles.emptyBody, { color: palette.secondaryText }]}>Busque por título, autor ou assunto.</Text>
        </View>
      ) : null}

      <FlatList
        data={visibleResults}
        keyExtractor={(item) => item.url}
        contentContainerStyle={[styles.results, { paddingBottom: Math.max(insets.bottom, 18) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Detalhes de ${item.title}, de ${item.author ?? "autor desconhecido"}`}
            onPress={() => { setAcquisitionMessage(null); setSelectedBook(item); }}
            style={[styles.resultRow, { backgroundColor: palette.surface, borderColor: palette.separator }]}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.coverFallback, { backgroundColor: palette.surfaceSecondary }]}>
                <Ionicons name="book-outline" size={23} color={palette.secondaryText} />
              </View>
            )}
            <View style={styles.resultBody}>
              <Text numberOfLines={2} style={[styles.resultTitle, { color: palette.text }]}>{item.title}</Text>
              <Text numberOfLines={1} style={[styles.author, { color: palette.secondaryText }]}>{item.author ?? "Autor não informado"}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.meta, { color: palette.secondaryText }]}>{item.sourceSite}</Text>
                <Text style={[styles.meta, { color: palette.secondaryText }]}>{[item.language?.toUpperCase(), item.format.toUpperCase()].filter(Boolean).join(" · ")}</Text>
              </View>
              <Text style={[styles.detailAction, { color: palette.accent }]}>Ver detalhes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.secondaryText} />
          </Pressable>
        )}
        ListFooterComponent={nextPageUrl && !isSearching ? (
          <Pressable accessibilityRole="button" onPress={() => void loadMore()} style={[styles.loadMore, { borderColor: palette.separator }]}>
            <Text style={{ color: palette.accent, fontWeight: "600" }}>Carregar mais</Text>
          </Pressable>
        ) : null}
      />

      <BookDetailsModal
        book={selectedBook}
        job={selectedBook ? jobs[selectedBook.url] : undefined}
        message={acquisitionMessage}
        acquiring={acquiring}
        palette={palette}
        onClose={() => { acquisitionController.current?.abort(); setSelectedBook(null); }}
        onAcquire={() => selectedBook ? void acquireBook(selectedBook) : undefined}
        onCancel={() => selectedBook ? void cancelAcquisition(selectedBook) : undefined}
      />
    </View>
  );
}

function BookDetailsModal({
  book,
  job,
  message,
  acquiring,
  palette,
  onClose,
  onAcquire,
  onCancel,
}: {
  book: ScrapedLink | null;
  job?: ReturnType<typeof useDownloadStore.getState>["jobs"][string];
  message: string | null;
  acquiring: boolean;
  palette: ReturnType<typeof useAppTheme>["palette"];
  onClose: () => void;
  onAcquire: () => void;
  onCancel: () => void;
}) {
  const active = acquiring || job?.status === "queued" || job?.status === "downloading";
  const canCancel = acquiring || Boolean(job?.cancellable && active);
  const progressText = job ? remoteProgressText(job) : null;
  return (
    <Modal visible={Boolean(book)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.modalBackdrop, { backgroundColor: palette.overlay }]} onPress={onClose}>
        <Pressable style={[styles.detailSheet, { backgroundColor: palette.panel }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: palette.separator }]} />
          <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            {book?.coverUrl ? <Image source={{ uri: book.coverUrl }} style={styles.detailCover} resizeMode="contain" /> : null}
            <Text style={[styles.detailTitle, { color: palette.text }]}>{book?.title}</Text>
            <Text style={[styles.detailAuthor, { color: palette.secondaryText }]}>{book?.author ?? "Autor não informado"}</Text>
            <View style={styles.detailMeta}>
              <Text style={[styles.meta, { color: palette.secondaryText }]}>Fonte: {book?.sourceSite}</Text>
              <Text style={[styles.meta, { color: palette.secondaryText }]}>Formato: {book?.format.toUpperCase()}</Text>
              {book?.language ? <Text style={[styles.meta, { color: palette.secondaryText }]}>Idioma: {book.language.toUpperCase()}</Text> : null}
              {typeof book?.downloadCount === "number" ? <Text style={[styles.meta, { color: palette.secondaryText }]}>{book.downloadCount.toLocaleString("pt-BR")} downloads</Text> : null}
            </View>
            {book?.description ? <Text style={[styles.description, { color: palette.text }]} numberOfLines={8}>{book.description}</Text> : null}
            {book?.subjects?.length ? <Text style={[styles.subjects, { color: palette.secondaryText }]}>{book.subjects.join(" · ")}</Text> : null}
            {active && progressText ? (
              <View style={styles.downloadProgress}>
                <ActivityIndicator color={palette.accent} />
                <Text accessibilityLiveRegion="polite" style={{ color: palette.secondaryText }}>{progressText}</Text>
              </View>
            ) : null}
            {job?.status === "completed" ? (
              <View style={styles.downloadProgress}>
                <Ionicons name="checkmark-circle" size={19} color="#39836B" />
                <Text style={{ color: palette.text }}>Adicionado à Biblioteca</Text>
              </View>
            ) : null}
            {job?.error || message ? <Text accessibilityRole="alert" style={[styles.errorMessage, { color: palette.accent }]}>{message ?? job?.error}</Text> : null}
            {job?.status === "cancelled" && !message ? <Text accessibilityLiveRegion="polite" style={[styles.errorMessage, { color: palette.secondaryText }]}>Importação cancelada. Nenhum livro foi adicionado.</Text> : null}
            {canCancel ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Cancelar download e importação" onPress={onCancel} style={[styles.cancelButton, { borderColor: palette.separator }]}>
                <Text style={{ color: palette.accent, fontWeight: "600" }}>Cancelar</Text>
              </Pressable>
            ) : null}
            {job?.status !== "completed" ? (
              <Pressable accessibilityRole="button" disabled={active} onPress={onAcquire} style={[styles.acquireButton, { backgroundColor: palette.accent, opacity: active ? 0.6 : 1 }]}>
                <Ionicons name="download-outline" size={19} color="#FFFFFF" />
                <Text style={styles.acquireText}>{active ? "Importação em andamento…" : job?.status === "failed" || job?.status === "cancelled" ? "Tentar novamente" : "Baixar e adicionar"}</Text>
              </Pressable>
            ) : null}
            {Platform.OS === "web" && job?.status === "failed" && book ? (
              <>
                <Text style={{ color: palette.secondaryText, fontSize: 12 }}>O servidor pode bloquear o download dentro do app por CORS. Salve o EPUB pelo navegador e use Importar na Biblioteca.</Text>
                <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(book.url)} style={styles.closeButton}>
                  <Text style={{ color: palette.accent }}>Salvar EPUB pelo navegador</Text>
                </Pressable>
              </>
            ) : null}
            {job?.status === "completed" ? (
              <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push("/(tabs)/library"); }} style={styles.closeButton}>
                <Text style={{ color: palette.accent }}>Abrir Biblioteca</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={{ color: palette.secondaryText }}>Fechar</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function safeFileBase(title: string): string {
  const normalized = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "livro";
}

function remoteProgressText(job: ReturnType<typeof useDownloadStore.getState>["jobs"][string]): string {
  switch (job.phase) {
    case "preparing": return "Preparando download…";
    case "downloading": return job.progressKnown ? `Baixando ${Math.round(job.progress * 100)}%` : "Baixando…";
    case "validating": return "Validando EPUB…";
    case "reading_metadata": return "Lendo título e capítulos…";
    case "persisting": return "Salvando na Biblioteca…";
    case "finalizing": return "Atualizando Biblioteca…";
    default: return job.status === "queued" ? "Preparando download…" : "Importando EPUB…";
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: "100%", paddingHorizontal: 16 },
  header: { minHeight: 52, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  heading: { flex: 1, gap: 3 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 12 },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 13, paddingRight: 5 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, fontSize: 15, paddingVertical: 8 },
  clearButton: { width: 32, height: 36, alignItems: "center", justifyContent: "center" },
  searchButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  filters: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 12, paddingRight: 12 },
  filterChip: { minHeight: 31, justifyContent: "center", paddingHorizontal: 11, borderRadius: 16 },
  filterText: { fontSize: 12, fontWeight: "600" },
  futureChip: { minHeight: 31, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderRadius: 16, opacity: 0.75 },
  futureText: { fontSize: 11 },
  stateRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8 },
  stateText: { fontSize: 13 },
  notice: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8, gap: 5 },
  noticeTitle: { fontSize: 14, fontWeight: "700" },
  noticeBody: { fontSize: 12, lineHeight: 18 },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 36, alignSelf: "flex-start", marginTop: 3 },
  partialNotice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 9, borderRadius: 6, marginBottom: 8 },
  partialText: { flex: 1, fontSize: 11, lineHeight: 16 },
  emptyState: { alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 24, paddingVertical: 34 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptyBody: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  results: { width: "100%", maxWidth: 720, alignSelf: "center", gap: 8, paddingBottom: 20 },
  resultRow: { minHeight: 116, flexDirection: "row", alignItems: "center", gap: 11, padding: 10, borderWidth: 1, borderRadius: 7 },
  cover: { width: 62, height: 92, borderRadius: 4, backgroundColor: "#E6E6E1" },
  coverFallback: { width: 62, height: 92, alignItems: "center", justifyContent: "center", borderRadius: 4 },
  resultBody: { flex: 1, minWidth: 0, gap: 3 },
  resultTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  author: { fontSize: 12 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 9 },
  meta: { fontSize: 10 },
  detailAction: { fontSize: 12, fontWeight: "600", marginTop: 3 },
  loadMore: { minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 7, marginVertical: 8 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 8, paddingTop: 10 },
  detailSheet: { maxHeight: "92%", width: "100%", maxWidth: 620, alignSelf: "center", borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden" },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10 },
  detailContent: { padding: 20, paddingBottom: 26, gap: 8 },
  detailCover: { width: "100%", height: 150, alignSelf: "center" },
  detailTitle: { fontSize: 22, lineHeight: 28, fontWeight: "700", marginTop: 4 },
  detailAuthor: { fontSize: 14 },
  detailMeta: { gap: 3, marginTop: 4 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  subjects: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  downloadProgress: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8 },
  errorMessage: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  acquireButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 7, marginTop: 10 },
  acquireText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  cancelButton: { minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 7, marginTop: 8 },
  closeButton: { minHeight: 40, alignItems: "center", justifyContent: "center", marginTop: 2 },
});
