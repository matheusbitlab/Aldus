import { ReaderFont, ReaderMargin, ReaderTheme } from "@/src/domain/types/reader";
import { PdfReaderTheme } from "@/src/domain/types/pdfReader";

export type AppThemeMode = "system" | "light" | "dark";

export interface AppThemePalette {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  secondaryText: string;
  separator: string;
  border: string;
  accent: string;
  overlay: string;
  card: string;
  input: string;
  tabBar: string;
  panel: string;
}

export const appThemeTokens: Record<"light" | "dark", AppThemePalette> = {
  light: {
    background: "#F5F5F3",
    surface: "#FFFFFF",
    surfaceSecondary: "#F0F1F0",
    text: "#171A1D",
    textSecondary: "#5F6A70",
    secondaryText: "#5F6A70",
    separator: "#D9DED9",
    border: "#D9DED9",
    accent: "#D97757",
    overlay: "rgba(17, 22, 24, 0.55)",
    card: "#FFFFFF",
    input: "#F8F9F8",
    tabBar: "#F9F9F7",
    panel: "#FFFFFF",
  },
  dark: {
    background: "#12171A",
    surface: "#1B2125",
    surfaceSecondary: "#20292D",
    text: "#EEF2F4",
    textSecondary: "#AAB6BA",
    secondaryText: "#AAB6BA",
    separator: "#2F383D",
    border: "#2F383D",
    accent: "#E59A76",
    overlay: "rgba(8, 12, 14, 0.7)",
    card: "#1E2529",
    input: "#1A2125",
    tabBar: "#171D20",
    panel: "#1B2125",
  },
};

export function resolveAppThemeName(mode: AppThemeMode, systemScheme?: "light" | "dark" | null) {
  if (mode === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return mode;
}

export const readerThemes = {
  light: { background: "#F7F4EE", text: "#1F2D2B", secondaryText: "#68716D", separator: "#DDD8CF", accent: "#D97757", panel: "#FFFDF9" },
  dark: { background: "#151918", text: "#E8E6DD", secondaryText: "#9DA7A1", separator: "#343B38", accent: "#E59A76", panel: "#202725" },
  sepia: { background: "#F3E5C8", text: "#57463A", secondaryText: "#8A7561", separator: "#D7C5A6", accent: "#B65F42", panel: "#F9EED9" },
  paper: { background: "#F5F1E7", text: "#111111", secondaryText: "#37372F", separator: "#D8D0C2", accent: "#B76C3E", panel: "#F8F4EC" },
  black: { background: "#000000", text: "#E8E8E8", secondaryText: "#A0A0A0", separator: "#303030", accent: "#E59A76", panel: "#151515" },
} as const;

export const pdfReaderThemes: Record<PdfReaderTheme, ReaderPalette> = {
  ...readerThemes,
};

export const fontFamilies: Record<ReaderFont, string> = { serif: "Georgia", sans: "System", dyslexic: "Verdana" };
export const marginSizes: Record<ReaderMargin, number> = { small: 18, medium: 30, large: 46 };
export interface ReaderPalette {
  background: string;
  text: string;
  secondaryText: string;
  separator: string;
  accent: string;
  panel: string;
}
