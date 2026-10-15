import type { CommunityIdentity, LiteraryProfile, Privacy, ReadingGoal } from "./models";

export const privacyOptions: Privacy[] = ["PUBLIC", "FOLLOWERS", "PRIVATE"];
export function validateProfile(profile: LiteraryProfile): LiteraryProfile {
  if (!profile.userId || !/^[a-z][a-z0-9_]{2,23}$/.test(profile.username)) throw Error("Nome de usuário inválido.");
  if (!profile.displayName.trim() || profile.displayName.length > 80 || profile.bio.length > 600) throw Error("Confira o nome (até 80 caracteres) e a bio (até 600).");
  if (!privacyOptions.includes(profile.privacy) || !privacyOptions.includes(profile.activityPrivacy)) throw Error("Privacidade inválida.");
  for (const list of [profile.favoriteGenres, profile.favoriteAuthors, profile.favoriteBooks]) {
    if (!Array.isArray(list) || list.length > 20 || list.some(v => typeof v !== "string" || !v.trim() || v.length > 160)) throw Error("Use até 20 favoritos, com até 160 caracteres cada.");
  }
  if (profile.avatar !== null && (typeof profile.avatar !== "string" || profile.avatar.length > 2048 || !/^https:\/\//i.test(profile.avatar))) throw Error("Avatar inválido.");
  validateGoal(profile.readingGoal);
  if (![profile.createdAt, profile.updatedAt].every(v => Number.isSafeInteger(v) && v >= 0) || profile.updatedAt < profile.createdAt) throw Error("Data de perfil inválida.");
  return { ...profile, displayName: profile.displayName.trim(), bio: profile.bio.trim(),
    favoriteGenres: [...new Set(profile.favoriteGenres.map(v => v.trim()))],
    favoriteAuthors: [...new Set(profile.favoriteAuthors.map(v => v.trim()))],
    favoriteBooks: [...new Set(profile.favoriteBooks.map(v => v.trim()))] };
}
export function validateGoal(goal: ReadingGoal | null): void {
  if (goal !== null && (!Number.isInteger(goal.year) || goal.year < 2000 || goal.year > 9999 || !Number.isInteger(goal.books) || goal.books < 1 || goal.books > 10000)) throw Error("A meta deve ser de 1 a 10.000 livros, com um ano válido.");
}
export function createProfile(identity: CommunityIdentity, now: number): LiteraryProfile {
  return validateProfile({ ...identity, bio: "", favoriteGenres: [], favoriteAuthors: [], favoriteBooks: [],
    readingGoal: null, privacy: "PRIVATE", activityPrivacy: "PRIVATE", createdAt: now, updatedAt: now });
}
/** FOLLOWERS fails closed until the social graph exists. Local repositories are owner-only. */
export function canView(privacy: Privacy, ownerId: string, viewerId: string | null, verifiedFollower = false): boolean {
  return viewerId === ownerId || privacy === "PUBLIC" || (privacy === "FOLLOWERS" && verifiedFollower);
}
export function goalProgress(goal: ReadingGoal | null, byYear: Record<string, number> | null) {
  validateGoal(goal);
  if (!goal || byYear === null) return null;
  const completed = byYear[String(goal.year)] ?? 0;
  return { completed, target: goal.books, fraction: Math.min(1, completed / goal.books) };
}
