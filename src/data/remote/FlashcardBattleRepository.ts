import { requireSupabase } from "./supabase";
import { libraryAccountScope } from "@/src/data/library/LibraryAccountScope";
import { withAbort } from "@/src/core/utils/cancellation";
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
  private async operation() {
    const scope = libraryAccountScope.capture();
    if (!scope.userId) throw new Error("Entre na sua conta para participar.");
    const { data, error } = await requireSupabase().auth.getSession();
    scope.check();
    if (error || data.session?.user.id !== scope.userId || !data.session.access_token)
      throw new Error("Entre novamente para participar da batalha.");
    const headers = { apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!,
      Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" };
    return async (action: string, payload: Record<string, unknown> = {}): Promise<FlashcardBattleState> => {
      scope.check();
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
      const unsubscribe = libraryAccountScope.subscribe(() => controller.abort());
      try {
        const response = await withAbort(fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/flashcard_battle`,
          { method: "POST", headers, body: JSON.stringify({ action, payload }), signal: controller.signal }), controller.signal);
        const result = await withAbort(response.json(), controller.signal);
        scope.check();
        if (!response.ok) {
          if (["PGRST202", "42883"].includes(result?.code)) throw new Error("A batalha ainda não está disponível no servidor. Tente novamente após a habilitação pelo administrador.");
          throw new Error(response.status === 401 || response.status === 403 || result?.code === "42501"
            ? "Entre novamente e confira se Flashcards estão disponíveis para sua conta."
            : "Não foi possível concluir a operação. Consulte a partida antes de tentar novamente.");
        }
        if (!result || !["idle", "searching", "confirmation", "active", "waiting", "complete", "cancelled"].includes(result.status)
          || (result.me && result.me.id !== scope.userId)) throw new Error("Resposta da batalha inválida.");
        return result as FlashcardBattleState;
      } finally { clearTimeout(timer); unsubscribe(); }
    };
  }
  async command(
    action: string,
    payload: Record<string, unknown> = {},
  ): Promise<FlashcardBattleState> {
    return (await this.operation())(action, payload);
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
    // Freeze one identity/JWT for the entire upload -> join, not one identity per step.
    const command = await this.operation();
    await command("upload", {
      deckId: deck.id,
      title: deck.title,
      cards: valid,
    });
    return command("join", { deckId: deck.id, count });
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
