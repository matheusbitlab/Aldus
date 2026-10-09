import {
  FLASHCARD_CHOICES,
  FlashcardChoice,
  FlashcardEvaluation,
  FlashcardScoringMode,
} from "../types/flashcards";

export interface ScoringRule {
  correctHigh: number;
  correctLow: number;
  penaltyHigh: number;
  penaltyLow: number;
}

export const FLASHCARD_SCORING_VERSION = 1;
export const FLASHCARD_SCORING_RULE: Readonly<ScoringRule> = Object.freeze({
  correctHigh: 10,
  correctLow: 5,
  penaltyHigh: -10,
  penaltyLow: -5,
});
export const SCORING_RULES: Record<
  FlashcardScoringMode,
  Readonly<ScoringRule>
> = { solo: FLASHCARD_SCORING_RULE, battle: FLASHCARD_SCORING_RULE };
export const FLASHCARD_SCORING_DESCRIPTION =
  "Certeza: +10 no acerto e −10 no erro. Talvez: +5 no acerto e −5 no erro. A pontuação começa em zero e pode ficar negativa.";

/**
 * Avalia o julgamento e o grau de confiança escolhido pelo usuário contra o gabarito.
 *
 * @param isTrue Gabarito oficial da afirmação (true = Verdadeiro, false = Falso).
 * @param choice Escolha do usuário ("XX" | "X" | "CHECK" | "DOUBLE_CHECK").
 * @param mode Modo de sessão; ambos usam a mesma regra versionada.
 */
export function evaluateFlashcardAnswer(
  isTrue: boolean,
  choice: FlashcardChoice,
  mode: FlashcardScoringMode = "solo",
): FlashcardEvaluation {
  const meta = FLASHCARD_CHOICES.find((item) => item.choice === choice);
  if (!meta) {
    throw new Error(`Opção de flashcard desconhecida: "${choice}"`);
  }

  const userJudgment = meta.judgment;
  const isCorrect = userJudgment === isTrue;
  const rule = SCORING_RULES[mode] ?? SCORING_RULES.solo;

  let points: number;
  if (isCorrect) {
    points = meta.confidence === "HIGH" ? rule.correctHigh : rule.correctLow;
  } else {
    points = meta.confidence === "HIGH" ? rule.penaltyHigh : rule.penaltyLow;
  }

  return {
    choice,
    symbol: meta.symbol,
    userJudgment,
    confidence: meta.confidence,
    isCorrect,
    points,
    mode,
  };
}

/**
 * Retorna a cor de feedback de acordo com os critérios de aceitação:
 * O verde representa acerto do usuário e o vermelho representa erro do usuário.
 * Responder corretamente a uma afirmação falsa também recebe verde.
 */
export function getFlashcardFeedbackColor(
  isCorrect: boolean,
  dark = false,
): {
  primary: string;
  background: string;
  text: string;
  statusLabel: string;
} {
  if (isCorrect) {
    return {
      primary: dark ? "#86EFAC" : "#15803D",
      background: "rgba(21, 128, 61, 0.12)",
      text: dark ? "#86EFAC" : "#15803D",
      statusLabel: "Você acertou!",
    };
  }
  return {
    primary: dark ? "#FCA5A5" : "#DC2626",
    background: "rgba(220, 38, 38, 0.12)",
    text: dark ? "#FCA5A5" : "#DC2626",
    statusLabel: "Você errou!",
  };
}
