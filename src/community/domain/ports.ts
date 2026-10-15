import type { CommunityIdentity, CommunityState, ReadingSnapshot } from "./models";

export interface CommunityIdentityProvider { getIdentity(): CommunityIdentity | null }
export interface CommunityReadingDataSource { getSnapshot(userId: string): Promise<ReadingSnapshot> }
export interface CommunityRepository {
  load(userId: string): Promise<CommunityState>;
  /** Atomic local read/modify/write. The callback must not perform side effects. */
  update(userId: string, change: (state: CommunityState) => CommunityState): Promise<CommunityState>;
}
export interface CommunityKeyValueStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
