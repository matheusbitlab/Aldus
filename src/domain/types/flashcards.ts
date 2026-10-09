export type FlashcardDifficulty = "EASY" | "MEDIUM" | "HARD";
export type FlashcardStatus = "draft" | "approved" | "archived";
export type FlashcardSourceKind =
  "manual" | "book-chapter" | "highlight" | "ai";

export interface FlashcardSource {
  kind: FlashcardSourceKind;
  bookId: string | null;
  chapterId: string | null;
  chapterTitle: string | null;
  quote: string | null;
  prefix: string | null;
  suffix: string | null;
  sourcePage: number | null;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  category: string;
  bookIds: string[];
  isGenerated: boolean;
  createdAt: number;
  updatedAt: number;
}

export type FlashcardChoice = "XX" | "X" | "CHECK" | "DOUBLE_CHECK";
export type FlashcardScoringMode = "solo" | "battle";

export interface FlashcardChoiceMeta {
  choice: FlashcardChoice;
  symbol: "XX" | "X" | "✓" | "✓✓";
  label: string;
  judgment: boolean;
  confidence: "HIGH" | "LOW";
}

export const FLASHCARD_CHOICES: FlashcardChoiceMeta[] = [
  {
    choice: "XX",
    symbol: "XX",
    label: "Certeza de que é falso",
    judgment: false,
    confidence: "HIGH",
  },
  {
    choice: "X",
    symbol: "X",
    label: "Talvez seja falso",
    judgment: false,
    confidence: "LOW",
  },
  {
    choice: "CHECK",
    symbol: "✓",
    label: "Talvez esteja correto",
    judgment: true,
    confidence: "LOW",
  },
  {
    choice: "DOUBLE_CHECK",
    symbol: "✓✓",
    label: "Certeza de que está correto",
    judgment: true,
    confidence: "HIGH",
  },
];

export interface Flashcard {
  id: string;
  deckId: string;
  title?: string;
  statement?: string;
  isTrue?: boolean;
  explanation?: string;
  imageUrl?: string | null;
  drawing?: FlashcardDrawing | null;
  front: string;
  back: string;
  difficulty: FlashcardDifficulty;
  tags: string[];
  status: FlashcardStatus;
  interval: number;
  repetition: number;
  easeFactor: number;
  dueAt: number;
  source: FlashcardSource;
  createdAt: number;
  updatedAt: number;
}

export interface FlashcardEvaluation {
  choice: FlashcardChoice;
  symbol: "XX" | "X" | "✓" | "✓✓";
  userJudgment: boolean;
  confidence: "HIGH" | "LOW";
  isCorrect: boolean;
  points: number;
  mode: FlashcardScoringMode;
}

export interface FlashcardAnswerResult extends FlashcardEvaluation {
  cardId: string;
  answeredAt: number;
  durationMs?: number;
}

export interface FlashcardReviewEvent {
  id: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  reviewedAt: number;
  durationMs: number;
}

export interface FlashcardSnapshot {
  version: 1;
  decks: FlashcardDeck[];
  cards: Flashcard[];
  reviews: FlashcardReviewEvent[];
  sessions?: FlashcardStudySession[];
}

export interface FlashcardDrawing {
  width: number;
  height: number;
  strokes: { x: number; y: number }[][];
}

export interface FlashcardStudySession {
  id: string;
  deckId: string;
  cards: Flashcard[];
  index: number;
  answers: FlashcardAnswerResult[];
  score: number;
  completed: boolean;
  scoringVersion: number;
  createdAt: number;
}

export function isPlayableFlashcard(card: Flashcard): boolean {
  return (
    card.status === "approved" &&
    typeof card.isTrue === "boolean" &&
    !!card.title?.trim() &&
    !!flashcardStatement(card) &&
    !!flashcardExplanation(card)
  );
}

export interface FlashcardGenerationOptions {
  bookId: string;
  chapterIds?: string[];
  maxCards: number;
  language?: string;
}

export interface FlashcardGenerationCandidate {
  front: string;
  back: string;
  difficulty: FlashcardDifficulty;
  source: FlashcardSource;
}

export interface FlashcardReviewResult {
  card: Flashcard;
  event: FlashcardReviewEvent;
}

export function newFlashcardSource(
  overrides: Partial<FlashcardSource> = {},
): FlashcardSource {
  return {
    kind: "manual",
    bookId: null,
    chapterId: null,
    chapterTitle: null,
    quote: null,
    prefix: null,
    suffix: null,
    sourcePage: null,
    ...overrides,
  };
}

export function flashcardTitle(card: Flashcard): string {
  if (card.title && card.title.trim()) return card.title.trim();
  if (card.source.chapterTitle) return card.source.chapterTitle;
  return "Flashcard";
}

export function flashcardStatement(card: Flashcard): string {
  if (card.statement && card.statement.trim()) return card.statement.trim();
  return card.front.trim();
}

export function flashcardExplanation(card: Flashcard): string {
  if (card.explanation && card.explanation.trim())
    return card.explanation.trim();
  return card.back.trim();
}

export function flashcardIsTrue(card: Flashcard): boolean {
  if (typeof card.isTrue === "boolean") return card.isTrue;
  throw new Error(
    "Edite este flashcard e selecione o gabarito antes de estudar.",
  );
}
