export type SourceKind = "json" | "opds" | "html" | "bndigital" | "gutenberg" | "webview";
export interface UserSource {
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
