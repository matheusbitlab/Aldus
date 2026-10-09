import { Flashcard, FlashcardAnswerResult } from "../types/flashcards";

export const BATTLE_COUNTS = [3, 5, 10, 15] as const;
export type BattleCount = (typeof BATTLE_COUNTS)[number];
export interface BattleParticipant {
  id: string;
  name: string;
  deckTitle: string;
  confirmed: boolean;
  answered: number;
  score: number;
  correct: number;
  cursor: number;
}
export interface FlashcardBattleState {
  status:
    | "idle"
    | "searching"
    | "confirmation"
    | "active"
    | "waiting"
    | "complete"
    | "cancelled";
  id?: string;
  count?: BattleCount;
  me?: BattleParticipant;
  opponent?: BattleParticipant;
  card?: Flashcard | null;
  answer?: FlashcardAnswerResult | null;
  winner?: string | null;
  history?: { card: Flashcard; answer: FlashcardAnswerResult }[];
}
