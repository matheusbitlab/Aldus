import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { flashcardsForUser } from "@/src/data/local/FlashcardRepository";
import {
  FlashcardSnapshot,
  FlashcardStudySession,
  isPlayableFlashcard,
} from "@/src/domain/types/flashcards";
import { FLASHCARD_SCORING_DESCRIPTION } from "@/src/domain/study/flashcardScoring";
import { FlashcardSessionView } from "@/src/presentation/components/flashcards/FlashcardSessionView";

export function FlashcardStudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { user, canUse } = useAuth();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const repository = useMemo(() => flashcardsForUser(user!.id), [user?.id]);
  const [snapshot, setSnapshot] = useState<FlashcardSnapshot | null>(null),
    [session, setSession] = useState<FlashcardStudySession | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
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
  }, [repository, deckId]);
  const operate = async (job: () => Promise<FlashcardStudySession>) => {
    if (locked.current) return;
    if (!canUse("flashcards")) {
      setError("Flashcards indisponíveis para esta conta.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      setSession(await job());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Sua resposta não foi perdida; tente novamente.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const button = (label: string, fn: () => void) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={fn}
      style={{
        padding: 16,
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: palette.surfaceSecondary,
      }}
    >
      <Text style={{ color: palette.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
  const deck = snapshot?.decks.find((d) => d.id === deckId),
    saved = snapshot?.sessions?.find((s) => s.deckId === deckId);
  const card = session?.cards[session.index];
  const answer = session?.answers.find((a) => a.cardId === card?.id) ?? null;
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {button("Voltar", () => router.back())}
        <Text
          style={{
            color: palette.text,
            fontSize: 19,
            fontWeight: "700",
            flex: 1,
          }}
        >
          {deck?.title ?? "Estudo"}
        </Text>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.text }}>
          {error}
        </Text>
      ) : null}
      {!snapshot && !error ? (
        <ActivityIndicator color={palette.accent} />
      ) : !session ? (
        <ScrollView contentContainerStyle={{ gap: 16 }}>
          <Text
            style={{ color: palette.text, fontSize: 23, fontWeight: "700" }}
          >
            Estudar flashcards
          </Text>
          <Text style={{ color: palette.secondaryText, lineHeight: 23 }}>
            {FLASHCARD_SCORING_DESCRIPTION}
          </Text>
          <Text style={{ color: palette.secondaryText }}>
            {snapshot?.cards.filter(
              (c) => c.deckId === deckId && isPlayableFlashcard(c),
            ).length ?? 0}{" "}
            flashcards completos. A explicação aparece após responder. Você
            decide quando avançar.
          </Text>
          {deck ? (
            button(
              saved
                ? saved.completed
                  ? "Ver último resumo"
                  : "Retomar sessão"
                : "Iniciar estudo",
              () => void operate(() => repository.studySession(deckId)),
            )
          ) : (
            <Text style={{ color: palette.text }}>Deck não encontrado.</Text>
          )}
          {saved
            ? button(
                "Iniciar nova sessão",
                () => void operate(() => repository.studySession(deckId, true)),
              )
            : null}
        </ScrollView>
      ) : session.completed ? (
        <ScrollView contentContainerStyle={{ gap: 16 }}>
          <Text
            style={{ color: palette.text, fontSize: 26, fontWeight: "700" }}
          >
            Sessão concluída
          </Text>
          <Text style={{ color: palette.text, fontSize: 22 }}>
            {session.score} pontos
          </Text>
          <Text style={{ color: palette.secondaryText }}>
            {session.answers.length} respostas ·{" "}
            {session.answers.filter((a) => a.isCorrect).length} acertos ·{" "}
            {session.answers.filter((a) => !a.isCorrect).length} erros
          </Text>
          {session.answers.map((a) => (
            <View
              key={a.cardId}
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: palette.card,
                gap: 8,
              }}
            >
              <Text style={{ color: palette.text, fontWeight: "700" }}>
                {session.cards.find((c) => c.id === a.cardId)?.title}
              </Text>
              <Text style={{ color: palette.text }}>
                {a.symbol} · {a.isCorrect ? "Acerto" : "Erro"} ·{" "}
                {a.points > 0 ? "+" : ""}
                {a.points} pontos
              </Text>
              <Text style={{ color: palette.secondaryText }}>
                {session.cards.find((c) => c.id === a.cardId)?.explanation}
              </Text>
            </View>
          ))}
          {button(
            "Estudar novamente",
            () => void operate(() => repository.studySession(deckId, true)),
          )}
        </ScrollView>
      ) : card ? (
        <FlashcardSessionView
          card={card}
          answer={answer}
          index={session.index + 1}
          total={session.cards.length}
          score={session.score}
          busy={busy}
          palette={palette}
          onAnswer={(choice) =>
            void operate(() =>
              repository.answerStudy(session.id, card.id, choice),
            )
          }
          onNext={() =>
            void operate(() => repository.advanceStudy(session.id, card.id))
          }
        />
      ) : null}
    </View>
  );
}
