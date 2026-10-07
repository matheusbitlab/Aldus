import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { AppThemeMode, appThemeTokens, AppThemePalette, resolveAppThemeName } from "@/src/theme/tokens";

interface AppThemeContextValue {
  mode: AppThemeMode;
  resolvedTheme: "light" | "dark";
  palette: AppThemePalette;
  setMode: (nextMode: AppThemeMode) => Promise<void>;
}

const APP_THEME_STORAGE_KEY = "@kindle/appTheme";
const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const resolvedSystemScheme = systemScheme === "light" || systemScheme === "dark" ? systemScheme : null;
  const [mode, setModeState] = useState<AppThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    void AsyncStorage.getItem(APP_THEME_STORAGE_KEY).then((stored) => {
      if (disposed) return;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
      setReady(true);
    }).catch(() => {
      if (!disposed) setReady(true);
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(APP_THEME_STORAGE_KEY, mode).catch(() => undefined);
  }, [mode, ready]);

  const resolvedTheme = useMemo(() => resolveAppThemeName(mode, resolvedSystemScheme), [mode, resolvedSystemScheme]);
  const palette = useMemo(() => appThemeTokens[resolvedTheme], [resolvedTheme]);

  const value = useMemo<AppThemeContextValue>(() => ({
    mode,
    resolvedTheme,
    palette,
    setMode: async (nextMode: AppThemeMode) => {
      setModeState(nextMode);
    },
  }), [mode, palette, resolvedTheme]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) throw new Error("useAppTheme must be used within AppThemeProvider");
  return value;
}
