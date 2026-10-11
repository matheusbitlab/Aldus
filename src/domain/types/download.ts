export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "failed" | "cancelled";
export type DownloadPhase = "preparing" | "downloading" | "validating" | "reading_metadata" | "persisting" | "finalizing";
export interface DownloadJob {
  id: string;
  url: string;
  fileName: string;
  status: DownloadStatus;
  progress: number;
  progressKnown?: boolean;
  phase?: DownloadPhase;
  cancellable?: boolean;
  operationId?: string;
  localUri: string | null;
  error: string | null;
  attempts: number;
}
