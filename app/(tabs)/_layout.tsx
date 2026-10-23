import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { useFeatureAccess } from "@/src/presentation/contexts/AuthContext";
import { Platform, useWindowDimensions } from "react-native";

export default function TabsLayout() {
  const { palette } = useAppTheme();
  const flashcards = useFeatureAccess("flashcards");
  const { width } = useWindowDimensions();
  const sidebar = Platform.OS === "web" && width >= 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? "left" : "bottom",
        tabBarVariant: sidebar ? "material" : "uikit",
        tabBarLabelPosition: sidebar && width < 1200 ? "below-icon" : "beside-icon",
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: palette.tabBar,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          ...(sidebar ? { width: width >= 1200 ? 200 : 100, borderTopWidth: 0, borderRightWidth: 1, borderRightColor: palette.border, paddingTop: 32 } : {}),
        },
        tabBarLabelStyle: {
          color: palette.text,
        },
      }}
    >
      <Tabs.Screen name="library" options={{ title: "Biblioteca", tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="study" options={{ title: "Estudo", href: flashcards.allowed ? undefined : null, tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: "Buscar", tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
