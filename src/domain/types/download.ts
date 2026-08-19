export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "failed" | "cancelled";
export interface DownloadJob { id: string; url: string; fileName: string; status: DownloadStatus; progress: number; localUri: string | null; error: string | null; attempts: number; }
