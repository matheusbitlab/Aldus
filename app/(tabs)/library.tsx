import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { useLibrary } from "@/src/presentation/hooks/useLibrary";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { libraryOrganization } from "@/src/presentation/services/dependencies";
import { BookOrganizationModal, readingStatusLabels } from "@/src/presentation/components/BookOrganizationModal";
import { inferredReadingStatus, normalizeLibraryText, OrganizationRecords } from "@/src/domain/types/libraryOrganization";
import { BookCard as SharedBookCard } from "@/src/presentation/components/BookCard";
import { Book, MOCK_BOOKS } from "@/src/constants/mockBooks";
import { markEpubLibraryReady, startEpubOpenTrace } from "@/src/utils/epubOpenMetrics";
import { useBookImport } from "@/src/presentation/hooks/useBookImport";
import { BookImportModal } from "@/src/presentation/components/BookImportModal";
import { BookCloudControls } from '@/src/presentation/components/LibrarySyncControls';

type BookFilter = "all" | "reading" | "completed" | "unread" | "interrupted" | "favorites";
type BookSort = "recent" | "title" | "author" | "progress" | "series";
type OpenMenu = "filter" | "sort" | null;

const filters: { value: BookFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "reading", label: "Lendo" },
  { value: "completed", label: "Concluídos" },
  { value: "unread", label: "Não lidos" },
  { value: "interrupted", label: "Interrompidos" },
  { value: "favorites", label: "Favoritos" },
];

const sorts: { value: BookSort; label: string }[] = [
  { value: "recent", label: "Adicionados recentemente" },
  { value: "title", label: "Título A–Z" },
  { value: "author", label: "Autor" },
  { value: "progress", label: "Progresso" },
  { value: "series", label: "Série e volume" },
];

const mockBooksByTitle = new Map(
  MOCK_BOOKS.map((book) => [normalizeBookTitle(book.title), book])
);
const mockBooksByFileName = new Map(
  MOCK_BOOKS.map((book) => [normalizeBookTitle(book.fileUri.split(/[\\/]/).pop() ?? ""), book])
);

export default function Library() {
  const insets = useSafeAreaInsets();
  const { books, status, error, reload } = useLibrary();
  const { palette, resolvedTheme, setMode } = useAppTheme();
  const bookImport = useBookImport(reload);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BookFilter>("all");
  const [sort, setSort] = useState<BookSort>("recent");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [organization, setOrganization] = useState<OrganizationRecords>({});
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [organizing, setOrganizing] = useState<LibraryBook | null>(null);
  const [collection, setCollection] = useState("");
  const loadOrganization = async () => {
    try { setOrganization(await libraryOrganization.list()); setOrganizationError(null); }
    catch (failure) { setOrganizationError(failure instanceof Error ? failure.message : "Não foi possível carregar a organização."); }
  };
  const refreshOrganization = async () => {
    setOrganization(await libraryOrganization.list()); setOrganizationError(null); await reload();
  };
  useEffect(() => { void loadOrganization(); }, [books]);
  const collections = useMemo(() => [...new Set(books.flatMap(book => organization[book.id]?.collections ?? []))].sort((a, b) => a.localeCompare(b, "pt-BR")), [books, organization]);
  useEffect(() => { if (collection && !collections.includes(collection)) setCollection(""); }, [collection, collections]);

  useEffect(() => {
    if (status === "success") markEpubLibraryReady();
  }, [status]);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = normalizeLibraryText(query);
    const filtered = books.filter((book) => {
      const record = organization[book.id];
      const readingStatus = inferredReadingStatus(book, record);
      const matchesQuery =
        !normalizedQuery ||
        normalizeLibraryText(`${book.title} ${book.author} ${record?.series ?? ""} ${record?.collections.join(" ") ?? ""} ${record?.tags.join(" ") ?? ""}`).includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "favorites" ? record?.favorite : filter === readingStatus);
      return matchesQuery && matchesFilter && (!collection || record?.collections.includes(collection));
    });

    return filtered.sort((first, second) => {
      if (sort === "title")
        return first.title.localeCompare(second.title, "pt-BR", {
          sensitivity: "base",
        });
      if (sort === "author")
        return first.author.localeCompare(second.author, "pt-BR", {
          sensitivity: "base",
        });
      if (sort === "progress") return second.progress - first.progress;
      if (sort === "series") return (organization[first.id]?.series ?? "").localeCompare(organization[second.id]?.series ?? "", "pt-BR") || (organization[first.id]?.volume ?? Infinity) - (organization[second.id]?.volume ?? Infinity) || first.title.localeCompare(second.title, "pt-BR");
      return second.addedDate - first.addedDate;
    });
  }, [books, filter, query, sort, organization, collection]);

  const selectedFilter =
    filters.find((item) => item.value === filter)?.label ?? "Todos";
  const selectedSort =
    sorts.find((item) => item.value === sort)?.label ??
    "Adicionados recentemente";

  const paddingTop = Platform.OS === "web" ? 16 : Math.max(insets.top, 16);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: palette.background, paddingTop },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.text }]}>
            Sua Biblioteca
          </Text>
          <Text style={[styles.bookCount, { color: palette.secondaryText }]}>
            {books.length} {books.length === 1 ? "livro" : "livros"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resolvedTheme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          hitSlop={8}
          onPress={() => void setMode(resolvedTheme === "dark" ? "light" : "dark")}
          style={[styles.themeButton, { backgroundColor: palette.surfaceSecondary }]}
        >
          <Ionicons
            name={resolvedTheme === "dark" ? "sunny-outline" : "moon-outline"}
            size={20}
            color={palette.text}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Importar livro"
          style={[styles.importButton, { backgroundColor: palette.accent }]}
          onPress={() => void bookImport.start()}
          disabled={bookImport.busy}
        >
          {bookImport.busy ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="add" size={21} color="#FFFFFF" />
          )}
          <Text style={styles.importLabel}>
            {bookImport.selecting ? "Selecionando" : bookImport.busy ? "Importando" : "Importar"}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: palette.panel,
            borderColor: palette.separator,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={19}
          color={palette.secondaryText}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Título, autor, série, tag ou coleção"
          placeholderTextColor={palette.secondaryText}
          style={[styles.searchInput, { color: palette.text }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Buscar livros por metadados"
        />
      </View>

      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filtrar livros: ${selectedFilter}`}
          style={[styles.toolbarButton, { borderColor: palette.separator }]}
          onPress={() =>
            setOpenMenu(openMenu === "filter" ? null : "filter")
          }
        >
          <Ionicons name="funnel-outline" size={16} color={palette.text} />
          <Text
            numberOfLines={1}
            style={[styles.toolbarLabel, { color: palette.text }]}
          >
            {selectedFilter}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={palette.secondaryText}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ordenar livros: ${selectedSort}`}
          style={[styles.toolbarButton, { borderColor: palette.separator }]}
          onPress={() => setOpenMenu(openMenu === "sort" ? null : "sort")}
        >
          <Ionicons
            name="swap-vertical-outline"
            size={16}
            color={palette.text}
          />
          <Text
            numberOfLines={1}
            style={[styles.toolbarLabel, { color: palette.text }]}
          >
            {selectedSort}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={palette.secondaryText}
          />
        </Pressable>
      </View>

      {openMenu === "filter" ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: palette.panel,
              borderColor: palette.separator,
            },
          ]}
        >
          {filters.map((item) => (
            <MenuOption
              key={item.value}
              label={item.label}
              selected={filter === item.value}
              palette={palette}
              onPress={() => {
                setFilter(item.value);
                setOpenMenu(null);
              }}
            />
          ))}
        </View>
      ) : null}
      {openMenu === "sort" ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: palette.panel,
              borderColor: palette.separator,
            },
          ]}
        >
          {sorts.map((item) => (
            <MenuOption
              key={item.value}
              label={item.label}
              selected={sort === item.value}
              palette={palette}
              onPress={() => {
                setSort(item.value);
                setOpenMenu(null);
              }}
            />
          ))}
        </View>
      ) : null}

      <ScrollView horizontal style={{ flexGrow: 0, marginBottom: 10 }} contentContainerStyle={{ gap: 8 }}>
        {collections.length ? ["", ...collections].map(name => <Pressable key={name} accessibilityRole="button" accessibilityState={{ selected: collection === name }} onPress={() => setCollection(name)} style={[styles.collectionChip, { borderColor: collection === name ? palette.accent : palette.separator }]}><Text style={{ color: palette.text }}>{name || "Todas as coleções"}</Text></Pressable>) : null}
      </ScrollView>
      {organizationError ? <View><Text accessibilityRole="alert" style={{ color: palette.accent }}>{organizationError}</Text><Pressable onPress={() => void loadOrganization()}><Text style={{ color: palette.text }}>Recarregar organização</Text></Pressable></View> : null}
      {(status === "loading" || status === "idle") && books.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.accent} />
          <Text style={{ color: palette.secondaryText }}>
            Carregando biblioteca...
          </Text>
        </View>
      ) : null}
      {status === "error" ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>
            Não foi possível carregar a biblioteca.
          </Text>
          {error ? (
            <Text style={[styles.emptyHint, { color: palette.secondaryText }]}>
              {error}
            </Text>
          ) : null}
          <Pressable onPress={() => void reload()}>
            <Text style={{ color: palette.accent }}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}
      {status !== "error" && (status === "success" || books.length > 0) ? (
        <FlatList
          data={visibleBooks}
          numColumns={2}
          keyExtractor={(book) => book.id}
          renderItem={({ item }) => (
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <SharedBookCard
              book={toCardBook(item, Boolean(organization[item.id]))}
              themeMode={resolvedTheme}
              onPress={() => {
                if (
                  item.mimeType === "application/epub+zip" &&
                  item.filePath.startsWith("bundled-epub://")
                ) {
                  startEpubOpenTrace(item.id, {
                    fileName: item.fileName,
                    source: "bundled-epub",
                  });
                }
                router.push({
                  pathname: "/reader/[bookId]",
                  params: { bookId: item.id },
                });
              }}
            />
            <Text numberOfLines={1} style={{ color: palette.secondaryText, fontSize: 12 }}>{organization[item.id]?.favorite ? "★ · " : ""}{readingStatusLabels[inferredReadingStatus(item, organization[item.id])]}{organization[item.id]?.series ? ` · ${organization[item.id].series}${organization[item.id].volume ? ` ${organization[item.id].volume}` : ""}` : ""}</Text>
            <BookCloudControls book={item}/>
            <Pressable accessibilityRole="button" accessibilityLabel={`Organizar ${toCardBook(item, Boolean(organization[item.id])).title}`} disabled={Boolean(organizationError)} onPress={() => { const displayed = toCardBook(item, Boolean(organization[item.id])); setOrganizing({ ...item, title: displayed.title, author: displayed.author }); }} style={[styles.collectionChip, { borderColor: palette.separator }]}><Text style={{ color: palette.text, textAlign: "center" }}>Organizar</Text></Pressable>
            </View>
          )}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>
                {books.length === 0
                  ? "Sua estante está vazia"
                  : "Nenhum livro encontrado"}
              </Text>
              <Text style={[styles.emptyHint, { color: palette.secondaryText }]}>
                {books.length === 0
                  ? "Importe um EPUB ou PDF para começar."
                  : "Tente outro termo, filtro ou ordenação."}
              </Text>
            </View>
          }
        />
      ) : null}
      {organizing ? <BookOrganizationModal book={organizing} record={organization[organizing.id]} onClose={() => setOrganizing(null)} onSaved={refreshOrganization} /> : null}
      <BookImportModal
        state={bookImport.state}
        onCancel={bookImport.cancel}
        onClose={bookImport.dismiss}
        onImportAnother={() => { bookImport.dismiss(); void bookImport.start(); }}
        onOpenBook={() => {
          const bookId = bookImport.importedBook?.id;
          bookImport.dismiss();
          if (bookId) router.push({ pathname: "/reader/[bookId]", params: { bookId } });
        }}
      />
    </View>
  );
}

function MenuOption({
  label,
  selected,
  palette,
  onPress,
}: {
  label: string;
  selected: boolean;
  palette: ReturnType<typeof useAppTheme>["palette"];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      style={styles.menuOption}
      onPress={onPress}
    >
      <Text
        style={[
          styles.menuLabel,
          { color: selected ? palette.accent : palette.text },
        ]}
      >
        {label}
      </Text>
      {selected ? (
        <Ionicons name="checkmark" size={18} color={palette.accent} />
      ) : null}
    </Pressable>
  );
}

function toCardBook(book: LibraryBook, hasOrganization = false): Book {
  const mockBook =
    mockBooksByTitle.get(normalizeBookTitle(book.title)) ??
    mockBooksByFileName.get(normalizeBookTitle(book.fileName));
  return {
    id: book.id,
    title: hasOrganization ? book.title : mockBook?.title ?? book.title,
    author: hasOrganization ? book.author : mockBook?.author ?? book.author,
    format: book.mimeType === "application/pdf" ? "pdf" : "epub",
    coverUri: hasOrganization ? book.coverImagePath ?? mockBook?.coverUri : mockBook?.coverUri ?? book.coverImagePath ?? undefined,
    fileUri: book.filePath,
    progress: book.progress,
  };
}

function normalizeBookTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const styles = StyleSheet.create({
  collectionChip: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 6, minHeight: 36 },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    width: "100%",
  },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  heading: {
    flex: 1,
    gap: 3,
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
  },
  bookCount: {
    fontSize: 12,
  },
  importButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 13,
    borderRadius: 8,
  },
  importLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  searchBox: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    paddingVertical: 0,
  },
  toolbar: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
  },
  toolbarButton: {
    flex: 1,
    minWidth: 0,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  toolbarLabel: {
    flex: 1,
    fontSize: 12,
  },
  dropdown: {
    position: "absolute",
    top: 174,
    left: 16,
    right: 16,
    zIndex: 20,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    elevation: 8,
  },
  menuOption: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  menuLabel: {
    fontSize: 14,
  },
  loading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 42,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 28,
  },
  gridRow: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
});
