import { requireSupabase } from "./supabase";
import {
  Flashcard,
  FlashcardDeck,
  FlashcardChoice,
  isPlayableFlashcard,
} from "@/src/domain/types/flashcards";
import {
  BattleCount,
  BATTLE_COUNTS,
  FlashcardBattleState,
} from "@/src/domain/study/flashcardBattle";

export class RemoteFlashcardBattleRepository {
  async command(
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<FlashcardBattleState> {
    const { data, error } = await requireSupabase().rpc("flashcard_battle", {
      action,
      payload,
    });
    if (error) {
      if (error.code === "PGRST202" || error.code === "42883")
        throw new Error(
          "A batalha ainda não está disponível no servidor. Tente novamente após a habilitação pelo administrador.",
        );
      throw new Error(
        error.message ||
          "Não foi possível comunicar com a batalha. Seu progresso aceito fica salvo; tente reconectar.",
      );
    }
    if (!data || typeof data.status !== "string")
      throw new Error("Resposta da batalha inválida.");
    return data as FlashcardBattleState;
  }
  get() {
    return this.command("get");
  }
  async join(deck: FlashcardDeck, cards: Flashcard[], count: BattleCount) {
    const valid = cards.filter(
      (c) => c.deckId === deck.id && isPlayableFlashcard(c),
    );
    if (!BATTLE_COUNTS.includes(count) || valid.length < count)
      throw new Error(
        `Escolha outro deck ou uma quantidade menor: este deck tem ${valid.length} flashcards completos.`,
      );
    await this.command("upload", {
      deckId: deck.id,
      title: deck.title,
      cards: valid,
    });
    return this.command("join", { deckId: deck.id, count });
  }
  cancel() {
    return this.command("cancel");
  }
  confirm(matchId: string) {
    return this.command("confirm", { matchId });
  }
  answer(matchId: string, ordinal: number, choice: FlashcardChoice) {
    return this.command("answer", { matchId, ordinal, choice });
  }
  advance(matchId: string, ordinal: number) {
    return this.command("advance", { matchId, ordinal });
  }
  leave() {
    return this.command("leave");
  }
}
export const flashcardBattles = new RemoteFlashcardBattleRepository();
