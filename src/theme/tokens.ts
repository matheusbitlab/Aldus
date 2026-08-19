import { ReaderFont, ReaderMargin, ReaderTheme } from "@/src/domain/types/reader";

export const readerThemes = {
  light: { background: "#F7F4EE", text: "#1F2D2B", secondaryText: "#68716D", separator: "#DDD8CF", accent: "#D97757", panel: "#FFFDF9" },
  dark: { background: "#151918", text: "#E8E6DD", secondaryText: "#9DA7A1", separator: "#343B38", accent: "#E59A76", panel: "#202725" },
  sepia: { background: "#F3E5C8", text: "#57463A", secondaryText: "#8A7561", separator: "#D7C5A6", accent: "#B65F42", panel: "#F9EED9" }
} as const;

export const fontFamilies: Record<ReaderFont, string> = { serif: "Georgia", sans: "System", dyslexic: "Verdana" };
export const marginSizes: Record<ReaderMargin, number> = { small: 18, medium: 30, large: 46 };
export type ReaderPalette = (typeof readerThemes)[ReaderTheme];
