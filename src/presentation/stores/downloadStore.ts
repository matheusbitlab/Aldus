import { create } from "zustand";
import { DownloadJob } from "@/src/domain/types/download";
import { appDependencies } from "@/src/presentation/services/dependencies";

interface DownloadState {
  jobs: Record<string, DownloadJob>;
  enqueue: (job: DownloadJob) => Promise<void>;
  cancel: (id: string) => Promise<boolean>;
}

let operationSequence = 0;

export const useDownloadStore = create<DownloadState>((set, get) => ({
  jobs: {},
  enqueue: async job => {
    const operationId = `download-${Date.now().toString(36)}-${(++operationSequence).toString(36)}`;
    const queued: DownloadJob = {
      ...job,
      operationId,
      status: "queued",
      phase: "preparing",
      progress: 0,
      progressKnown: false,
      cancellable: true,
      error: null,
    };
    set(state => ({ jobs: { ...state.jobs, [job.id]: queued } }));
    try {
      await appDependencies.downloadManager.download(queued, updated => {
        set(state => {
          const current = state.jobs[updated.id];
          if (current?.operationId !== updated.operationId) return state;
          return { jobs: { ...state.jobs, [updated.id]: updated } };
        });
      });
    } catch {
      // DownloadManager publishes the sanitized terminal state.
    }
  },
  cancel: async id => {
    const current = get().jobs[id];
    if (!current?.operationId || !current.cancellable) return false;
    const cancelled = await appDependencies.downloadManager.cancel(id);
    if (!cancelled) return false;
    set(state => {
      const latest = state.jobs[id];
      if (latest?.operationId !== current.operationId) return state;
      return {
        jobs: {
          ...state.jobs,
          [id]: {
            ...latest,
            status: "cancelled",
            progressKnown: false,
            cancellable: false,
            error: null,
          },
        },
      };
    });
    return true;
  },
}));
