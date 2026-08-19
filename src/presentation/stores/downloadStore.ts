import { create } from "zustand";
import { DownloadJob } from "@/src/domain/types/download";
import { appDependencies } from "@/src/presentation/services/dependencies";
interface DownloadState { jobs: Record<string, DownloadJob>; enqueue: (job: DownloadJob) => Promise<void>; cancel: (id: string) => Promise<void>; }
export const useDownloadStore = create<DownloadState>((set) => ({ jobs: {}, enqueue: async (job) => { set((state) => ({ jobs: { ...state.jobs, [job.id]: { ...job, status: "queued" } } })); try { await appDependencies.downloadManager.download({ ...job, status: "queued" }, (updated) => set((state) => ({ jobs: { ...state.jobs, [updated.id]: updated } }))); } catch { /* status is updated by manager */ } }, cancel: async (id) => { await appDependencies.downloadManager.cancel(id); set((state) => ({ jobs: { ...state.jobs, [id]: { ...state.jobs[id], status: "cancelled" } } })); } }));
