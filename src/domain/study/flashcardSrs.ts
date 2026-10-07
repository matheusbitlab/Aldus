import { Flashcard, FlashcardDifficulty } from "@/src/domain/types/flashcards";

export interface FlashcardSrsUpdate {
  interval: number;
  repetition: number;
  easeFactor: number;
  dueAt: number;
}

/** SM-2 adapted to the donor project's 1..4 UI ratings. */
export function computeFlashcardSrs(
  rating: 1 | 2 | 3 | 4,
  currentInterval: number,
  currentRepetition: number,
  currentEaseFactor: number,
  now = Date.now(),
): FlashcardSrsUpdate {
  const quality = rating === 1 ? 1 : rating === 2 ? 2 : rating === 3 ? 4 : 5;
  const qDiff = 5 - quality;
  const easeFactor = Math.max(1.3, Number((currentEaseFactor + 0.1 - qDiff * (0.08 + qDiff * 0.02)).toFixed(3)));
  let interval: number;
  let repetition: number;
  if (quality < 3) {
    interval = 1;
    repetition = 0;
  } else if (currentRepetition === 0) {
    interval = 1;
    repetition = 1;
  } else if (currentRepetition === 1) {
    interval = 6;
    repetition = 2;
  } else {
    interval = Math.max(1, Math.round(currentInterval * easeFactor));
    repetition = currentRepetition + 1;
  }
  return { interval, repetition, easeFactor, dueAt: now + interval * 86_400_000 };
}

export function difficultyForIndex(index: number): FlashcardDifficulty {
  return index % 3 === 0 ? "EASY" : index % 3 === 1 ? "MEDIUM" : "HARD";
}

export function dueCards(cards: Flashcard[], now = Date.now()): Flashcard[] {
  return cards.filter(card => card.status === "approved" && card.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt);
}
