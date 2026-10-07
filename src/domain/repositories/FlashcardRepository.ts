import { Flashcard, FlashcardDeck, FlashcardReviewEvent, FlashcardReviewResult, FlashcardSnapshot } from "@/src/domain/types/flashcards";

export interface FlashcardRepository {
  load(): Promise<FlashcardSnapshot>;
  save(snapshot: FlashcardSnapshot): Promise<void>;
  createDeck(deck: FlashcardDeck): Promise<void>;
  updateDeck(deck: FlashcardDeck): Promise<void>;
  removeDeck(deckId: string): Promise<void>;
  createCards(cards: Flashcard[]): Promise<void>;
  updateCard(card: Flashcard): Promise<void>;
  removeCard(cardId: string): Promise<void>;
  recordReview(card: Flashcard, event: FlashcardReviewEvent): Promise<FlashcardReviewResult>;
}
