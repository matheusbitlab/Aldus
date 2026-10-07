import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "reader.motionCues.enabled";
let revision = 0;
let writes = Promise.resolve();
export const useMotionCuesStore = create<{
 enabled: boolean; hydrated: boolean; status: "checking" | "available" | "unavailable"; message: string;
 setEnabled: (enabled: boolean) => void;
 setStatus: (status: "checking" | "available" | "unavailable", message?: string) => void;
}>((set) => ({
 enabled: false, hydrated: false, status: "checking", message: "Verificando sensores…",
 setEnabled: (enabled) => {
  revision++; set({ enabled });
  writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(KEY, JSON.stringify(enabled)));
  void writes.catch(() => set({ message: "Não foi possível salvar a preferência." }));
 },
 setStatus: (status, message = "") => set({ status, message }),
}));
const initialRevision = revision;
void AsyncStorage.getItem(KEY).then((raw) => {
 if (revision === initialRevision) useMotionCuesStore.setState({ enabled: raw === "true" });
}).catch(() => undefined).finally(() => useMotionCuesStore.setState({ hydrated: true }));
