export type SourceKind = "json" | "opds" | "html" | "bndigital" | "gutenberg" | "webview" | "google-drive";
export interface UserSource {
  /** Local account boundary. Missing/null means device data awaiting explicit adoption. */
  ownerId?: string | null;
  /** Non-secret Drive configuration. id is the persistent sourceId. */
  folderId?: string;
  resourceKey?: string;
	id: string;
	name: string;
	url: string;
	kind: SourceKind;
	enabled: boolean;
	createdAt: number;
	status?: "active" | "error";
	lastError?: string | null;
	lastCheckedAt?: number | null;
}
