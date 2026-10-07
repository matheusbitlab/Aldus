export type FeatureKey = "flashcards";
export type AccountRole = "master" | "user";
export type AccountStatus = "active" | "disabled";

export interface AccountProfile {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  role: AccountRole;
  account_status: AccountStatus;
}

export type FeatureOverrides = Partial<Record<FeatureKey, boolean>>;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function validUsername(input: string): boolean {
  return /^[a-z][a-z0-9_]{2,23}$/.test(normalizeUsername(input));
}

export function canUseFeature(profile: AccountProfile | null, overrides: FeatureOverrides, feature: FeatureKey): boolean {
  if (!profile || profile.account_status !== "active" || !profile.username) return false;
  if (profile.role === "master") return true;
  return overrides[feature] !== false;
}
