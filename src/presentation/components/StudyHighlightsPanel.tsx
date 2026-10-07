import { useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { LibraryBook } from "@/src/domain/entities/LibraryBook";
import { Highlight, HighlightColor } from "@/src/domain/repositories/HighlightRepository";
import { TextReadingAnchor } from "@/src/domain/types/readingAnchor";
import { exportStudyHighlights, parseStudyHighlightsBackup, readHighlightLocation, StudyHighlightLocation } from "@/src/domain/usecases/StudyHighlights";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { createFlashcardDeckId, createFlashcardId, flashcardsForUser } from "@/src/data/local/FlashcardRepository";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { FlashcardSnapshot } from "@/src/domain/types/flashcards";

const colors: Record<HighlightColor, string> = { yellow: "Amarelo", green: "Verde", blue: "Azul", pink: "Rosa", purple: "Roxo" };
export function StudyHighlightsPanel({ book, capture, chapterTitle, highlights, onSaved, onSelect, onNavigate }: { book: LibraryBook; capture: TextReadingAnchor | null; chapterTitle: string; highlights: Highlight[]; onSaved: () => Promise<void>; onSelect: () => void; onNavigate: (anchor: TextReadingAnchor) => void }) {
  const { palette } = useAppTheme();
  const { user, canUse } = useAuth();
  const [color, setColor] = useState<HighlightColor>("yellow"); const [filter, setFilter] = useState<HighlightColor | "all">("all");
  const [note, setNote] = useState(""); const [editing, setEditing] = useState<Highlight | null>(null); const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [backup, setBackup] = useState(""); const [preview, setPreview] = useState<Highlight[] | null>(null);
  const run = async (operation: () => Promise<void>) => { setBusy(true); setError(null); try { await operation(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o grifo."); } finally { setBusy(false); } };
  const button = (label: string, press: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={press} style={[styles.button, { borderColor: palette.separator, opacity: busy || disabled ? .5 : 1 }]}><Text style={{ color: palette.text }}>{label}</Text></Pressable>;
  const save = () => run(async () => {
    const old = editing ? readHighlightLocation(editing) : null; const anchor = old?.anchor ?? capture;
    if (!anchor) throw new Error("Selecione ou capture um trecho antes de grifar.");
    if (note.length > 100000) throw new Error("A nota excede 100 mil caracteres.");
    const location: StudyHighlightLocation = { format: "kindle-study-highlight", version: 1, anchor, chapterTitle: old?.chapterTitle ?? chapterTitle, note: note.trim() };
    const encoded = JSON.stringify(location);
    await appDependencies.highlightRepository.save({ id: editing?.id ?? `highlight-${Date.now()}-${Math.random().toString(36).slice(2)}`, bookId: book.id, chapterId: anchor.chapterId, startCfi: encoded, endCfi: encoded, highlightedText: anchor.quote, colorLabel: color, createdAt: editing?.createdAt ?? Date.now() });
    await onSaved(); setEditing(null); setNote("");
  });
  const exportData = (format: "json" | "markdown" | "text") => run(async () => {
    const text = exportStudyHighlights(book, await appDependencies.highlightRepository.listByBookId(book.id), format);
    if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([text], { type: format === "json" ? "application/json" : "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `grifos.${format === "markdown" ? "md" : format === "json" ? "json" : "txt"}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    else await Share.share({ title: "Grifos e notas", message: text });
    setBackup(text); setPreview(null);
  });
  const createFlashcard = (highlight: Highlight) => run(async () => {
    if (!user || !canUse("flashcards")) throw new Error("Flashcards não estão disponíveis para esta conta.");
    const localFlashcards = flashcardsForUser(user.id);
    const location = readHighlightLocation(highlight);
    if (!location?.anchor || location.anchor.kind !== "epub-text") throw new Error("Este grifo não tem uma origem textual EPUB recuperável.");
    const snapshot: FlashcardSnapshot = await localFlashcards.load();
    let deck = snapshot.decks.find(value => value.bookIds.includes(book.id) && value.category === "Grifos");
    const now = Date.now();
    if (!deck) {
      deck = { id: createFlashcardDeckId(), title: `Grifos: ${book.title}`, description: "Cartões criados a partir dos grifos do livro", category: "Grifos", bookIds: [book.id], isGenerated: false, createdAt: now, updatedAt: now };
      await localFlashcards.createDeck(deck);
    }
    if (snapshot.cards.some(card => card.deckId === deck!.id && card.source.kind === "highlight" && card.source.quote === highlight.highlightedText)) return;
    await localFlashcards.createCards([{ id: createFlashcardId(), deckId: deck.id, front: `Explique o trecho destacado em ${location.chapterTitle || "este capítulo"}.`, back: highlight.highlightedText, difficulty: "MEDIUM", tags: [book.title, "grifo"], status: "approved", interval: 1, repetition: 0, easeFactor: 2.5, dueAt: now, source: { kind: "highlight", bookId: book.id, chapterId: location.anchor.chapterId, chapterTitle: location.chapterTitle, quote: location.anchor.quote, prefix: location.anchor.prefix, suffix: location.anchor.suffix, sourcePage: null }, createdAt: now, updatedAt: now }]);
  });
  const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = highlights.filter(h => (filter === "all" || h.colorLabel === filter) && normalize(`${h.highlightedText} ${readHighlightLocation(h)?.note ?? ""}`).includes(normalize(query)));
  return <View style={styles.content}>
    <Text style={{ color: palette.text, fontSize: 20, fontWeight: "700" }}>Grifos do EPUB</Text>
    {button("Selecionar trecho no livro", onSelect)}
    <Text style={{ color: palette.secondaryText }}>No modo de seleção, as áreas de virar página ficam desativadas. Selecione um trecho de um único capítulo e solte para voltar a este painel.</Text>
    <View style={styles.row}>{(Object.keys(colors) as HighlightColor[]).map(c => <Pressable key={c} accessibilityRole="radio" accessibilityState={{ checked: color === c }} onPress={() => setColor(c)} style={[styles.button, { borderColor: color === c ? palette.accent : palette.separator }]}><Text style={{ color: palette.text }}>{colors[c]}</Text></Pressable>)}</View>
    <TextInput accessibilityLabel="Nota do grifo" value={note} onChangeText={setNote} multiline placeholder="Comentário sobre o grifo" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} />
    {button(editing ? "Salvar alterações do grifo" : "Grifar trecho capturado", () => void save(), !editing && !capture)}
    {editing ? button("Cancelar edição do grifo", () => { setEditing(null); setNote(""); }) : null}
    <TextInput accessibilityLabel="Buscar grifos e notas" value={query} onChangeText={setQuery} placeholder="Buscar trecho ou comentário" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} />
    <View style={styles.row}>{(["all", ...Object.keys(colors)] as const).map(c => <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: filter === c }} onPress={() => setFilter(c as HighlightColor | "all")} style={[styles.button, { borderColor: filter === c ? palette.accent : palette.separator }]}><Text style={{ color: palette.text }}>{c === "all" ? "Todas as cores" : colors[c as HighlightColor]}</Text></Pressable>)}</View>
    {visible.map(h => { const location = readHighlightLocation(h); return <View key={h.id} style={[styles.record, { borderColor: palette.separator }]}><Text style={{ color: palette.text, fontWeight: "700" }}>{colors[h.colorLabel]} · {location?.chapterTitle ?? "Localização antiga indisponível"}</Text><Text style={{ color: palette.text }}>{h.highlightedText}</Text><Text style={{ color: palette.text }}>{location?.note}</Text><View style={styles.row}>{location ? button("Ir ao grifo", () => onNavigate(location.anchor)) : null}{location?.anchor.kind === "epub-text" && canUse("flashcards") ? button("Criar flashcard", () => void createFlashcard(h)) : null}{location ? button("Editar grifo", () => { setEditing(h); setColor(h.colorLabel); setNote(location.note); }) : null}{button("Excluir grifo", () => void run(async () => { await appDependencies.highlightRepository.remove(h.id); await onSaved(); if (editing?.id === h.id) { setEditing(null); setNote(""); } }))}</View></View>; })}
    {!visible.length ? <Text style={{ color: palette.secondaryText }}>Nenhum grifo encontrado.</Text> : null}
    <View style={styles.row}>{button("Exportar grifos Markdown", () => void exportData("markdown"))}{button("Exportar grifos texto", () => void exportData("text"))}{button("Exportar grifos JSON", () => void exportData("json"))}</View>
    <TextInput accessibilityLabel="Backup JSON dos grifos" value={backup} onChangeText={v => { setBackup(v); setPreview(null); }} multiline placeholder="Cole o JSON dos grifos deste livro" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator, minHeight: 100 }]} />
    {button("Conferir grifos importados", () => { try { setPreview(parseStudyHighlightsBackup(backup, book)); setError(null); } catch (e) { setPreview(null); setError(e instanceof Error ? e.message : "Backup inválido."); } })}
    {preview ? <><Text style={{ color: palette.text }}>{preview.length} grifos válidos. Identificadores existentes serão preservados.</Text>{button("Importar grifos preservando os existentes", () => void run(async () => {
      const result = await appDependencies.highlightRepository.importPreservingExisting(book.id, preview);
      await onSaved(); setPreview(null); setError(`${result.imported} grifos recuperados; ${result.skipped} existentes foram preservados.`);
    }))}</> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 12, paddingTop: 16 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, button: { borderWidth: 1, borderRadius: 6, minHeight: 44, padding: 10 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 6, padding: 10 }, record: { borderWidth: 1, borderRadius: 6, padding: 12, gap: 8 } });
