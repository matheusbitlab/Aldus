import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";
import { DriveError } from "./DriveErrors";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
export interface DriveGrant { accessToken: string; expiresAt: number; }
export interface DriveAuthorizationProvider {
  prepare(): Promise<void>;
  authorize(signal?: AbortSignal): Promise<DriveGrant>;
  clearToken?(token: string): Promise<void>;
  revoke(token: string): Promise<void>;
}
/** Credentials never enter source records, search results, AsyncStorage or logs. */
export class DriveAuthorization {
  private readonly grants = new Map<string, DriveGrant>();
  private readonly generations = new Map<string, number>();
  constructor(private readonly provider: DriveAuthorizationProvider) {}
  prepare() { return this.provider.prepare(); }
  async connect(sourceId: string, signal?: AbortSignal): Promise<void> {
    const generation = (this.generations.get(sourceId) ?? 0) + 1;
    this.generations.set(sourceId, generation);
    const previous = this.grants.get(sourceId);
    this.grants.delete(sourceId);
    if (previous) await this.provider.clearToken?.(previous.accessToken).catch(() => undefined);
    throwIfAborted(signal);
    const grant = await withAbort(this.provider.authorize(signal), signal);
    throwIfAborted(signal);
    if (this.generations.get(sourceId) !== generation) throw new DriveError("disconnected");
    if (!grant.accessToken || !Number.isFinite(grant.expiresAt) || grant.expiresAt <= Date.now()) throw new DriveError("expired");
    this.grants.set(sourceId, grant);
  }
  token(sourceId: string): string {
    const grant = this.grants.get(sourceId);
    if (!grant) throw new DriveError("disconnected");
    if (grant.expiresAt <= Date.now() + 30000) { this.invalidate(sourceId); throw new DriveError("expired"); }
    return grant.accessToken;
  }
  invalidate(sourceId: string): void {
    const grant = this.grants.get(sourceId);
    this.grants.delete(sourceId);
    this.generations.set(sourceId, (this.generations.get(sourceId) ?? 0) + 1);
    if (grant) void this.provider.clearToken?.(grant.accessToken).catch(() => undefined);
  }
  async disconnect(sourceId: string): Promise<boolean> {
    const grant = this.grants.get(sourceId);
    this.invalidate(sourceId);
    if (!grant) return false;
    try { await this.provider.revoke(grant.accessToken); return true; } catch { return false; }
  }
}
