import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { useLibrary } from "@/src/presentation/hooks/useLibrary";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { createFlashcardDeckId, flashcardsForUser } from "@/src/data/local/FlashcardRepository";
import { useAuth, useFeatureAccess } from "@/src/presentation/contexts/AuthContext";
import { FeatureDenied } from "@/src/presentation/components/FeatureDenied";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";
import { generateLocalFlashcardCandidates } from "@/src/domain/study/flashcardGeneration";
import { FlashcardDeck, FlashcardGenerationCandidate, FlashcardSnapshot } from "@/src/domain/types/flashcards";

export default function Study() {
  const { allowed } = useFeatureAccess("flashcards");
  return <AuthGuard>{allowed ? <StudyContent /> : <FeatureDenied />}</AuthGuard>;
}

function StudyContent() {
  const { palette } = useAppTheme();
  const { user, canUse } = useAuth();
  const localFlashcards = useMemo(() => flashcardsForUser(user!.id), [user?.id]);
  const { books } = useLibrary();
  const [snapshot, setSnapshot] = useState<FlashcardSnapshot | null>(null);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [modal, setModal] = useState<"deck" | "generate" | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Leitura");
  const [maxCards, setMaxCards] = useState("8");
  const [candidates, setCandidates] = useState<FlashcardGenerationCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => setSnapshot(await localFlashcards.load());
  useEffect(() => { void reload().catch(failure => setError(failure instanceof Error ? failure.message : "Não foi possível carregar o estudo.")); }, [localFlashcards]);
  useEffect(() => { if (!selectedBookId && books[0]) setSelectedBookId(books[0].id); }, [books, selectedBookId]);
  const cardCount = useMemo(() => new Map((snapshot?.decks ?? []).map(deck => [deck.id, (snapshot?.cards ?? []).filter(card => card.deckId === deck.id).length])), [snapshot]);

  const createDeck = async () => {
    if (!canUse("flashcards")) { setError("Flashcards não estão disponíveis para esta conta."); return; }
    if (!title.trim()) return;
    setBusy(true); setError(null);
    try {
      const now = Date.now();
      await localFlashcards.createDeck({ id: createFlashcardDeckId(), title: title.trim(), description: "Baralho local do Kindle Reader", category: category.trim() || "Leitura", bookIds: [], isGenerated: false, createdAt: now, updatedAt: now });
      setTitle(""); setModal(null); await reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível criar o baralho."); }
    finally { setBusy(false); }
  };

  const generate = async () => {
    if (!canUse("flashcards")) { setError("Flashcards não estão disponíveis para esta conta."); return; }
    const book = books.find(value => value.id === selectedBookId);
    if (!book) { setError("Escolha um livro importado para gerar cartões."); return; }
    setBusy(true); setError(null);
    try {
      const opened = await appDependencies.openBook.execute(book.id);
      if (!opened || !opened.chapters.length) throw new Error("Este livro ainda não tem capítulos extraídos.");
      const generated = generateLocalFlashcardCandidates(opened.chapters, { bookId: book.id, maxCards: Math.max(1, Math.min(30, Number(maxCards) || 8)) });
      if (!generated.length) throw new Error("Não encontrei trechos suficientemente longos para uma prévia.");
      setCandidates(generated); setModal(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível gerar a prévia."); }
    finally { setBusy(false); }
  };

  const approveCandidates = async () => {
    if (!canUse("flashcards")) { setError("Flashcards não estão disponíveis para esta conta."); return; }
    const book = books.find(value => value.id === selectedBookId);
    if (!book || !candidates.length) return;
    setBusy(true);
    try {
      const now = Date.now(); const deck: FlashcardDeck = { id: createFlashcardDeckId(), title: title.trim() || `Estudo: ${book.title}`, description: "Prévia local baseada no texto extraído do livro", category: category.trim() || "Leitura", bookIds: [book.id], isGenerated: true, createdAt: now, updatedAt: now };
      await localFlashcards.createDeck(deck);
      await localFlashcards.createCards(candidates.map((candidate, index) => ({ id: `card-${now}-${index}-${Math.random().toString(36).slice(2, 6)}`, deckId: deck.id, front: candidate.front, back: candidate.back, difficulty: candidate.difficulty, tags: [book.title], status: "approved" as const, interval: 1, repetition: 0, easeFactor: 2.5, dueAt: now, source: candidate.source, createdAt: now, updatedAt: now })));
      setCandidates([]); setTitle(""); await reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível salvar os cartões."); }
    finally { setBusy(false); }
  };

  return <View style={[styles.screen, { backgroundColor: palette.background }]}>
    <View style={styles.header}><View><Text style={[styles.title, { color: palette.text }]}>Estudo</Text><Text style={{ color: palette.secondaryText }}>Cartões locais vinculados aos seus livros</Text></View><Ionicons name="school-outline" size={27} color={palette.accent} /></View>
    <View style={styles.actions}><Action label="Novo baralho" icon="add-circle-outline" onPress={() => setModal("deck")} palette={palette} /><Action label="Gerar do livro" icon="sparkles-outline" onPress={() => setModal("generate")} palette={palette} /></View>
    {error ? <Text accessibilityRole="alert" style={{ color: palette.accent, marginBottom: 10 }}>{error}</Text> : null}
    {candidates.length ? <View style={[styles.preview, { backgroundColor: palette.panel, borderColor: palette.separator }]}><Text style={[styles.sectionTitle, { color: palette.text }]}>Prévia para aprovação ({candidates.length})</Text><Text style={{ color: palette.secondaryText, marginBottom: 8 }}>Geração local determinística; nenhuma IA ou rede foi acionada.</Text><ScrollView style={{ maxHeight: 260 }}>{candidates.map((candidate, index) => <View key={index} style={[styles.candidate, { borderColor: palette.separator }]}><Text style={{ color: palette.text, fontWeight: "700" }}>{candidate.front}</Text><Text style={{ color: palette.secondaryText, marginTop: 4 }}>{candidate.back}</Text><Text style={{ color: palette.accent, fontSize: 11, marginTop: 5 }}>{candidate.source.chapterTitle}</Text></View>)}</ScrollView><View style={styles.actions}><Action label="Descartar" icon="close-outline" onPress={() => setCandidates([])} palette={palette} /><Action label="Aprovar cartões" icon="checkmark-circle-outline" onPress={() => void approveCandidates()} palette={palette} /></View></View> : null}
    {!snapshot ? <ActivityIndicator color={palette.accent} /> : <ScrollView contentContainerStyle={styles.list}>{snapshot.decks.length ? snapshot.decks.map(deck => <Pressable key={deck.id} onPress={() => router.push(`/study/${deck.id}` as never)} style={[styles.deck, { backgroundColor: palette.panel, borderColor: palette.separator }]}><View style={[styles.deckIcon, { backgroundColor: palette.surfaceSecondary }]}><Ionicons name={deck.isGenerated ? "sparkles-outline" : "albums-outline"} size={21} color={palette.accent} /></View><View style={{ flex: 1 }}><Text style={[styles.deckTitle, { color: palette.text }]}>{deck.title}</Text><Text style={{ color: palette.secondaryText }}>{cardCount.get(deck.id) ?? 0} cartões · {deck.category}</Text>{deck.bookIds.length ? <Text numberOfLines={1} style={{ color: palette.secondaryText, fontSize: 12 }}>Origem: {books.find(book => book.id === deck.bookIds[0])?.title ?? "livro indisponível"}</Text> : null}</View><Ionicons name="chevron-forward" size={18} color={palette.secondaryText} /></Pressable>) : <View style={styles.empty}><Text style={[styles.sectionTitle, { color: palette.text }]}>Nenhum baralho local ainda</Text><Text style={{ color: palette.secondaryText, textAlign: "center" }}>Crie um baralho ou gere uma prévia a partir de um livro importado.</Text></View>}</ScrollView>}
    <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => setModal(null)}><View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: palette.panel, borderColor: palette.separator }]}><Text style={[styles.sectionTitle, { color: palette.text }]}>{modal === "generate" ? "Gerar cartões do livro" : "Novo baralho"}</Text>{modal === "generate" ? <><Text style={{ color: palette.secondaryText, marginBottom: 6 }}>Livro</Text><ScrollView horizontal contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 12 }}>{books.map(book => <Pressable key={book.id} onPress={() => setSelectedBookId(book.id)} style={[styles.chip, { borderColor: selectedBookId === book.id ? palette.accent : palette.separator }]}><Text numberOfLines={1} style={{ color: palette.text, maxWidth: 170 }}>{book.title}</Text></Pressable>)}</ScrollView><Text style={{ color: palette.secondaryText }}>Quantidade máxima</Text><TextInput accessibilityLabel="Quantidade máxima" value={maxCards} onChangeText={setMaxCards} keyboardType="number-pad" style={[styles.input, { color: palette.text, borderColor: palette.separator }]} /></> : null}<TextInput accessibilityLabel="Nome do baralho" value={title} onChangeText={setTitle} placeholder={modal === "generate" ? "Nome opcional do baralho" : "Nome do baralho"} placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} /><TextInput accessibilityLabel="Categoria do baralho" value={category} onChangeText={setCategory} placeholder="Categoria" placeholderTextColor={palette.secondaryText} style={[styles.input, { color: palette.text, borderColor: palette.separator }]} /><View style={styles.actions}><Action label="Cancelar" icon="close-outline" onPress={() => setModal(null)} palette={palette} /><Action label={busy ? "Aguarde" : modal === "generate" ? "Gerar prévia" : "Criar"} icon="checkmark-outline" onPress={() => void (modal === "generate" ? generate() : createDeck())} palette={palette} /></View></View></View></Modal>
  </View>;
}

function Action({ label, icon, onPress, palette }: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void; palette: ReturnType<typeof useAppTheme>["palette"] }) { return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.action, { backgroundColor: palette.surfaceSecondary, borderColor: palette.separator }]}><Ionicons name={icon} size={17} color={palette.accent} /><Text style={{ color: palette.text, fontWeight: "600" }}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ screen: { flex: 1, paddingHorizontal: 16, paddingTop: 18 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }, title: { fontSize: 27, fontWeight: "700" }, actions: { flexDirection: "row", gap: 8, marginBottom: 14 }, action: { flex: 1, minHeight: 42, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, list: { gap: 10, paddingBottom: 30 }, deck: { minHeight: 78, borderWidth: 1, borderRadius: 10, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 }, deckIcon: { width: 42, height: 42, borderRadius: 9, justifyContent: "center", alignItems: "center" }, deckTitle: { fontSize: 16, fontWeight: "700", marginBottom: 3 }, empty: { alignItems: "center", padding: 32, gap: 8 }, sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 5 }, preview: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 }, candidate: { borderBottomWidth: 1, paddingVertical: 9 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.55)", justifyContent: "center", padding: 18 }, modal: { borderWidth: 1, borderRadius: 12, padding: 16 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, marginTop: 10 }, chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 } });
