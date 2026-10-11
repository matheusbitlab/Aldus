/** Synchronous revocation prevents stale reads/writes from crossing accounts. */
export class LibraryAccountScope {
  userId: string | null = null;
  generation = 0;
  private listeners = new Set<() => void>();
  set(userId: string | null) {
    if (this.userId === userId) return;
    this.userId = userId; this.generation++;
    for (const listener of this.listeners) listener();
  }
  capture() {
    const userId = this.userId, generation = this.generation;
    return { userId, check: () => { if (generation !== this.generation) throw new Error("A conta mudou. Reabra a operação."); } };
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
}
export const libraryAccountScope = new LibraryAccountScope();
