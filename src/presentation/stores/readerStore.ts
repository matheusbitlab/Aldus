import { create } from "zustand";

interface ReaderState {
  progress: number;
  controlsVisible: boolean;
  setProgress: (progress: number) => void;
  setControlsVisible: (visible: boolean) => void;
  toggleControls: () => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  progress: 0.38,
  controlsVisible: false, // Default is strictly immersive mode (full screen)
  setProgress: (progress) =>
    set({ progress: Math.min(1, Math.max(0, progress)) }),
  setControlsVisible: (controlsVisible) => set({ controlsVisible }),
  toggleControls: () =>
    set((state) => ({ controlsVisible: !state.controlsVisible })),
}));
