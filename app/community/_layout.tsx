import { Stack } from "expo-router";
import { CommunityProvider } from "@/src/community/presentation/CommunityProvider";

export default function CommunityLayout() {
  return <CommunityProvider><Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" /><Stack.Screen name="profile" />
    <Stack.Screen name="edit-profile" /><Stack.Screen name="[section]" />
  </Stack></CommunityProvider>;
}
