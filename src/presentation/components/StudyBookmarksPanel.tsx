import { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { StudyAction, StudyDisclosure, StudyQuote } from "@/src/presentation/components/StudyPanelControls";

export function StudyBookmarksPanel({ book, capture, chapterTitle, loading, feedback, onCapture, onNavigate, onClose, highlights, onHighlightsSaved, onSelectText, selectionCaptured = false, onCaptureConsumed }: { book: LibraryBook; capture: ReadingAnchor | null; chapterTitle: string; loading: boolean; feedback: string | null; onCapture: () => void; onNavigate: (anchor: ReadingAnchor) => void; onClose: () => void; highlights?: Highlight[]; onHighlightsSaved?: () => Promise<void>; onSelectText?: () => void; selectionCaptured?: boolean; onCaptureConsumed?: () => void }) {
  const { palette } = useAppTheme(); const insets = useSafeAreaInsets();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]); const [name, setName] = useState(""); const [note, setNote] = useState(""); const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Bookmark | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [backup, setBackup] = useState(""); const [preview, setPreview] = useState<Bookmark[] | null>(null);
  const canHighlight = Boolean(highlights && onHighlightsSaved && onSelectText);
  const [tab, setTab] = useState<"highlights" | "bookmarks">(canHighlight ? "highlights" : "bookmarks");
  const [highlightBusy, setHighlightBusy] = useState(false); const [menu, setMenu] = useState<string | null>(null); const [deleting, setDeleting] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const working = busy || highlightBusy;
  const scroll = useRef<ScrollView>(null);
  const load = async () => setBookmarks(await appDependencies.bookmarkRepository.listByBookId(book.id));
  useEffect(() => { let active = true; setBookmarks([]); appDependencies.bookmarkRepository.listByBookId(book.id).then(values => { if (active) setBookmarks(values); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [book.id]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(null); setMessage(null); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir. Tente novamente."); } finally { setBusy(false); } };
  const button = (label: string, fn: () => void, disabled = false, primary = false) => <StudyAction label={label} onPress={fn} disabled={working || disabled} primary={primary} />;
  const save = () => run(async () => {
    if (name.length > 200 || note.length > 100000) throw new Error("Use um nome de até 200 caracteres e uma nota de até 100 mil caracteres.");
    const old = editing ? readStudyLocation(editing) : null; const anchor = old?.anchor ?? capture;
    if (!anchor) throw new Error("Capture a localização antes de salvar.");
    const bookmark: Bookmark = { id: editing?.id ?? `bookmark-${Date.now()}-${Math.random().toString(36).slice(2)}`, bookId: book.id, chapterId: anchor.kind === "epub-text" ? anchor.chapterId : "",
      cfiPosition: encodeStudyLocation({ format: "kindle-study-bookmark", version: 1, name: name.trim() || (anchor.kind === "pdf-page" ? `Página ${anchor.sourcePage}` : chapterTitle.trim().slice(0, 200) || "Marcador de leitura"), chapterTitle: old?.chapterTitle ?? chapterTitle, anchor }), textPreview: anchor.kind === "epub-text" ? anchor.quote : "", note: note.trim() || null, createdAt: editing?.createdAt ?? Date.now() };
    await appDependencies.bookmarkRepository.save(bookmark); await load(); if (!editing) onCaptureConsumed?.(); setEditing(null); setName(""); setNote(""); setMessage("Marcador salvo.");
  });
  const exportData = (format: "json" | "markdown" | "text") => run(async () => {
    const records = await appDependencies.bookmarkRepository.listByBookId(book.id); const text = exportStudyBookmarks(book, records, format);
    if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([text], { type: format === "json" ? "application/json" : "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `marcadores.${format === "markdown" ? "md" : format === "json" ? "json" : "txt"}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    else await Share.share({ title: "Marcadores e notas", message: text });
    setBackup(text); setPreview(null);
  });
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = bookmarks.filter(b => `${readStudyLocation(b)?.name ?? "Marcador antigo"} ${b.note ?? ""} ${b.textPreview}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized));
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!working) onClose(); }}><View style={[styles.backdrop, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16), backgroundColor: palette.overlay }]}><View style={[styles.panel, { backgroundColor: palette.panel }]}>
    <View style={[styles.header, { borderColor: palette.separator }]}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.heading, { color: palette.text }]}>Marcações</Text><Text numberOfLines={1} style={{ color: palette.secondaryText, fontSize: 13 }}>{book.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar marcações" disabled={working} onPress={onClose} style={styles.close}><Ionicons name="close" size={23} color={palette.text} /></Pressable></View>
    {canHighlight ? <View style={[styles.tabs, { borderColor: palette.separator }]}>{(["highlights", "bookmarks"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value === "highlights" ? "Grifos" : "Marcadores"} accessibilityState={{ selected: tab === value, disabled: working }} disabled={working} onPress={() => setTab(value)} style={[styles.tab, { borderBottomColor: tab === value ? palette.text : "transparent" }]}><Ionicons name={value === "highlights" ? "color-wand-outline" : "bookmark-outline"} size={17} color={tab === value ? palette.text : palette.secondaryText} /><Text style={{ color: tab === value ? palette.text : palette.secondaryText, fontWeight: tab === value ? "700" : "400", fontSize: 14, flexShrink: 1 }}>{value === "highlights" ? "Grifos" : "Marcadores"}</Text></Pressable>)}</View> : null}
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={styles.content}>
    {error ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{error}</Text> : null}
    {feedback ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{feedback}</Text> : null}
    {tab === "highlights" && canHighlight ? <StudyHighlightsPanel book={book} capture={selectionCaptured && capture?.kind === "epub-text" ? capture : null} chapterTitle={chapterTitle} highlights={highlights!} onSaved={onHighlightsSaved!} onSelect={onSelectText!} onNavigate={onNavigate} onCaptureConsumed={onCaptureConsumed} onBusyChange={setHighlightBusy} onCompose={() => scroll.current?.scrollTo({ y: 0, animated: false })} /> : <>
    <Text style={{ color: palette.secondaryText, lineHeight: 21 }}>Guarde sua posição para continuar depois. Adicionar uma nota é opcional.</Text>
    {capture ? capture.kind === "epub-text" ? <StudyQuote text={capture.quote} /> : <Text style={{ color: palette.text, fontWeight: "700" }}>Página {capture.sourcePage}</Text> : null}
    <TextInput accessibilityLabel="Nome do marcador" placeholder="Nome (opcional)" placeholderTextColor={palette.secondaryText} value={name} onChangeText={setName} editable={!working} style={[styles.input, { color: palette.text, borderColor: palette.separator, backgroundColor: palette.input }]} />
    <TextInput accessibilityLabel="Nota do marcador" placeholder="Adicionar uma nota (opcional)" placeholderTextColor={palette.secondaryText} value={note} onChangeText={setNote} editable={!working} multiline style={[styles.input, { color: palette.text, borderColor: palette.separator, backgroundColor: palette.input, minHeight: 76 }]} />
    {button(loading ? "Localizando página…" : busy ? "Salvando…" : editing ? "Salvar alterações" : capture ? "Salvar marcador" : "Usar página atual", () => { if (!editing && !capture) onCapture(); else void save(); }, loading, true)}
    {editing ? button("Cancelar edição", () => { setEditing(null); setName(""); setNote(""); }) : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{message}</Text> : null}
    <Text style={{ color: palette.text, fontSize: 16, fontWeight: "700", marginTop: 8 }}>Seus marcadores{bookmarks.length ? ` · ${bookmarks.length}` : ""}</Text>
    {bookmarks.length ? <TextInput accessibilityLabel="Buscar marcadores e notas" placeholder="Buscar nos seus marcadores" placeholderTextColor={palette.secondaryText} value={query} onChangeText={setQuery} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} /> : null}
    {visible.map(b => { const location = readStudyLocation(b); return <View key={b.id} style={[styles.record, { borderColor: palette.separator }]}><View style={[styles.row, { flexWrap: "nowrap", alignItems: "center" }]}><Ionicons name="bookmark" size={16} color={palette.accent} /><Text style={{ color: palette.text, fontWeight: "700", flex: 1 }}>{location?.name ?? "Marcador salvo"}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Opções do marcador ${location?.name ?? "salvo"}`} disabled={working} onPress={() => { setMenu(menu === b.id ? null : b.id); setDeleting(null); }} style={styles.close}><Ionicons name="ellipsis-horizontal" size={21} color={palette.text} /></Pressable></View><Text style={{ color: palette.secondaryText, fontSize: 12 }}>{location?.anchor.kind === "pdf-page" ? `Página ${location.anchor.sourcePage}` : location?.chapterTitle || "Referência indisponível; sua nota está preservada."}</Text>{b.textPreview ? <Text numberOfLines={3} style={{ color: palette.text, lineHeight: 22 }}>{b.textPreview}</Text> : null}{b.note ? <Text style={{ color: palette.secondaryText, lineHeight: 21 }}>{b.note}</Text> : null}{location ? button("Continuar daqui", () => onNavigate(location.anchor)) : null}
    {menu === b.id ? deleting === b.id ? <><Text style={{ color: palette.text }}>Excluir este marcador e sua nota?</Text><View style={styles.row}>{button("Cancelar exclusão", () => setDeleting(null))}{button("Confirmar exclusão", () => void run(async () => { await appDependencies.bookmarkRepository.remove(b.id); await load(); setMenu(null); setDeleting(null); if (editing?.id === b.id) { setEditing(null); setName(""); setNote(""); } }))}</View></> : <View style={styles.row}>{location ? button("Editar nota", () => { setEditing(b); setName(location.name); setNote(b.note ?? ""); setMenu(null); scroll.current?.scrollTo({ y: 0, animated: false }); }) : null}{button("Excluir marcador", () => setDeleting(b.id))}</View> : null}</View>; })}
    {!visible.length ? <Text style={{ color: palette.secondaryText }}>{bookmarks.length ? "Nenhum marcador corresponde à busca." : "Seus marcadores aparecerão aqui."}</Text> : null}
    <StudyDisclosure title="Exportar e restaurar marcadores">
    <View style={styles.row}>{button("Salvar como texto", () => void exportData("text"))}{button("Salvar como Markdown", () => void exportData("markdown"))}{button("Cópia de segurança", () => void exportData("json"))}</View>
    <StudyDisclosure title="Restaurar uma cópia de segurança">
    <TextInput accessibilityLabel="Backup JSON dos marcadores" placeholder="Cole o JSON deste livro para restaurar" placeholderTextColor={palette.secondaryText} value={backup} onChangeText={v => { setBackup(v); setPreview(null); }} multiline style={[styles.input, { color: palette.text, borderColor: palette.separator, minHeight: 100 }]} />
    {button("Conferir marcadores importados", () => { try { setPreview(parseStudyBookmarksBackup(backup, book)); setError(null); } catch (e) { setPreview(null); setError(e instanceof Error ? e.message : "Backup inválido."); } })}
    {preview ? <><Text style={{ color: palette.text }}>{preview.length} marcadores válidos. Identificadores já existentes serão preservados. Se um registro existir em outro livro, a importação será recusada.</Text>{button("Importar preservando os existentes", () => void run(async () => {
      const result = await appDependencies.bookmarkRepository.importPreservingExisting(book.id, preview);
      await load(); setPreview(null); setError(`${result.imported} marcadores recuperados; ${result.skipped} existentes foram preservados.`);
    }))}</> : null}
    </StudyDisclosure></StudyDisclosure>
    </>}
    </ScrollView><View style={[styles.footer, { borderColor: palette.separator }]}>{button("Voltar à leitura", onClose)}</View></View></View></Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, paddingHorizontal: 12, justifyContent: "center", alignItems: "center" }, panel: { width: "100%", maxWidth: 600, maxHeight: "100%", borderRadius: 20, overflow: "hidden", flexShrink: 1 }, header: { paddingLeft: 20, paddingRight: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1 }, tabs: { flexDirection: "row", paddingHorizontal: 20, gap: 8, borderBottomWidth: 1 }, tab: { flex: 1, minWidth: 0, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", minHeight: 50, borderBottomWidth: 2, paddingHorizontal: 4 }, footer: { padding: 12, borderTopWidth: 1 }, close: { minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }, content: { padding: 20, gap: 12 }, heading: { fontSize: 22, fontWeight: "700" }, input: { borderWidth: 1, borderRadius: 12, minHeight: 46, maxHeight: 180, padding: 12, fontSize: 15, textAlignVertical: "top" }, row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, record: { paddingVertical: 12, gap: 8, borderBottomWidth: 1 } });
