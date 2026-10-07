import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashcardRepository } from "@/src/domain/repositories/FlashcardRepository";
import { Flashcard, FlashcardDeck, FlashcardReviewEvent, FlashcardReviewResult, FlashcardSnapshot } from "@/src/domain/types/flashcards";
import { computeFlashcardSrs } from "@/src/domain/study/flashcardSrs";

export const FLASHCARD_STORAGE_KEY = "@kindle/flashcards.v1";
const emptySnapshot = (): FlashcardSnapshot => ({ version: 1, decks: [], cards: [], reviews: [] });
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class LocalFlashcardRepository implements FlashcardRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage = AsyncStorage, private readonly storageKey = FLASHCARD_STORAGE_KEY) {}
  private async readSnapshot(): Promise<FlashcardSnapshot> {
    const raw = await this.storage.getItem(this.storageKey);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as FlashcardSnapshot;
    if (parsed.version !== 1 || !Array.isArray(parsed.decks) || !Array.isArray(parsed.cards) || !Array.isArray(parsed.reviews)) throw new Error("Dados de estudo inválidos.");
    return parsed;
  }
  async load(): Promise<FlashcardSnapshot> {
    await this.queue.catch(() => undefined);
    return this.readSnapshot();
  }
  async save(snapshot: FlashcardSnapshot): Promise<void> {
    const job = this.queue.catch(() => undefined).then(() => this.storage.setItem(this.storageKey, JSON.stringify(snapshot)));
    this.queue = job;
    await job;
  }
  private async mutate(mutator: (snapshot: FlashcardSnapshot) => void): Promise<void> {
    const job = this.queue.catch(() => undefined).then(async () => {
      const snapshot = await this.readSnapshot();
      mutator(snapshot);
      await this.storage.setItem(this.storageKey, JSON.stringify(snapshot));
    });
    this.queue = job;
    await job;
  }
  async createDeck(deck: FlashcardDeck) { await this.mutate(snapshot => { snapshot.decks = [deck, ...snapshot.decks]; }); }
  async updateDeck(deck: FlashcardDeck) { await this.mutate(snapshot => { snapshot.decks = snapshot.decks.map(value => value.id === deck.id ? deck : value); }); }
  async removeDeck(deckId: string) { await this.mutate(snapshot => { snapshot.decks = snapshot.decks.filter(deck => deck.id !== deckId); snapshot.cards = snapshot.cards.filter(card => card.deckId !== deckId); }); }
  async createCards(cards: Flashcard[]) { await this.mutate(snapshot => { const ids = new Set(snapshot.cards.map(card => card.id)); snapshot.cards.push(...cards.filter(card => !ids.has(card.id))); }); }
  async updateCard(card: Flashcard) { await this.mutate(snapshot => { snapshot.cards = snapshot.cards.map(value => value.id === card.id ? card : value); }); }
  async removeCard(cardId: string) { await this.mutate(snapshot => { snapshot.cards = snapshot.cards.filter(card => card.id !== cardId); }); }
  async recordReview(card: Flashcard, event: FlashcardReviewEvent): Promise<FlashcardReviewResult> {
    let result: FlashcardReviewResult | null = null;
    await this.mutate(snapshot => {
      const previousEvent = snapshot.reviews.find(value => value.id === event.id);
      const current = snapshot.cards.find(value => value.id === card.id) ?? card;
      if (previousEvent) { result = { card: current, event: previousEvent }; return; }
      const updated: Flashcard = { ...current, ...computeFlashcardSrs(event.rating, current.interval, current.repetition, current.easeFactor, event.reviewedAt), updatedAt: event.reviewedAt };
      snapshot.cards = snapshot.cards.map(value => value.id === card.id ? updated : value);
      snapshot.reviews.push(event);
      result = { card: updated, event };
    });
    return result!;
  }
}

export const localFlashcards = new LocalFlashcardRepository();
const accountRepositories = new Map<string, LocalFlashcardRepository>();
export function flashcardsForUser(userId: string): LocalFlashcardRepository {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Conta inválida para o estudo local.");
  let repository = accountRepositories.get(userId);
  if (!repository) {
    repository = new LocalFlashcardRepository(AsyncStorage, `${FLASHCARD_STORAGE_KEY}:${userId}`);
    accountRepositories.set(userId, repository);
  }
  return repository;
}
export function createFlashcardId() { return id("card"); }
export function createFlashcardDeckId() { return id("deck"); }
