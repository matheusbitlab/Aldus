import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useAuth,
  useFeatureAccess,
} from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";
import { FeatureDenied } from "@/src/presentation/components/FeatureDenied";
import { flashcardsForUser } from "@/src/data/local/FlashcardRepository";
import {
  Flashcard,
  FlashcardSnapshot,
  isPlayableFlashcard,
} from "@/src/domain/types/flashcards";
import { FlashcardCreateModal } from "@/src/presentation/components/flashcards/FlashcardCreateModal";

export default function Deck() {
  const { allowed } = useFeatureAccess("flashcards");
  return <AuthGuard>{allowed ? <DeckContent /> : <FeatureDenied />}</AuthGuard>;
}
function DeckContent() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { user, canUse } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const repository = useMemo(() => flashcardsForUser(user!.id), [user?.id]);
  const [snapshot, setSnapshot] = useState<FlashcardSnapshot | null>(null),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [card, setCard] = useState<Flashcard | null>(null),
    [name, setName] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void repository
        .load()
        .then((s) => {
          if (active) setSnapshot(s);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
      return () => {
        active = false;
      };
    }, [repository]),
  );
  const deck = snapshot?.decks.find((d) => d.id === deckId),
    cards = snapshot?.cards.filter((c) => c.deckId === deckId) ?? [];
  const button = (label: string, fn: () => void) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={fn}
      style={{
        padding: 14,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: palette.surfaceSecondary,
      }}
    >
      <Text style={{ color: palette.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
  const save = async (value: Flashcard) => {
    if (!canUse("flashcards")) throw new Error("Flashcards indisponíveis.");
    if (card) await repository.updateCard(value);
    else await repository.createCards([value]);
    try {
      setSnapshot(await repository.load());
    } catch {
      setError("Flashcard salvo. Reabra o deck para atualizar a lista.");
    }
  };
  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 12,
        backgroundColor: palette.background,
        gap: 12,
      }}
    >
      {button("Voltar aos decks", () => router.back())}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.text }}>
          {error}
        </Text>
      ) : null}
      {!snapshot && !error ? (
        <ActivityIndicator />
      ) : !deck ? (
        <Text style={{ color: palette.text }}>Deck não encontrado.</Text>
      ) : (
        <>
          <Text
            style={{ color: palette.text, fontSize: 26, fontWeight: "700" }}
          >
            {deck.title}
          </Text>
          <Text style={{ color: palette.secondaryText }}>
            {cards.length} flashcards ·{" "}
            {cards.filter(isPlayableFlashcard).length} completos
          </Text>
          {name !== null ? (
            <View style={{ gap: 8 }}>
              <TextInput
                accessibilityLabel="Nome do deck"
                value={name}
                onChangeText={setName}
                style={{
                  padding: 12,
                  minHeight: 48,
                  color: palette.text,
                  backgroundColor: palette.input,
                }}
              />
              {button("Salvar nome", () => {
                if (!name.trim() || busy) return;
                setBusy(true);
                void repository
                  .updateDeck({
                    ...deck,
                    title: name.trim(),
                    updatedAt: Date.now(),
                  })
                  .then(() => repository.load())
                  .then((s) => {
                    setSnapshot(s);
                    setName(null);
                  })
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              })}
              {button("Cancelar edição do deck", () => setName(null))}
            </View>
          ) : (
            button("Editar deck", () => setName(deck.title))
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {button("Criar flashcard", () => {
              setCard(null);
              setEditing(true);
            })}
            {button("Estudar", () => router.push(`/study/${deck.id}` as never))}
            {button("Usar na batalha", () =>
              router.push({
                pathname: "/battle",
                params: { deckId: deck.id },
              } as never),
            )}
          </View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
            {cards.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => {
                  setCard(c);
                  setEditing(true);
                }}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: palette.card,
                  gap: 6,
                }}
              >
                <Text style={{ color: palette.text, fontWeight: "700" }}>
                  {c.title || "Flashcard sem título"}
                </Text>
                <Text
                  numberOfLines={3}
                  style={{ color: palette.secondaryText }}
                >
                  {c.statement || c.front}
                </Text>
                <Text style={{ color: palette.accent }}>
                  {isPlayableFlashcard(c)
                    ? "Editar flashcard"
                    : "Completar campos e gabarito"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <FlashcardCreateModal
            visible={editing}
            decks={snapshot!.decks}
            initialDeckId={deck.id}
            initialCard={card}
            onClose={() => setEditing(false)}
            onSave={save}
            palette={palette}
          />
        </>
      )}
    </View>
  );
}
