import type { ActivityType, CommunityState } from "../domain/models";
import { privacyOptions, validateProfile } from "../domain/profile";

export function emptyState(userId: string): CommunityState {
  if (!userId || userId.length > 200) throw Error("Conta inválida.");
  return { version: 1, userId, revision: 0, profile: null, includeDeviceLibrary: false, awards: [], activities: [] };
}
const activityTypes: ActivityType[] = ["started_book", "finished_book", "reading_streak", "rated_book", "updated_progress", "achievement_unlocked", "level_reached", "joined_club", "created_discussion"];
export function parseState(text: string, userId: string): CommunityState {
  if (text.length > 10_000_000) throw Error("Dados da comunidade excedem o limite local.");
  const value = JSON.parse(text) as CommunityState;
  if (!value || value.version !== 1 || value.userId !== userId || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
    typeof value.includeDeviceLibrary !== "boolean" || !Array.isArray(value.awards) || !Array.isArray(value.activities)) throw Error("Dados locais da comunidade inválidos. Preserve o armazenamento.");
  if (value.profile !== null) {
    value.profile = validateProfile(value.profile);
    if (value.profile.userId !== userId) throw Error("Perfil de outra conta.");
  }
  const keys = new Set<string>();
  for (const award of value.awards) {
    if (!award || typeof award.key !== "string" || award.key.length > 2000 || keys.has(award.key)) throw Error("Identidade de progresso inválida.");
    const key: unknown = JSON.parse(award.key);
    if (!Array.isArray(key) || key[0] !== userId || !["BOOK_STARTED", "BOOK_COMPLETED", "READING_STREAK"].includes(key[1]) ||
      typeof key[2] !== "string" || !key[2] || (key[1] !== "READING_STREAK" && (key.length !== 4 || typeof key[3] !== "string" || !key[3])) ||
      (key[1] === "READING_STREAK" && (key.length !== 3 || !/^\d{4}-\d{2}-\d{2}$/.test(key[2]))) ||
      award.points !== (key[1] === "BOOK_COMPLETED" ? 100 : key[1] === "BOOK_STARTED" ? 10 : 5)) throw Error("Registro de progresso inválido.");
    keys.add(award.key);
  }
  const ids = new Set<string>();
  for (const activity of value.activities) {
    if (!activity || activity.userId !== userId || typeof activity.id !== "string" || !activity.id || ids.has(activity.id) ||
      !activityTypes.includes(activity.type) || !privacyOptions.includes(activity.privacy) ||
      !Number.isSafeInteger(activity.recordedAt) || activity.recordedAt < 0 ||
      (activity.occurredAt !== null && (!Number.isSafeInteger(activity.occurredAt) || activity.occurredAt < 0)) ||
      [activity.bookId, activity.bookTitle, activity.label].some(v => v !== null && (typeof v !== "string" || v.length > 2000))) throw Error("Atividade inválida.");
    ids.add(activity.id);
  }
  return value;
}
export function serializeState(state: CommunityState): string {
  return JSON.stringify(parseState(JSON.stringify(state), state.userId));
}
