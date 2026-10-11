import { DownloadJob } from "@/src/domain/types/download";
import { SourceAcquisitionState, SourceCatalogItem } from "@/src/domain/types/sourceCatalog";

export const sourceDownloadId = (sourceId: string, remoteBookId: string): string => JSON.stringify(["source-book", sourceId, remoteBookId]);
export function sourceItemJob(item: SourceCatalogItem, jobs: Record<string, DownloadJob>): DownloadJob | undefined {
  return jobs[sourceDownloadId(item.sourceId, item.remoteBookId)] ?? Object.values(jobs).find(job => job.source?.sourceId === item.sourceId && job.source.remoteBookId === item.remoteBookId);
}
export function sourceAcquisitionState(item: SourceCatalogItem, importedBookId?: string, job?: DownloadJob): SourceAcquisitionState {
  if (importedBookId) return "imported";
  if (job?.status === "queued" || job?.status === "downloading") return "downloading";
  return item.availability === "unavailable" ? "unavailable" : "remote_only";
}
