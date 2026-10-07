export type FlashcardDifficulty = "EASY" | "MEDIUM" | "HARD";
export type FlashcardStatus = "draft" | "approved" | "archived";
export type FlashcardSourceKind = "manual" | "book-chapter" | "highlight" | "ai";

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

export interface Flashcard {
  id: string;
  deckId: string;
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

export function newFlashcardSource(overrides: Partial<FlashcardSource> = {}): FlashcardSource {
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
