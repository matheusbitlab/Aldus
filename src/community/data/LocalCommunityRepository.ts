import type { CommunityKeyValueStorage, CommunityRepository } from "../domain/ports";
import type { CommunityState } from "../domain/models";
import { emptyState, parseState, serializeState } from "./serialization";

export const communityStorageKey = (userId: string) => `@aldus/community.v1:${encodeURIComponent(userId)}`;
const queues = new WeakMap<CommunityKeyValueStorage, Map<string, Promise<unknown>>>();
export type CommunityLock = <T>(key: string, operation: () => Promise<T>) => Promise<T>;

/** Owner-bound repository; errors never replace durable data with an empty cache. */
export class LocalCommunityRepository implements CommunityRepository {
  constructor(private readonly storage: CommunityKeyValueStorage, private readonly ownerId: string, private readonly lock?: CommunityLock) { emptyState(ownerId); }
  private assertOwner(userId: string) { if (userId !== this.ownerId) throw Error("Acesso a outra conta não permitido."); }
  private async read(userId: string) {
    const text = await this.storage.getItem(communityStorageKey(userId));
    return text === null ? emptyState(userId) : parseState(text, userId);
  }
  async load(userId: string): Promise<CommunityState> {
    this.assertOwner(userId);
    await queues.get(this.storage)?.get(userId)?.catch(() => undefined);
    return this.read(userId);
  }
  update(userId: string, change: (state: CommunityState) => CommunityState): Promise<CommunityState> {
    this.assertOwner(userId);
    let map = queues.get(this.storage);
    if (!map) { map = new Map(); queues.set(this.storage, map); }
    const operation = async () => {
      const current = await this.read(userId);
      const next = change(current);
      if (next.userId !== userId || next.revision !== current.revision) throw Error("Identidade ou versão alterada indevidamente.");
      const normalized = parseState(serializeState(next), userId);
      if (serializeState(current) === serializeState(normalized)) return current;
      normalized.revision++;
      await this.storage.setItem(communityStorageKey(userId), serializeState(normalized));
      return normalized;
    };
    const job = (map.get(userId) ?? Promise.resolve()).catch(() => undefined)
      .then(() => this.lock ? this.lock(communityStorageKey(userId), operation) : operation());
    map.set(userId, job);
    void job.finally(() => { if (map!.get(userId) === job) map!.delete(userId); }).catch(() => undefined);
    return job;
  }
}
