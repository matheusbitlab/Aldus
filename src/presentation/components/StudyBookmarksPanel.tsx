import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { Bookmark } from "@/src/domain/repositories/BookmarkRepository";
import { ReadingAnchor } from "@/src/domain/types/readingAnchor";
import { encodeStudyLocation, exportStudyBookmarks, parseStudyBookmarksBackup, readStudyLocation } from "@/src/domain/usecases/StudyBookmarks";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { Highlight } from "@/src/domain/repositories/HighlightRepository";
import { StudyHighlightsPanel } from "@/src/presentation/components/StudyHighlightsPanel";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export function StudyBookmarksPanel({ book, capture, chapterTitle, loading, feedback, onCapture, onNavigate, onClose, highlights, onHighlightsSaved, onSelectText }: { book: LibraryBook; capture: ReadingAnchor | null; chapterTitle: string; loading: boolean; feedback: string | null; onCapture: () => void; onNavigate: (anchor: ReadingAnchor) => void; onClose: () => void; highlights?: Highlight[]; onHighlightsSaved?: () => Promise<void>; onSelectText?: () => void }) {
  const { palette } = useAppTheme(); const insets = useSafeAreaInsets();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]); const [name, setName] = useState(""); const [note, setNote] = useState(""); const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Bookmark | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [backup, setBackup] = useState(""); const [preview, setPreview] = useState<Bookmark[] | null>(null);
  const load = async () => setBookmarks(await appDependencies.bookmarkRepository.listByBookId(book.id));
  useEffect(() => { void load().catch(e => setError(e.message)); }, [book.id]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(null); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir. Tente novamente."); } finally { setBusy(false); } };
  const button = (label: string, fn: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={fn} style={[styles.button, { borderColor: palette.separator, opacity: busy || disabled ? .5 : 1 }]}><Text style={{ color: palette.text }}>{label}</Text></Pressable>;
  const save = () => run(async () => {
    if (!name.trim() || name.length > 200 || note.length > 100000) throw new Error("Informe um nome de até 200 caracteres e uma nota de até 100 mil caracteres.");
    const old = editing ? readStudyLocation(editing) : null; const anchor = old?.anchor ?? capture;
    if (!anchor) throw new Error("Capture a localização antes de salvar.");
    const bookmark: Bookmark = { id: editing?.id ?? `bookmark-${Date.now()}-${Math.random().toString(36).slice(2)}`, bookId: book.id, chapterId: anchor.kind === "epub-text" ? anchor.chapterId : "",
      cfiPosition: encodeStudyLocation({ format: "kindle-study-bookmark", version: 1, name: name.trim(), chapterTitle: old?.chapterTitle ?? chapterTitle, anchor }), textPreview: anchor.kind === "epub-text" ? anchor.quote : "", note: note.trim() || null, createdAt: editing?.createdAt ?? Date.now() };
    await appDependencies.bookmarkRepository.save(bookmark); await load(); setEditing(null); setName(""); setNote("");
  });
  const exportData = (format: "json" | "markdown" | "text") => run(async () => {
    const records = await appDependencies.bookmarkRepository.listByBookId(book.id); const text = exportStudyBookmarks(book, records, format);
    if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([text], { type: format === "json" ? "application/json" : "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `marcadores.${format === "markdown" ? "md" : format === "json" ? "json" : "txt"}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    else await Share.share({ title: "Marcadores e notas", message: text });
    setBackup(text); setPreview(null);
  });
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = bookmarks.filter(b => `${readStudyLocation(b)?.name ?? "Marcador antigo"} ${b.note ?? ""} ${b.textPreview}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized));
  return <Modal visible transparent onRequestClose={() => { if (!busy) onClose(); }}><View style={[styles.backdrop, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}><View style={[styles.panel, { backgroundColor: palette.panel }]}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={[styles.heading, { color: palette.text }]}>Marcadores e notas</Text>
    <Text style={{ color: palette.secondaryText }}>EPUB usa trecho e contexto do capítulo; PDF Original usa a página fonte. Se o trecho não puder ser localizado com segurança, a nota permanece disponível aqui.</Text>
    {button(loading ? "Localizando…" : "Capturar localização atual", () => { setEditing(null); onCapture(); }, loading)}
    {capture ? <Text style={{ color: palette.text }}>{capture.kind === "epub-text" ? capture.quote : `Página fonte do PDF: ${capture.sourcePage}`}</Text> : null}
    {feedback ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{feedback}</Text> : null}
    <TextInput accessibilityLabel="Nome do marcador" placeholder="Nome do marcador" placeholderTextColor={palette.secondaryText} value={name} onChangeText={setName} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} />
    <TextInput accessibilityLabel="Nota do marcador" placeholder="Sua nota" placeholderTextColor={palette.secondaryText} value={note} onChangeText={setNote} multiline style={[styles.input, { color: palette.text, borderColor: palette.separator, minHeight: 72 }]} />
    {button(editing ? "Salvar alterações da nota" : "Salvar marcador e nota", () => void save(), !editing && !capture)}
    {editing ? button("Cancelar edição", () => { setEditing(null); setName(""); setNote(""); }) : null}
    <TextInput accessibilityLabel="Buscar marcadores e notas" placeholder="Buscar nome, trecho ou nota" placeholderTextColor={palette.secondaryText} value={query} onChangeText={setQuery} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} />
    {visible.map(b => { const location = readStudyLocation(b); return <View key={b.id} style={[styles.record, { borderColor: palette.separator }]}><Text style={{ color: palette.text, fontWeight: "700" }}>{location?.name ?? "Marcador antigo"}</Text><Text style={{ color: palette.secondaryText }}>{location?.anchor.kind === "pdf-page" ? `Página fonte ${location.anchor.sourcePage}` : location?.chapterTitle ?? "Localização antiga indisponível"}</Text><Text style={{ color: palette.text }}>{b.textPreview}</Text><Text style={{ color: palette.text }}>{b.note}</Text><View style={styles.row}>{location ? button("Ir ao trecho", () => onNavigate(location.anchor)) : null}{location ? button("Editar nota", () => { setEditing(b); setName(location.name); setNote(b.note ?? ""); }) : null}{button("Excluir marcador", () => void run(async () => { await appDependencies.bookmarkRepository.remove(b.id); await load(); if (editing?.id === b.id) { setEditing(null); setName(""); setNote(""); } }))}</View></View>; })}
    {!visible.length ? <Text style={{ color: palette.secondaryText }}>Nenhum marcador encontrado.</Text> : null}
    <Text style={{ color: palette.text, fontWeight: "700" }}>Exportar e recuperar marcadores</Text>
    <View style={styles.row}>{button("Markdown", () => void exportData("markdown"))}{button("Texto", () => void exportData("text"))}{button("JSON", () => void exportData("json"))}</View>
    <TextInput accessibilityLabel="Backup JSON dos marcadores" placeholder="Cole o JSON deste livro para restaurar" placeholderTextColor={palette.secondaryText} value={backup} onChangeText={v => { setBackup(v); setPreview(null); }} multiline style={[styles.input, { color: palette.text, borderColor: palette.separator, minHeight: 100 }]} />
    {button("Conferir marcadores importados", () => { try { setPreview(parseStudyBookmarksBackup(backup, book)); setError(null); } catch (e) { setPreview(null); setError(e instanceof Error ? e.message : "Backup inválido."); } })}
    {preview ? <><Text style={{ color: palette.text }}>{preview.length} marcadores válidos. Identificadores já existentes serão preservados. Se um registro existir em outro livro, a importação será recusada.</Text>{button("Importar preservando os existentes", () => void run(async () => {
      const result = await appDependencies.bookmarkRepository.importPreservingExisting(book.id, preview);
      await load(); setPreview(null); setError(`${result.imported} marcadores recuperados; ${result.skipped} existentes foram preservados.`);
    }))}</> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
    {highlights && onHighlightsSaved && onSelectText ? <StudyHighlightsPanel book={book} capture={capture?.kind === "epub-text" ? capture : null} chapterTitle={chapterTitle} highlights={highlights} onSaved={onHighlightsSaved} onSelect={onSelectText} onNavigate={onNavigate} /> : null}
    {button("Fechar marcadores", onClose)}
  </ScrollView></View></View></Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.5)", paddingHorizontal: 16, justifyContent: "center", alignItems: "center" }, panel: { width: "100%", maxWidth: 660, maxHeight: "100%", borderRadius: 12 }, content: { padding: 20, gap: 12 }, heading: { fontSize: 22, fontWeight: "700" }, input: { borderWidth: 1, borderRadius: 6, minHeight: 44, padding: 10 }, button: { borderWidth: 1, borderRadius: 6, padding: 10, minHeight: 44 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, record: { padding: 12, gap: 8, borderWidth: 1, borderRadius: 6 } });
