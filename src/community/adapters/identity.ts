import type { CommunityIdentity } from "../domain/models";
import type { CommunityIdentityProvider } from "../domain/ports";

/** The only shape borrowed from legacy Auth; replace this mapping after merge. */
export function identityFromAccount(userId: string | null, profile: {
  id: string; username: string | null; display_name: string; avatar_url: string | null; account_status: string;
} | null): CommunityIdentity | null {
  if (!userId || !profile || profile.id !== userId || !profile.username || profile.account_status !== "active") return null;
  return { userId, username: profile.username, displayName: profile.display_name || profile.username,
    avatar: profile.avatar_url && /^https:\/\//i.test(profile.avatar_url) ? profile.avatar_url : null };
}
export class CallbackIdentityProvider implements CommunityIdentityProvider {
  constructor(private readonly current: () => CommunityIdentity | null) {}
  getIdentity() { return this.current(); }
}
