import type { Achievement, CommunityState, LiteraryLevel, ReadingActivity, ReadingEvent } from "./models";
import { localDay, validDay } from "./metrics";

const levels: LiteraryLevel[] = [
  { rank: 1, name: "Primeiras páginas", threshold: 0, nextThreshold: 100 },
  { rank: 2, name: "Entre livros", threshold: 100, nextThreshold: 500 },
  { rank: 3, name: "Horizontes de leitura", threshold: 500, nextThreshold: 1500 },
  { rank: 4, name: "Biblioteca viva", threshold: 1500, nextThreshold: 4000 },
  { rank: 5, name: "Vida literária", threshold: 4000, nextThreshold: null },
];
export function progression(points: number) {
  if (!Number.isSafeInteger(points) || points < 0) throw Error("Progresso inválido.");
  const level = [...levels].reverse().find(v => points >= v.threshold)!;
  return { points, level, fraction: level.nextThreshold === null ? 1 : (points - level.threshold) / (level.nextThreshold - level.threshold) };
}
/** Source event IDs alone cannot award repeatedly: a semantic identity is mandatory. */
export function awardKey(event: ReadingEvent): string {
  if (!event.id || !event.userId) throw Error("Evento sem identidade.");
  if (!["BOOK_STARTED", "BOOK_COMPLETED", "READING_STREAK"].includes(event.type) ||
    (event.occurredAt !== null && (!Number.isSafeInteger(event.occurredAt) || event.occurredAt < 0 || !Number.isFinite(new Date(event.occurredAt).getTime())))) throw Error("Evento de leitura inválido.");
  if (event.type === "READING_STREAK") {
    if (!event.streakDay || !validDay(event.streakDay) || event.occurredAt === null || localDay(new Date(event.occurredAt)) !== event.streakDay) throw Error("Hábito sem dia medido.");
    return JSON.stringify([event.userId, event.type, event.streakDay]);
  }
  if (!event.bookId || (event.completionId !== null && !event.completionId.trim())) throw Error("Evento sem livro ou conclusão válida.");
  return JSON.stringify([event.userId, event.type, event.bookId, event.type === "BOOK_COMPLETED" ? event.completionId ?? "lifetime" : "lifetime"]);
}
export function applyReadingEvents(state: CommunityState, events: ReadingEvent[], now: number): CommunityState {
  const awards = [...state.awards], activities = [...state.activities];
  const keys = new Set(awards.map(a => a.key));
  const before = progression(awards.reduce((n, a) => n + a.points, 0));
  for (const event of events) {
    if (event.userId !== state.userId) throw Error("Evento de outra conta.");
    const key = awardKey(event);
    if (keys.has(key)) continue;
    const points = event.type === "BOOK_COMPLETED" ? 100 : event.type === "BOOK_STARTED" ? 10 : 5;
    keys.add(key); awards.push({ key, points });
    activities.push({ id: key, userId: state.userId,
      type: event.type === "BOOK_COMPLETED" ? "finished_book" : event.type === "BOOK_STARTED" ? "started_book" : "reading_streak",
      bookId: event.bookId, bookTitle: event.bookTitle, label: null, occurredAt: event.occurredAt,
      recordedAt: now, privacy: state.profile?.activityPrivacy ?? "PRIVATE" });
  }
  const after = progression(awards.reduce((n, a) => n + a.points, 0));
  for (const level of levels.filter(v => v.rank > before.level.rank && v.rank <= after.level.rank)) {
    activities.push({ id: `level:${level.rank}`, userId: state.userId, type: "level_reached", bookId: null,
      bookTitle: null, label: level.name, occurredAt: now, recordedAt: now, privacy: state.profile?.activityPrivacy ?? "PRIVATE" });
  }
  return { ...state, awards, activities };
}
export function achievements(state: CommunityState): Achievement[] {
  const first = state.activities.find(a => a.type === "finished_book");
  return [{ id: "first-completion", name: "Uma obra inteira", description: "Primeira conclusão registrada na jornada local.", unlockedAt: first?.recordedAt ?? null }];
}
export function activityText(activity: ReadingActivity): string {
  const title = activity.bookTitle ?? "um livro";
  if (activity.type === "started_book") return activity.occurredAt === null ? `Leitura em andamento registrada: ${title}` : `Você começou ${title}`;
  if (activity.type === "finished_book") return activity.occurredAt === null ? `Conclusão registrada: ${title}` : `Você concluiu ${title}`;
  if (activity.type === "level_reached") return `Você alcançou ${activity.label}`;
  if (activity.type === "reading_streak") return "Mais um dia de leitura registrado";
  return activity.label ?? "Atividade literária registrada";
}
