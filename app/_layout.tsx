import { Stack } from "expo-router";
import Head from "expo-router/head";
import { useEffect } from "react";
import { ActivityIndicator, DimensionValue, Platform, StatusBar, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ReaderSettingsProvider } from "@/src/presentation/contexts/ReaderSettingsContext";
import { AppThemeProvider, useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AuthProvider, useAuth } from "@/src/presentation/contexts/AuthContext";
import { authDiagnostic, correlatedAuthDiagnostic } from "@/src/utils/authDiagnostics";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.fontLoading}><ActivityIndicator color="#D97757" /></View>;
  }

  return (
    <>
      <Head><title>Aldus Reader</title></Head>
      <AppThemeProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <ReaderSettingsProvider>
              <AppShell />
            </ReaderSettingsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </AppThemeProvider>
    </>
  );
}

function AppShell() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette, resolvedTheme } = useAppTheme();
  const { loading, session, profile } = useAuth();
  const usePhoneFrame = Platform.OS === "web" && width > 480;
  const appReady = !loading && !!session && !!profile?.username && profile.account_status === "active";
  useEffect(() => {
    authDiagnostic("AUTH_GUARD_DECISION", { operationId: correlatedAuthDiagnostic(session?.user.id), correlation: "candidate", guard: "shell", decision: appReady ? "allowed" : "blocked",
      uuid: session?.user.id, session: !!session, profile: !!profile, username: !!profile?.username, accountStatus: profile?.account_status, loading, appReady });
  }, [loading, session, profile, appReady]);

  return (
    <>
      <StatusBar barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"} backgroundColor={palette.background} />
      <View style={usePhoneFrame ? [styles.webBackground, { backgroundColor: palette.background }] : [styles.fill, { backgroundColor: palette.background }]}>
        <View
          style={[
            usePhoneFrame ? styles.phoneFrame : styles.fill,
            usePhoneFrame ? {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 8),
            } : { backgroundColor: palette.background },
          ]}
        >
          {loading ? <View style={styles.fontLoading}><ActivityIndicator color={palette.accent} /></View> :
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="legal/privacy" />
              <Stack.Screen name="legal/terms" />
              <Stack.Screen name="legal/copyright" />
              <Stack.Screen name="legal/licenses" />
              <Stack.Screen name="legal/data" />
              <Stack.Screen name="legal/about" />
              <Stack.Screen name="legal/version" />
              <Stack.Protected guard={appReady}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="sources/index" />
                <Stack.Screen name="sources/[sourceId]" />
                <Stack.Screen name="reader/[bookId]" />
                <Stack.Screen name="reader/web" />
                <Stack.Screen name="study/[deckId]" />
                <Stack.Screen name="decks/[deckId]" />
                <Stack.Screen name="battle" />
                <Stack.Screen name="services/[provider]" />
                <Stack.Screen name="account/index" />
                <Stack.Screen name="account/edit-profile" />
                <Stack.Screen name="account/change-password" />
              </Stack.Protected>
            </Stack>}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fontLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  webBackground: {
    alignItems: "center",
    height: "100vh" as DimensionValue,
    justifyContent: "center",
  },
  phoneFrame: {
    borderRadius: 30,
    borderWidth: 1,
    elevation: 18,
    height: "90%",
    maxHeight: 900,
    maxWidth: 430,
    overflow: "hidden",
    boxShadow: "0px 12px 24px rgba(0, 0, 0, 0.35)",
    width: "100%",
  },
});
