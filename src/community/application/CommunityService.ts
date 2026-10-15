import type { CommunityIdentityProvider, CommunityReadingDataSource, CommunityRepository } from "../domain/ports";
import type { CommunityState, LiteraryProfile, ReadingEvent, ReadingSnapshot } from "../domain/models";
import { createProfile, validateProfile } from "../domain/profile";
import { calculateStats, localDay } from "../domain/metrics";
import { applyReadingEvents, progression } from "../domain/progression";

export class CommunityService {
  constructor(private readonly identity: CommunityIdentityProvider, private readonly repository: CommunityRepository,
    private readonly reading: CommunityReadingDataSource, private readonly now = () => Date.now()) {}
  private current() { const value = this.identity.getIdentity(); if (!value) throw Error("Entre na sua conta para abrir a comunidade."); return value; }
  private assertCurrent(id: string) { if (this.current().userId !== id) throw Error("A conta mudou durante a operação."); }
  async refresh() {
    const identity = this.current();
    const snapshot = await this.reading.getSnapshot(identity.userId);
    this.assertCurrent(identity.userId);
    if (snapshot.scope === "account" && snapshot.userId !== identity.userId) throw Error("Fonte de leitura de outra conta.");
    const stats = calculateStats(snapshot, localDay(new Date(this.now())));
    const state = await this.repository.update(identity.userId, previous => {
      this.assertCurrent(identity.userId);
      let next: CommunityState = { ...previous, profile: previous.profile ?? createProfile(identity, this.now()) };
      if (snapshot.scope === "account" || next.includeDeviceLibrary) next = applyReadingEvents(next, snapshotEvents(snapshot, identity.userId), this.now());
      return next;
    });
    this.assertCurrent(identity.userId);
    return { state, snapshot, stats, progression: progression(state.awards.reduce((n, a) => n + a.points, 0)) };
  }
  async saveProfile(profile: LiteraryProfile, expectedRevision: number): Promise<CommunityState> {
    const identity = this.current();
    if (profile.userId !== identity.userId) throw Error("Perfil de outra conta.");
    const validated = validateProfile({ ...profile, username: identity.username, avatar: identity.avatar, updatedAt: this.now() });
    return this.repository.update(identity.userId, state => {
      this.assertCurrent(identity.userId);
      if (state.revision !== expectedRevision) throw Error("O perfil mudou. Reabra antes de salvar.");
      return { ...state, profile: validated };
    });
  }
  async setIncludeDeviceLibrary(enabled: boolean): Promise<void> {
    const identity = this.current();
    await this.repository.update(identity.userId, state => { this.assertCurrent(identity.userId); return { ...state, includeDeviceLibrary: enabled }; });
  }
}
export type CommunityView = Awaited<ReturnType<CommunityService["refresh"]>>;

/** Undated snapshots are observations, never fictitious historical events. */
export function snapshotEvents(snapshot: ReadingSnapshot, userId: string): ReadingEvent[] {
  // A future account source owns event identities, including valid rereading revisions.
  if (snapshot.scope === "account") return [...snapshot.history];
  const events: ReadingEvent[] = [];
  for (const book of snapshot.books) {
    const base = { userId, bookId: book.id, bookTitle: book.title, completionId: null, streakDay: null };
    // Interrupted/abandoned do not prove that any reading took place.
    if (["reading", "completed"].includes(book.status)) events.push({ ...base, id: `snapshot:start:${book.id}`, type: "BOOK_STARTED", occurredAt: book.startedAt });
    if (book.status === "completed") events.push({ ...base, id: `snapshot:finish:${book.id}`, type: "BOOK_COMPLETED", occurredAt: book.completedAt });
  }
  return events;
}
