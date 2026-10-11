import { DownloadJob } from "@/src/domain/types/download";
import type { DownloadRequestResolver } from "@/src/data/downloads/DownloadManager";
import { UserSourceRepository } from "@/src/data/sources/UserSourceRepository";
import { withAbort } from "@/src/core/utils/cancellation";
import { googleDrive } from "@/src/data/drive/driveDependencies";
import { DriveError } from "./DriveErrors";
export const driveDownloadResolver: DownloadRequestResolver = {
  resolve: async (job, signal) => {
    if (!job.drive) return { url: job.url, headers: {} };
    const sources = await withAbort(new UserSourceRepository().list(), signal);
    const source = sources.find(item => item.id === job.drive?.sourceId && item.kind === "google-drive" && item.enabled && item.status === "active");
    if (!source) throw new DriveError("disconnected");
    return googleDrive.downloadRequest(source, job.drive.fileId, signal);
  },
  checkStatus: (job: DownloadJob, status: number, headers?: Record<string, string>) => {
    if (job.drive) googleDrive.checkDownloadStatus(job.drive.sourceId, status, headers?.Authorization?.replace(/^Bearer /, ""));
  },
};
