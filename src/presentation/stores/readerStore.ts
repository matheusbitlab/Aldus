import { create } from "zustand";

interface ReaderState { progress: number; controlsVisible: boolean; setProgress: (progress: number) => void; toggleControls: () => void; }
export const useReaderStore = create<ReaderState>((set) => ({ progress: 0.38, controlsVisible: true, setProgress: (progress) => set({ progress: Math.min(1, Math.max(0, progress)) }), toggleControls: () => set((state) => ({ controlsVisible: !state.controlsVisible })) }));
