import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export function FeatureDenied() {
  const { palette } = useAppTheme();
  return <View style={{ flex: 1, backgroundColor: palette.background, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 }}>
    <Ionicons name="lock-closed-outline" size={40} color={palette.accent} />
    <Text accessibilityRole="alert" style={{ color: palette.text, fontSize: 20, fontWeight: "700", textAlign: "center" }}>Flashcards não estão disponíveis para esta conta.</Text>
    <Pressable accessibilityRole="button" onPress={() => router.replace("/library")} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: palette.accent, fontWeight: "700" }}>Voltar à biblioteca</Text></Pressable>
  </View>;
}
