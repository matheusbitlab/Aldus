import { flashcardStorage } from "./flashcardStorage";
import { FlashcardRepository } from "@/src/domain/repositories/FlashcardRepository";
import {
  Flashcard,
  FlashcardChoice,
  FlashcardDeck,
  FlashcardReviewEvent,
  FlashcardReviewResult,
  FlashcardSnapshot,
  FlashcardStudySession,
  isPlayableFlashcard,
} from "@/src/domain/types/flashcards";
import { computeFlashcardSrs } from "@/src/domain/study/flashcardSrs";
import {
  evaluateFlashcardAnswer,
  FLASHCARD_SCORING_VERSION,
} from "@/src/domain/study/flashcardScoring";

export const FLASHCARD_STORAGE_KEY = "@kindle/flashcards.v1";
const emptySnapshot = (): FlashcardSnapshot => ({
  version: 1,
  decks: [],
  cards: [],
  reviews: [],
});
const id = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class LocalFlashcardRepository implements FlashcardRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly storage = flashcardStorage,
    private readonly storageKey = FLASHCARD_STORAGE_KEY,
  ) {}
  private async readSnapshot(): Promise<FlashcardSnapshot> {
    const raw = await this.storage.getItem(this.storageKey);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as FlashcardSnapshot;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.decks) ||
      !Array.isArray(parsed.cards) ||
      !Array.isArray(parsed.reviews) ||
      (parsed.sessions !== undefined && !Array.isArray(parsed.sessions))
    )
      throw new Error("Dados de estudo inválidos.");
    return parsed;
  }
  async load(): Promise<FlashcardSnapshot> {
    await this.queue.catch(() => undefined);
    return this.readSnapshot();
  }
  async save(snapshot: FlashcardSnapshot): Promise<void> {
    const job = this.queue
      .catch(() => undefined)
      .then(() =>
        this.storage.setItem(this.storageKey, JSON.stringify(snapshot)),
      );
    this.queue = job;
    await job;
  }
  private async mutate(
    mutator: (snapshot: FlashcardSnapshot) => void,
  ): Promise<void> {
    const job = this.queue
      .catch(() => undefined)
      .then(async () => {
        const snapshot = await this.readSnapshot();
        mutator(snapshot);
        await this.storage.setItem(this.storageKey, JSON.stringify(snapshot));
      });
    this.queue = job;
    await job;
  }
  async createDeck(deck: FlashcardDeck) {
    await this.mutate((snapshot) => {
      snapshot.decks = [deck, ...snapshot.decks];
    });
  }
  async updateDeck(deck: FlashcardDeck) {
    await this.mutate((snapshot) => {
      snapshot.decks = snapshot.decks.map((value) =>
        value.id === deck.id ? deck : value,
      );
    });
  }
  async removeDeck(deckId: string) {
    await this.mutate((snapshot) => {
      snapshot.decks = snapshot.decks.filter((deck) => deck.id !== deckId);
      snapshot.cards = snapshot.cards.filter((card) => card.deckId !== deckId);
    });
  }
  async createCards(cards: Flashcard[]) {
    await this.mutate((snapshot) => {
      const ids = new Set(snapshot.cards.map((card) => card.id));
      const normalized = cards
        .filter((card) => {
          if (ids.has(card.id)) return false;
          ids.add(card.id);
          return true;
        })
        .map((card) => ({
          ...card,
          statement: card.statement ?? card.front,
          explanation: card.explanation ?? card.back,
          title: card.title ?? (card.source.chapterTitle || "Flashcard"),
          front: card.front || card.statement || "",
          back: card.back || card.explanation || "",
        }));
      snapshot.cards.push(...normalized);
    });
  }
  async updateCard(card: Flashcard) {
    const normalized: Flashcard = {
      ...card,
      statement: card.statement ?? card.front,
      explanation: card.explanation ?? card.back,
      title: card.title ?? (card.source.chapterTitle || "Flashcard"),
      front: card.front || card.statement || "",
      back: card.back || card.explanation || "",
    };
    await this.mutate((snapshot) => {
      snapshot.cards = snapshot.cards.map((value) =>
        value.id === normalized.id ? normalized : value,
      );
    });
  }
  async removeCard(cardId: string) {
    await this.mutate((snapshot) => {
      snapshot.cards = snapshot.cards.filter((card) => card.id !== cardId);
    });
  }
  async studySession(
    deckId: string,
    restart = false,
  ): Promise<FlashcardStudySession> {
    let result!: FlashcardStudySession;
    await this.mutate((snapshot) => {
      const sessions = (snapshot.sessions ??= []);
      const existing = sessions.find((s) => s.deckId === deckId);
      if (existing && !restart) {
        result = existing;
        return;
      }
      if (!snapshot.decks.some((d) => d.id === deckId))
        throw new Error("Deck não encontrado.");
      const cards = snapshot.cards.filter(
        (c) => c.deckId === deckId && isPlayableFlashcard(c),
      );
      if (!cards.length)
        throw new Error(
          "Este deck não tem flashcards completos. Cadastre ou edite título, afirmação, gabarito e explicação.",
        );
      result = {
        id: id("session"),
        deckId,
        cards: JSON.parse(JSON.stringify(cards)),
        index: 0,
        answers: [],
        score: 0,
        completed: false,
        scoringVersion: FLASHCARD_SCORING_VERSION,
        createdAt: Date.now(),
      };
      snapshot.sessions = [
        ...sessions.filter((s) => s.deckId !== deckId),
        result,
      ];
    });
    return result;
  }
  async answerStudy(
    sessionId: string,
    cardId: string,
    choice: FlashcardChoice,
  ): Promise<FlashcardStudySession> {
    let result!: FlashcardStudySession;
    await this.mutate((snapshot) => {
      const session = snapshot.sessions?.find((s) => s.id === sessionId);
      if (!session) throw new Error("Sessão não encontrada.");
      result = session;
      if (session.answers.some((a) => a.cardId === cardId)) return;
      const card = session.cards[session.index];
      if (session.completed || !card || card.id !== cardId)
        throw new Error("Flashcard fora da sequência.");
      const evaluation = evaluateFlashcardAnswer(card.isTrue!, choice);
      session.answers.push({ ...evaluation, cardId, answeredAt: Date.now() });
      session.score += evaluation.points;
      const current = snapshot.cards.find((c) => c.id === cardId);
      if (current) {
        const rating = evaluation.isCorrect
          ? evaluation.confidence === "HIGH"
            ? 4
            : 3
          : evaluation.confidence === "HIGH"
            ? 1
            : 2;
        const event: FlashcardReviewEvent = {
          id: `${session.id}:${cardId}`,
          cardId,
          rating,
          reviewedAt: Date.now(),
          durationMs: 0,
        };
        Object.assign(
          current,
          computeFlashcardSrs(
            rating,
            current.interval,
            current.repetition,
            current.easeFactor,
            event.reviewedAt,
          ),
        );
        snapshot.reviews.push(event);
      }
    });
    return result;
  }
  async advanceStudy(
    sessionId: string,
    cardId: string,
  ): Promise<FlashcardStudySession> {
    let result!: FlashcardStudySession;
    await this.mutate((snapshot) => {
      const session = snapshot.sessions?.find((s) => s.id === sessionId);
      if (!session) throw new Error("Sessão não encontrada.");
      result = session;
      if (session.completed || session.cards[session.index]?.id !== cardId)
        return;
      if (!session.answers.some((a) => a.cardId === cardId))
        throw new Error("Responda antes de avançar.");
      if (session.index + 1 === session.cards.length) session.completed = true;
      else session.index++;
    });
    return result;
  }
  async recordReview(
    card: Flashcard,
    event: FlashcardReviewEvent,
  ): Promise<FlashcardReviewResult> {
    let result: FlashcardReviewResult | null = null;
    await this.mutate((snapshot) => {
      const previousEvent = snapshot.reviews.find(
        (value) => value.id === event.id,
      );
      const current =
        snapshot.cards.find((value) => value.id === card.id) ?? card;
      if (previousEvent) {
        result = { card: current, event: previousEvent };
        return;
      }
      const updated: Flashcard = {
        ...current,
        ...computeFlashcardSrs(
          event.rating,
          current.interval,
          current.repetition,
          current.easeFactor,
          event.reviewedAt,
        ),
        updatedAt: event.reviewedAt,
      };
      snapshot.cards = snapshot.cards.map((value) =>
        value.id === card.id ? updated : value,
      );
      snapshot.reviews.push(event);
      result = { card: updated, event };
    });
    return result!;
  }
}

export const localFlashcards = new LocalFlashcardRepository();
const accountRepositories = new Map<string, LocalFlashcardRepository>();
export function flashcardsForUser(userId: string): LocalFlashcardRepository {
  if (!/^[0-9a-f-]{36}$/i.test(userId))
    throw new Error("Conta inválida para o estudo local.");
  let repository = accountRepositories.get(userId);
  if (!repository) {
    repository = new LocalFlashcardRepository(
      flashcardStorage,
      `${FLASHCARD_STORAGE_KEY}:${userId}`,
    );
    accountRepositories.set(userId, repository);
  }
  return repository;
}
export function createFlashcardId() {
  return id("card");
}
export function createFlashcardDeckId() {
  return id("deck");
}
