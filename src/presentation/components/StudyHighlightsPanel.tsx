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
import { Ionicons } from "@expo/vector-icons";
import { StudyAction, StudyDisclosure, StudyQuote, studyColorNames as colors, studyColorSwatches } from "@/src/presentation/components/StudyPanelControls";

export function StudyHighlightsPanel({ book, capture, chapterTitle, highlights, onSaved, onSelect, onNavigate, onCaptureConsumed, onBusyChange, onCompose }: { book: LibraryBook; capture: TextReadingAnchor | null; chapterTitle: string; highlights: Highlight[]; onSaved: () => Promise<void>; onSelect: () => void; onNavigate: (anchor: TextReadingAnchor) => void; onCaptureConsumed?: () => void; onBusyChange?: (busy: boolean) => void; onCompose?: () => void }) {
  const { palette } = useAppTheme();
  const { user, canUse } = useAuth();
  const [color, setColor] = useState<HighlightColor>("yellow"); const [filter, setFilter] = useState<HighlightColor | "all">("all");
  const [note, setNote] = useState(""); const [editing, setEditing] = useState<Highlight | null>(null); const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [backup, setBackup] = useState(""); const [preview, setPreview] = useState<Highlight[] | null>(null);
  const [menu, setMenu] = useState<string | null>(null); const [deleting, setDeleting] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const run = async (operation: () => Promise<void>) => { setBusy(true); onBusyChange?.(true); setError(null); setMessage(null); try { await operation(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o grifo."); } finally { setBusy(false); onBusyChange?.(false); } };
  const button = (label: string, press: () => void, disabled = false, primary = false) => <StudyAction label={label} onPress={press} disabled={busy || disabled} primary={primary} />;
  const save = () => run(async () => {
    const old = editing ? readHighlightLocation(editing) : null; const anchor = old?.anchor ?? capture;
    if (!anchor) throw new Error("Selecione ou capture um trecho antes de grifar.");
    if (note.length > 100000) throw new Error("A nota excede 100 mil caracteres.");
    const location: StudyHighlightLocation = { format: "kindle-study-highlight", version: 1, anchor, chapterTitle: old?.chapterTitle ?? chapterTitle, note: note.trim() };
    const encoded = JSON.stringify(location);
    await appDependencies.highlightRepository.save({ id: editing?.id ?? `highlight-${Date.now()}-${Math.random().toString(36).slice(2)}`, bookId: book.id, chapterId: anchor.chapterId, startCfi: encoded, endCfi: encoded, highlightedText: anchor.quote, colorLabel: color, createdAt: editing?.createdAt ?? Date.now() });
    await onSaved(); if (!editing) onCaptureConsumed?.(); setEditing(null); setNote(""); setMessage("Grifo salvo.");
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
      deck = { id: createFlashcardDeckId(), title: `Grifos: ${book.title}`, description: "Flashcards criados a partir dos grifos do livro", category: "Grifos", bookIds: [book.id], isGenerated: false, createdAt: now, updatedAt: now };
      await localFlashcards.createDeck(deck);
    }
    if (snapshot.cards.some(card => card.deckId === deck!.id && card.source.kind === "highlight" && card.source.quote === highlight.highlightedText)) return;
    const highlightStatement = `Afirmação sobre o trecho em ${location.chapterTitle || "este capítulo"}: "${highlight.highlightedText.slice(0, 120)}${highlight.highlightedText.length > 120 ? "..." : ""}" representa fielmente o pensamento do autor.`;
    await localFlashcards.createCards([{
      id: createFlashcardId(),
      deckId: deck.id,
      title: location.chapterTitle || "Grifo do Livro",
      statement: highlightStatement,
      isTrue: true,
      explanation: highlight.highlightedText,
      front: highlightStatement,
      back: highlight.highlightedText,
      difficulty: "MEDIUM",
      tags: [book.title, "grifo"],
      status: "approved",
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      dueAt: now,
      source: { kind: "highlight", bookId: book.id, chapterId: location.anchor.chapterId, chapterTitle: location.chapterTitle, quote: location.anchor.quote, prefix: location.anchor.prefix, suffix: location.anchor.suffix, sourcePage: null },
      createdAt: now,
      updatedAt: now,
    }]);
  });
  const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = highlights.filter(h => (filter === "all" || h.colorLabel === filter) && normalize(`${h.highlightedText} ${readHighlightLocation(h)?.note ?? ""}`).includes(normalize(query)));
  const selected = editing ? readHighlightLocation(editing)?.anchor : capture;
  return <View style={styles.content}>
    {error ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{error}</Text> : null}
    {selected ? <View style={styles.content}>
      <Text style={[styles.label, { color: palette.text }]}>{editing ? "Editar grifo" : "Trecho selecionado"}</Text>
      <StudyQuote text={selected.quote} color={color} />
      <Text style={{ color: palette.secondaryText }}>Cor: {colors[color]}</Text>
      <View style={[styles.row, { gap: 6 }]}>{(Object.keys(colors) as HighlightColor[]).map(c => <Pressable key={c} disabled={busy} accessibilityRole="radio" accessibilityLabel={`Cor do grifo: ${colors[c]}`} accessibilityState={{ checked: color === c, disabled: busy }}
        {...(Platform.OS === "web" ? { "aria-checked": color === c, onKeyDown: (event: { key: string; repeat?: boolean; preventDefault(): void }) => { if (!busy && !event.repeat && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setColor(c); } } } : {})}
        onPress={() => setColor(c)} style={[styles.swatch, { borderColor: color === c ? palette.text : "transparent" }]}><View style={[styles.dot, { backgroundColor: studyColorSwatches[c] }]}>{color === c ? <Ionicons name="checkmark" size={20} color="#203128" /> : null}</View></Pressable>)}</View>
      <TextInput accessibilityLabel="Nota do grifo" value={note} onChangeText={setNote} editable={!busy} multiline placeholder="Adicionar uma nota (opcional)" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator, backgroundColor: palette.input, minHeight: 76 }]} />
      {button(busy ? "Salvando…" : editing ? "Salvar alterações" : "Salvar grifo", () => void save(), false, true)}
      {editing ? button("Cancelar edição", () => { setEditing(null); setNote(""); }) : button("Selecionar outro trecho", onSelect)}
    </View> : <>
      <Text style={{ color: palette.secondaryText, lineHeight: 21 }}>Guarde as palavras que você quer lembrar.</Text>
      <StudyAction label="Grifar um trecho" icon="color-wand-outline" primary disabled={busy} onPress={onSelect} />
      <Text style={{ color: palette.secondaryText, fontSize: 13, lineHeight: 19 }}>Selecione o texto no livro. Depois escolha a cor e, se quiser, adicione uma nota.</Text>
    </>}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{message}</Text> : null}
    <Text style={[styles.label, { color: palette.text, marginTop: 10 }]}>Seus grifos{highlights.length ? ` · ${highlights.length}` : ""}</Text>
    {highlights.length ? <>
      <TextInput accessibilityLabel="Buscar grifos e notas" value={query} onChangeText={setQuery} placeholder="Buscar nos seus grifos" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} />
      <StudyDisclosure title="Filtrar por cor"><View style={styles.row}>{(["all", ...Object.keys(colors)] as const).map(c => <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: filter === c }} onPress={() => setFilter(c as HighlightColor | "all")} style={[styles.filter, { borderColor: filter === c ? palette.text : palette.separator }]}><Text style={{ color: palette.text }}>{c === "all" ? "Todas" : colors[c as HighlightColor]}</Text></Pressable>)}</View></StudyDisclosure>
    </> : null}
    {visible.map((h, index) => { const location = readHighlightLocation(h); return <View key={h.id} style={[styles.record, { borderColor: palette.separator }]}>
      <View style={[styles.row, { alignItems: "center", flexWrap: "nowrap" }]}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: studyColorSwatches[h.colorLabel] }} /><Text style={{ color: palette.secondaryText, fontSize: 12, flex: 1 }}>{location?.chapterTitle || "Trecho salvo"}</Text><Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Opções do grifo ${index + 1}`} accessibilityState={{ expanded: menu === h.id }} onPress={() => { setMenu(menu === h.id ? null : h.id); setDeleting(null); }} style={styles.menu}><Ionicons name="ellipsis-horizontal" size={21} color={palette.text} /></Pressable></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ir ao grifo: ${h.highlightedText.slice(0, 70)}`} disabled={!location || busy} onPress={() => location && onNavigate(location.anchor)}><Text style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>{h.highlightedText}</Text></Pressable>
      {location?.note ? <Text style={{ color: palette.secondaryText, lineHeight: 21 }}>{location.note}</Text> : null}
      {menu === h.id ? <View style={styles.content}>{deleting === h.id ? <><Text style={{ color: palette.text }}>Excluir este grifo e sua nota?</Text><View style={styles.row}>{button("Cancelar exclusão", () => setDeleting(null))}{button("Confirmar exclusão", () => void run(async () => { await appDependencies.highlightRepository.remove(h.id); await onSaved(); setMenu(null); setDeleting(null); if (editing?.id === h.id) { setEditing(null); setNote(""); } }))}</View></> : <View style={styles.row}>{location ? button("Editar grifo", () => { setEditing(h); setColor(h.colorLabel); setNote(location.note); setMenu(null); onCompose?.(); }) : null}{location?.anchor.kind === "epub-text" && canUse("flashcards") ? button("Criar flashcard", () => void createFlashcard(h)) : null}{button("Excluir grifo", () => setDeleting(h.id))}</View>}</View> : null}
    </View>; })}
    {!visible.length ? <Text style={{ color: palette.secondaryText, lineHeight: 21 }}>{highlights.length ? "Nenhum grifo corresponde à busca." : "Seus trechos e notas aparecerão aqui. Toque em “Grifar um trecho” para começar."}</Text> : null}
    <StudyDisclosure title="Exportar e restaurar grifos">
    <Text style={{ color: palette.secondaryText }}>Guarde uma cópia dos seus apontamentos ou recupere uma cópia anterior.</Text>
    <View style={styles.row}>{button("Salvar como texto", () => void exportData("text"))}{button("Salvar como Markdown", () => void exportData("markdown"))}{button("Cópia de segurança", () => void exportData("json"))}</View>
    <StudyDisclosure title="Restaurar uma cópia de segurança">
    <TextInput accessibilityLabel="Backup JSON dos grifos" value={backup} onChangeText={v => { setBackup(v); setPreview(null); }} multiline placeholder="Cole o JSON dos grifos deste livro" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator, minHeight: 100 }]} />
    {button("Conferir grifos importados", () => { try { setPreview(parseStudyHighlightsBackup(backup, book)); setError(null); } catch (e) { setPreview(null); setError(e instanceof Error ? e.message : "Backup inválido."); } })}
    {preview ? <><Text style={{ color: palette.text }}>{preview.length} grifos válidos. Identificadores existentes serão preservados.</Text>{button("Importar grifos preservando os existentes", () => void run(async () => {
      const result = await appDependencies.highlightRepository.importPreservingExisting(book.id, preview);
      await onSaved(); setPreview(null); setError(`${result.imported} grifos recuperados; ${result.skipped} existentes foram preservados.`);
    }))}</> : null}
    </StudyDisclosure></StudyDisclosure>
  </View>;
}
const styles = StyleSheet.create({ content: { gap: 12 }, label: { fontSize: 16, fontWeight: "700" }, row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, swatch: { width: 46, height: 46, borderWidth: 2, borderRadius: 23, alignItems: "center", justifyContent: "center" }, dot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, menu: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }, filter: { borderWidth: 1, borderRadius: 20, minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }, input: { minHeight: 46, maxHeight: 180, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, textAlignVertical: "top" }, record: { borderBottomWidth: 1, paddingVertical: 12, gap: 8 } });
