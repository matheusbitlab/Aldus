import { Stack } from "expo-router";
import { ReaderSettingsProvider } from "@/src/presentation/contexts/ReaderSettingsContext";

export default function RootLayout() {
  return (
    <ReaderSettingsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ReaderSettingsProvider>
  );
}
