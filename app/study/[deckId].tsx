import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { flashcardsForUser } from "@/src/data/local/FlashcardRepository";
import { useAuth, useFeatureAccess } from "@/src/presentation/contexts/AuthContext";
import { FeatureDenied } from "@/src/presentation/components/FeatureDenied";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";
import { Flashcard, FlashcardSnapshot } from "@/src/domain/types/flashcards";
import { dueCards } from "@/src/domain/study/flashcardSrs";

export default function FlashcardStudy() {
  const { allowed } = useFeatureAccess("flashcards");
  return <AuthGuard>{allowed ? <FlashcardStudyContent /> : <FeatureDenied />}</AuthGuard>;
}

function FlashcardStudyContent() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { palette } = useAppTheme();
  const { user, canUse } = useAuth();
  const localFlashcards = useMemo(() => flashcardsForUser(user!.id), [user?.id]);
  const [snapshot, setSnapshot] = useState<FlashcardSnapshot | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deck = snapshot?.decks.find(value => value.id === deckId);
  const cards = useMemo(() => dueCards((snapshot?.cards ?? []).filter(card => card.deckId === deckId)), [snapshot, deckId]);
  const card = cards[index];
  useEffect(() => { void localFlashcards.load().then(setSnapshot).catch(failure => setError(failure instanceof Error ? failure.message : "Não foi possível carregar a sessão.")); }, [localFlashcards]);
  const rate = async (rating: 1 | 2 | 3 | 4) => {
    if (!canUse("flashcards")) { setError("Flashcards não estão disponíveis para esta conta."); return; }
    if (!card) return;
    const result = await localFlashcards.recordReview(card, { id: `review-${card.id}-${Date.now()}`, cardId: card.id, rating, reviewedAt: Date.now(), durationMs: 0 });
    setSnapshot(previous => previous ? { ...previous, cards: previous.cards.map(value => value.id === result.card.id ? result.card : value), reviews: [...previous.reviews, result.event] } : previous);
    setRevealed(false); setIndex(0);
  };
  if (!snapshot) return <View style={[styles.center, { backgroundColor: palette.background }]}><ActivityIndicator color={palette.accent} /></View>;
  if (!deck) return <View style={[styles.center, { backgroundColor: palette.background }]}><Text style={{ color: palette.text }}>Baralho não encontrado.</Text></View>;
  if (!card) return <View style={[styles.center, { backgroundColor: palette.background, padding: 24 }]}><Ionicons name="checkmark-circle-outline" size={48} color={palette.accent} /><Text style={[styles.doneTitle, { color: palette.text }]}>Nenhuma revisão vencida</Text><Text style={{ color: palette.secondaryText, textAlign: "center" }}>Os cartões aprovados continuam salvos localmente e voltarão quando vencerem.</Text><Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: palette.accent }]}><Text style={{ color: "#fff", fontWeight: "700" }}>Voltar ao estudo</Text></Pressable></View>;
  return <View style={[styles.screen, { backgroundColor: palette.background }]}><View style={styles.top}><Pressable onPress={() => router.back()}><Ionicons name="close" size={24} color={palette.text} /></Pressable><Text style={{ color: palette.text, fontWeight: "700" }}>{index + 1} / {cards.length}</Text><Text style={{ color: palette.secondaryText }}>{deck.title}</Text></View><View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.separator }]}><Text style={[styles.label, { color: palette.accent }]}>{revealed ? "RESPOSTA" : "PERGUNTA"}</Text><Text style={[styles.content, { color: palette.text }]}>{revealed ? card.back : card.front}</Text>{card.source.quote ? <Text style={{ color: palette.secondaryText, fontSize: 12, marginTop: 18 }}>Origem: {card.source.chapterTitle ?? "livro"}</Text> : null}<Pressable onPress={() => setRevealed(value => !value)} style={[styles.button, { backgroundColor: palette.accent }]}><Text style={{ color: "#fff", fontWeight: "700" }}>{revealed ? "Ocultar resposta" : "Revelar resposta"}</Text></Pressable></View>{revealed ? <View style={styles.ratings}>{([1, 2, 3, 4] as const).map((rating, ratingIndex) => <Pressable key={rating} onPress={() => void rate(rating)} style={[styles.rating, { backgroundColor: ["#C2410C", "#B7791F", "#15803D", "#0E7490"][ratingIndex] }]}><Text style={{ color: "#fff", fontWeight: "700" }}>{["Errei", "Difícil", "Bom", "Fácil"][ratingIndex]}</Text></Pressable>)}</View> : null}{error ? <Text style={{ color: palette.accent }}>{error}</Text> : null}</View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: 16, gap: 16 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, card: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 20, justifyContent: "center" }, label: { fontSize: 11, fontWeight: "800", letterSpacing: 1.3, marginBottom: 16 }, content: { fontSize: 22, lineHeight: 31, fontWeight: "600" }, button: { minHeight: 44, borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginTop: 22 }, ratings: { flexDirection: "row", gap: 7 }, rating: { flex: 1, minHeight: 45, borderRadius: 8, alignItems: "center", justifyContent: "center" }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, doneTitle: { fontSize: 21, fontWeight: "700" } });
