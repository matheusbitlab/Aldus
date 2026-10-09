import {
  Flashcard,
  FlashcardChoice,
  FlashcardDeck,
  FlashcardReviewEvent,
  FlashcardReviewResult,
  FlashcardSnapshot,
  FlashcardStudySession,
} from "@/src/domain/types/flashcards";

export interface FlashcardRepository {
  load(): Promise<FlashcardSnapshot>;
  save(snapshot: FlashcardSnapshot): Promise<void>;
  createDeck(deck: FlashcardDeck): Promise<void>;
  updateDeck(deck: FlashcardDeck): Promise<void>;
  removeDeck(deckId: string): Promise<void>;
  createCards(cards: Flashcard[]): Promise<void>;
  updateCard(card: Flashcard): Promise<void>;
  removeCard(cardId: string): Promise<void>;
  recordReview(
    card: Flashcard,
    event: FlashcardReviewEvent,
  ): Promise<FlashcardReviewResult>;
  studySession(
    deckId: string,
    restart?: boolean,
  ): Promise<FlashcardStudySession>;
  answerStudy(
    sessionId: string,
    cardId: string,
    choice: FlashcardChoice,
  ): Promise<FlashcardStudySession>;
  advanceStudy(
    sessionId: string,
    cardId: string,
  ): Promise<FlashcardStudySession>;
}
