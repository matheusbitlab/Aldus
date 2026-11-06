import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BookCover } from '@/src/presentation/components/BookCover';
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
import { sourceCapabilities, sourceIdentity } from "@/src/domain/types/sourceCatalog";
import type { UserSource } from "@/src/domain/types/sources";
import { sourceLibraryTypeLabel, sourceVisibleInAccount, useSourceAccountId } from "@/src/presentation/components/sourcePresentation";
import { AppText, Button, Chip, ChipRow, EmptyState, IconButton, layout, ListGroup, ListRow, ScreenHeader, SearchField, Section, space } from "@/src/ui";

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
  const accountId = useSourceAccountId();
  // Somente fontes da conta atual (Sources ainda são persistidas por dispositivo, BUG 12).
  const accountSources = useMemo(() => sources.filter(source => sourceVisibleInAccount(source, accountId)), [sources, accountId]);
  const activeSources = useMemo(() => accountSources.filter((source) => source.enabled && source.status === "active"), [accountSources]);
  const [touched, setTouched] = useState(false);
  const [sourceFilter, setSourceFilter] = useState(useSearchStore.getState().selectedSource);
  const externalSourceFilter = useSearchStore(state => state.selectedSource);
  useEffect(() => { setSourceFilter(externalSourceFilter); }, [externalSourceFilter]);
  const [selectedBook, setSelectedBook] = useState<ScrapedLink | null>(null);
  const [acquisitionMessage, setAcquisitionMessage] = useState<string | null>(null);
  const [acquiring, setAcquiring] = useState(false);
  const [sourceNotice, setSourceNotice] = useState<string | null>(null);
  const acquisitionController = useRef<AbortController | null>(null);
  useEffect(() => () => acquisitionController.current?.abort(), []);
  const loadSources = useSourceStore((state) => state.load);
  const { width } = useWindowDimensions();
  const gutter = layout.gutter(width);
  const openSource = (source: UserSource) => {
    const capabilities = sourceCapabilities(source);
    if (capabilities.supportsCatalog) router.push({ pathname: "/sources/[sourceId]", params: { sourceId: source.id } } as never);
    else if (capabilities.supportsSearch) { setSourceFilter(source.name); selectSource(source.name); }
    else router.push("/sources" as never);
  };

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
    const format = book.format === "pdf" ? "pdf" : "epub";
    const fileName = `${safeFileBase(book.title.replace(/\.(?:epub|pdf)$/i, ""))}.${format}`;
    await enqueue({
      id: book.url,
      url: book.url,
      fileName,
      format,
      drive: book.drive && book.sourceId ? { sourceId: book.sourceId, fileId: book.drive.fileId } : undefined,
      source: book.sourceId ? { sourceId: book.sourceId, remoteBookId: book.drive?.fileId ?? book.remoteBookId ?? book.url, sourceIdentity: sources.find(source => source.id === book.sourceId) ? sourceIdentity(sources.find(source => source.id === book.sourceId)!) : undefined } : undefined,
      status: "queued",
      progress: 0,
      localUri: null,
      error: null,
      attempts: 0,
    });

    const job = useDownloadStore.getState().jobs[book.url];
    if (job?.status === "completed") {
      await useLibraryStore.getState().load();
      setAcquisitionMessage("Livro baixado e adicionado à Biblioteca.");
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

  const discoverSources = (
    <View style={styles.discover}>
      <Section
        title="Suas fontes"
        action={<Button label="Adicionar fonte" icon="add" variant="primary" onPress={() => router.push("/sources?add=1" as never)} />}
      >
        {accountSources.length ? (
          <ListGroup>
            {accountSources.map(source => (
              <ListRow
                key={source.id}
                title={source.name}
                description={source.enabled ? sourceLibraryTypeLabel(source.kind) : `${sourceLibraryTypeLabel(source.kind)} · desativada`}
                icon={source.kind === "google-drive" ? "logo-google" : source.kind === "json" ? "link-outline" : "library-outline"}
                onPress={() => openSource(source)}
              />
            ))}
          </ListGroup>
        ) : (
          <AppText variant="bodySmall" tone="secondary">
            Conecte o Google Drive ou adicione uma biblioteca por link para encontrar seus livros aqui.
          </AppText>
        )}
        <Button label="Gerenciar fontes" variant="ghost" trailingIcon="chevron-forward" onPress={() => router.push("/sources" as never)} />
      </Section>
      <ListGroup title="Bibliotecas digitais">
        <ListRow title="BibliON" description="Biblioteca digital gratuita" icon="library-outline" onPress={() => router.push("/services/biblion" as never)} />
        <ListRow title="MEC Livros" description="Acervo digital do Ministério da Educação" icon="school-outline" onPress={() => router.push("/services/mec" as never)} />
      </ListGroup>
    </View>
  );

  const header = (
    <View style={styles.headerBlock}>
      <ScreenHeader title="Descobrir" subtitle="Catálogos públicos, suas fontes e bibliotecas digitais." large />
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <SearchField value={query} onChangeText={setQuery} onSubmit={submitSearch} placeholder="Título, autor ou assunto" label="Buscar livros" />
        </View>
        <IconButton icon="arrow-forward" label="Buscar" appearance="filled" disabled={!query.trim()} onPress={submitSearch} />
      </View>
      <ChipRow label="Filtrar por fonte">
        {filters.map(filter => (
          <Chip
            key={filter}
            label={filter}
            selected={sourceFilter === filter}
            onPress={() => { setSourceFilter(filter); selectSource(filter); if (touched && query.trim()) void search(filter); }}
          />
        ))}
        <Chip label="BNDigital · Indisponível" icon="alert-circle-outline" accessibilityHint="Fonte indisponível no momento" onPress={() => setSourceNotice(BNDIGITAL_BLOCK_REASON)} />
      </ChipRow>

      {sourceNotice ? <AppText variant="bodySmall" tone="secondary" accessibilityRole="alert">{sourceNotice}</AppText> : null}
      {sourceStatuses.length ? <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">{sourceStatuses.map(source => `${source.sourceName}: ${{ loading: "consultando", success: "concluída", empty: "sem resultados", error: "erro", cancelled: "cancelada" }[source.status]}`).join(" · ")}</AppText> : null}

      {isSearching ? (
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color={palette.accent} />
          <AppText variant="bodySmall" tone="secondary" style={{ flex: 1 }}>Consultando fontes…</AppText>
          <Button label="Cancelar busca" variant="ghost" onPress={cancel} />
        </View>
      ) : null}

      {status === "error" ? (
        <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <AppText variant="label">Não foi possível concluir a busca</AppText>
          <AppText variant="bodySmall" tone="secondary">{error ?? "Confira sua conexão e tente novamente."}</AppText>
          <Button label="Tentar novamente" icon="refresh-outline" variant="ghost" onPress={retrySearch} />
        </View>
      ) : null}

      {status === "partial" && (pendingSources.length > 0 || sourceStatuses.some(source => source.status === "error")) ? (
        <View style={[styles.partialNotice, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="alert-circle-outline" size={17} color={palette.accent} />
          <AppText variant="caption" style={{ flex: 1 }}>
            {pendingSources.length ? `Resultados parciais. Aguardando: ${pendingSources.join(", ")}.` : `Algumas fontes falharam: ${sourceStatuses.filter((source) => source.status === "error").map((source) => source.sourceName).join(", ")}.`}
          </AppText>
        </View>
      ) : null}

      {status === "cancelled" ? <AppText variant="bodySmall" tone="secondary" accessibilityLiveRegion="polite">Busca cancelada. Os resultados já recebidos continuam disponíveis.</AppText> : null}

      {touched && (status === "empty" || (status === "partial" && results.length === 0)) ? (
        <EmptyState icon="search-outline" title="Nenhum resultado" description="Experimente outro título, autor ou assunto." />
      ) : null}

      {status === "idle" ? discoverSources : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <FlatList
        data={visibleResults}
        keyExtractor={(item) => item.url}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.results, { maxWidth: layout.content + gutter * 2, paddingHorizontal: gutter, paddingTop: Platform.OS === "web" ? space.xxl : Math.max(insets.top, space.lg), paddingBottom: Math.max(insets.bottom, space.xxl) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Detalhes de ${item.title}, de ${item.author ?? "autor desconhecido"}`}
            onPress={() => { setAcquisitionMessage(null); setSelectedBook(item); }}
            style={[styles.resultRow, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <View style={styles.cover}><BookCover identity={item.remoteBookId ?? item.url} title={item.title} author={item.author} format={item.format} source={item.coverUrl ? { uri: item.coverUrl } : null} compact /></View>
            <View style={styles.resultBody}>
              <AppText variant="subheading" numberOfLines={2}>{item.title}</AppText>
              <AppText variant="bodySmall" tone="secondary" numberOfLines={1}>{item.author ?? "Autor não informado"}</AppText>
              <AppText variant="caption" tone="secondary">{[item.sourceSite, item.language?.toUpperCase(), item.format.toUpperCase()].filter(Boolean).join(" · ")}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.secondaryText} />
          </Pressable>
        )}
        ListFooterComponent={nextPageUrl && !isSearching ? (
          <Button label="Carregar mais" variant="secondary" block onPress={() => void loadMore()} style={{ marginTop: space.sm }} />
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
            {book ? <View style={styles.detailCover}><BookCover identity={book.remoteBookId ?? book.url} title={book.title} author={book.author} format={book.format} source={book.coverUrl ? { uri: book.coverUrl } : null} /></View> : null}
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
                <Ionicons name="download-outline" size={19} color={palette.onAccent} />
                <Text style={[styles.acquireText, { color: palette.onAccent }]}>{active ? "Importação em andamento…" : job?.status === "failed" || job?.status === "cancelled" ? "Tentar novamente" : "Baixar e adicionar"}</Text>
              </Pressable>
            ) : null}
            {Platform.OS === "web" && job?.status === "failed" && book && !book.drive ? (
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
    case "validating": return "Validando arquivo…";
    case "reading_metadata": return "Lendo título e capítulos…";
    case "persisting": return "Salvando na Biblioteca…";
    case "finalizing": return "Atualizando Biblioteca…";
    default: return job.status === "queued" ? "Preparando download…" : "Importando livro…";
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: "100%" },
  headerBlock: { gap: space.lg, marginBottom: space.lg },
  searchRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  searchField: { flex: 1, minWidth: 0 },
  discover: { gap: space.xxxl, marginTop: space.sm },
  stateRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  notice: { borderWidth: 1, borderRadius: 10, padding: space.md, gap: space.xs },
  partialNotice: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, padding: space.sm + 2, borderRadius: 10 },
  results: { width: "100%", alignSelf: "center", gap: space.sm },
  resultRow: { minHeight: 116, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14 },
  cover: { width: 62, height: 92, borderRadius: 4, backgroundColor: "#E6E6E1" },
  resultBody: { flex: 1, minWidth: 0, gap: space.xxs },
  meta: { fontSize: 10 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 8, paddingTop: 10 },
  detailSheet: { maxHeight: "92%", width: "100%", maxWidth: 620, alignSelf: "center", borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden" },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10 },
  detailContent: { padding: 20, paddingBottom: 26, gap: 8 },
  detailCover: { width: 130, height: 195, alignSelf: "center", overflow: 'hidden', borderRadius: 5 },
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
