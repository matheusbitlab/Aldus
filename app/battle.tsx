import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";
import { FeatureDenied } from "@/src/presentation/components/FeatureDenied";
import {
  useAuth,
  useFeatureAccess,
} from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { flashcardsForUser } from "@/src/data/local/FlashcardRepository";
import { flashcardBattles } from "@/src/data/remote/FlashcardBattleRepository";
import {
  BATTLE_COUNTS,
  BattleCount,
  FlashcardBattleState,
} from "@/src/domain/study/flashcardBattle";
import {
  FlashcardSnapshot,
  isPlayableFlashcard,
} from "@/src/domain/types/flashcards";
import { FLASHCARD_SCORING_DESCRIPTION } from "@/src/domain/study/flashcardScoring";
import { FlashcardSessionView } from "@/src/presentation/components/flashcards/FlashcardSessionView";

export default function Battle() {
  const { allowed } = useFeatureAccess("flashcards");
  return (
    <AuthGuard>{allowed ? <BattleContent /> : <FeatureDenied />}</AuthGuard>
  );
}
function BattleContent() {
  const params = useLocalSearchParams<{ deckId?: string }>(),
    { user, canUse } = useAuth(),
    { palette } = useAppTheme(),
    insets = useSafeAreaInsets();
  const repository = useMemo(() => flashcardsForUser(user!.id), [user?.id]);
  const [snapshot, setSnapshot] = useState<FlashcardSnapshot | null>(null),
    [state, setState] = useState<FlashcardBattleState | null>(null),
    [deckId, setDeckId] = useState(params.deckId ?? ""),
    [count, setCount] = useState<BattleCount>(3),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [foreground, setForeground] = useState(AppState.currentState === "active"),
    [focused, setFocused] = useState(false);
  const locked = useRef(false),
    revision = useRef(0),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      revision.current++;
    };
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) =>
      setForeground(s === "active"),
    );
    return () => sub.remove();
  }, []);
  const refresh = useCallback(async () => {
    if (locked.current) return;
    const version = revision.current;
    try {
      const next = await flashcardBattles.get();
      if (mounted.current && version === revision.current) {
        setState(next);
        setError("");
      }
    } catch (e) {
      if (mounted.current && version === revision.current)
        setError(
          e instanceof Error
            ? e.message
            : "Conexão indisponível. Tente reconectar.",
        );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void repository
        .load()
        .then((s) => {
          if (mounted.current) {
            setSnapshot(s);
            setDeckId((id) => id || s.decks[0]?.id || "");
          }
        })
        .catch((e) => setError(e.message));
      void refresh();
      return () => {
        setFocused(false);
        revision.current++;
      };
    }, [repository, refresh]),
  );
  // Request completion schedules the next refresh: no overlapping polling, no background requests.
  useEffect(() => {
    if (
      !focused ||
      !foreground ||
      !state ||
      !["searching", "confirmation", "active", "waiting"].includes(state.status)
    )
      return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (active) timer = setTimeout(() => void poll(), 3000);
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [focused, foreground, state?.status, refresh]);
  const operate = async (job: () => Promise<FlashcardBattleState>) => {
    if (locked.current) return;
    if (!canUse("flashcards")) {
      setError("Flashcards indisponíveis para esta conta.");
      return;
    }
    locked.current = true;
    revision.current++;
    setBusy(true);
    setError("");
    try {
      const next = await job();
      if (mounted.current) setState(next);
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Conexão indisponível. Retome para consultar o resultado aceito.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const button = (label: string, fn: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy || disabled}
      onPress={fn}
      style={{
        minHeight: 48,
        padding: 14,
        borderRadius: 12,
        backgroundColor: palette.surfaceSecondary,
        opacity: busy || disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: palette.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
  const deck = snapshot?.decks.find((d) => d.id === deckId),
    valid =
      snapshot?.cards.filter(
        (c) => c.deckId === deckId && isPlayableFlashcard(c),
      ) ?? [];
  const showingCard =
    state?.card &&
    state.me &&
    state.count &&
    state.me.cursor <= state.count &&
    ["active", "complete"].includes(state.status);
  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 12,
        gap: 12,
        backgroundColor: palette.background,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {button("Voltar", () => router.back())}
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}>
          Batalha
        </Text>
      </View>
      {error ? (
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert" style={{ color: palette.text }}>
            {error}
          </Text>
          {button("Reconectar / consultar partida", () => void refresh())}
        </View>
      ) : null}
      {!state && !error ? (
        <ActivityIndicator color={palette.accent} />
      ) : showingCard ? (
        <>
          <Text style={{ color: palette.secondaryText }}>
            Adversário: {state!.opponent?.name} · {state!.opponent?.answered}/
            {state!.count} respostas
          </Text>
          <FlashcardSessionView
            card={state!.card!}
            answer={state!.answer ?? null}
            index={state!.me!.cursor}
            total={state!.count!}
            score={state!.me!.score}
            busy={busy}
            palette={palette}
            onAnswer={(choice) =>
              void operate(() =>
                flashcardBattles.answer(state!.id!, state!.me!.cursor, choice),
              )
            }
            onNext={() =>
              void operate(() =>
                flashcardBattles.advance(state!.id!, state!.me!.cursor),
              )
            }
          />
        </>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 16 }}>
          {state?.status === "idle" ? (
            <>
              <Text
                style={{ color: palette.text, fontSize: 24, fontWeight: "700" }}
              >
                Escolha seu deck
              </Text>
              <Text style={{ color: palette.secondaryText, lineHeight: 22 }}>
                {FLASHCARD_SCORING_DESCRIPTION}
              </Text>
              <Text style={{ color: palette.secondaryText, lineHeight: 22 }}>
                Cada participante fornece N flashcards do próprio deck e
                responde N do adversário. Sorteio sem repetição, avanço
                independente, sem cronômetro. Maior pontuação vence; pontuações
                iguais empatam.
              </Text>
              {snapshot?.decks.map((d) =>
                button(
                  `${d.id === deckId ? "✓ " : ""}${d.title} · ${snapshot.cards.filter((c) => c.deckId === d.id && isPlayableFlashcard(c)).length} completos`,
                  () => setDeckId(d.id),
                ),
              )}
              <Text style={{ color: palette.text }}>
                Flashcards por participante
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {BATTLE_COUNTS.map((n) => (
                  <View key={n}>
                    {button(`${n === count ? "✓ " : ""}${n}`, () =>
                      setCount(n),
                    )}
                  </View>
                ))}
              </View>
              {valid.length < count ? (
                <Text style={{ color: palette.text }}>
                  Deck insuficiente: {valid.length} completos. Escolha outro
                  deck ou uma quantidade menor.
                </Text>
              ) : null}
              {button(
                busy ? "Buscando…" : "Buscar adversário",
                () => {
                  if (deck)
                    void operate(() =>
                      flashcardBattles.join(deck, snapshot!.cards, count),
                    );
                },
                !deck || valid.length < count,
              )}
            </>
          ) : state?.status === "searching" ? (
            <>
              <ActivityIndicator color={palette.accent} />
              <Text style={{ color: palette.text }}>
                Buscando outro usuário para {state.count} flashcards por
                participante…
              </Text>
              {button(
                "Cancelar busca",
                () => void operate(() => flashcardBattles.cancel()),
              )}
            </>
          ) : state?.status === "confirmation" ? (
            <>
              <Text
                style={{ color: palette.text, fontSize: 24, fontWeight: "700" }}
              >
                Adversário encontrado
              </Text>
              <Text style={{ color: palette.text }}>
                {state.opponent?.name} · {state.count} flashcards por
                participante
              </Text>
              <Text style={{ color: palette.secondaryText }}>
                {FLASHCARD_SCORING_DESCRIPTION}
              </Text>
              <Text style={{ color: palette.text }}>
                Seu deck: {state.me?.deckTitle}
                {"\n"}Deck do adversário: {state.opponent?.deckTitle}
              </Text>
              <Text style={{ color: palette.secondaryText }}>
                Os dois participantes precisam confirmar. O conteúdo é congelado
                ao iniciar.
              </Text>
              <Text style={{ color: palette.text }}>
                Você:{" "}
                {state.me?.confirmed ? "confirmado" : "aguardando confirmação"}{" "}
                · Adversário:{" "}
                {state.opponent?.confirmed
                  ? "confirmado"
                  : "aguardando confirmação"}
              </Text>
              {button(
                "Confirmar participação",
                () => void operate(() => flashcardBattles.confirm(state.id!)),
                state.me?.confirmed,
              )}
              {button(
                "Cancelar configuração",
                () => void operate(() => flashcardBattles.cancel()),
              )}
            </>
          ) : state?.status === "waiting" ? (
            <>
              <Text
                style={{ color: palette.text, fontSize: 24, fontWeight: "700" }}
              >
                Você terminou
              </Text>
              <Text style={{ color: palette.text }}>
                {state.me?.score} pontos · Aguardando {state.opponent?.name}:{" "}
                {state.opponent?.answered}/{state.count} respostas.
              </Text>
              <Text style={{ color: palette.secondaryText }}>
                Pode sair e retomar depois. Uma desconexão não causa derrota.
              </Text>
              {button("Consultar resultado", () => void refresh())}
            </>
          ) : state?.status === "complete" ? (
            <>
              <Text
                style={{ color: palette.text, fontSize: 26, fontWeight: "700" }}
              >
                {state.winner === null
                  ? "Empate"
                  : state.winner === user!.id
                    ? "Você venceu"
                    : "Vitória do adversário"}
              </Text>
              {[state.me, state.opponent].map((p) =>
                p ? (
                  <View
                    key={p.id}
                    style={{
                      padding: 16,
                      backgroundColor: palette.card,
                      borderRadius: 14,
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: palette.text, fontWeight: "700" }}>
                      {p.name} · {p.score} pontos
                    </Text>
                    <Text style={{ color: palette.secondaryText }}>
                      {p.correct} acertos · {p.answered - p.correct} erros
                    </Text>
                  </View>
                ) : null,
              )}
              <Text style={{ color: palette.secondaryText }}>
                Os gabaritos são cadastrados pelos autores; a validação compara
                respostas com esses gabaritos.
              </Text>
              {state.history?.map((r, i) => (
                <View
                  key={i}
                  style={{
                    padding: 16,
                    backgroundColor: palette.card,
                    borderRadius: 14,
                    gap: 8,
                  }}
                >
                  <Text style={{ color: palette.text, fontWeight: "700" }}>
                    {r.card.title}
                  </Text>
                  <Text style={{ color: palette.text }}>
                    {r.answer.symbol} · {r.answer.isCorrect ? "Acerto" : "Erro"}{" "}
                    · {r.answer.points} pontos
                  </Text>
                  <Text style={{ color: palette.secondaryText }}>
                    Gabarito: {r.card.isTrue ? "Verdadeiro" : "Falso"}
                    {"\n"}
                    {r.card.explanation}
                  </Text>
                </View>
              ))}
              {button(
                "Configurar nova batalha",
                () => void operate(() => flashcardBattles.leave()),
              )}
            </>
          ) : state?.status === "cancelled" ? (
            <>
              <Text style={{ color: palette.text }}>
                Configuração cancelada. Não houve derrota ou transferência de
                flashcards.
              </Text>
              {button(
                "Escolher nova configuração",
                () => void operate(() => flashcardBattles.leave()),
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
