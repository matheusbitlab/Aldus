import { PropsWithChildren, createContext, useContext, useState } from "react";
import { ReaderFont, ReaderMargin, ReaderTheme } from "@/src/domain/types/reader";
import { fontFamilies, marginSizes, readerThemes, ReaderPalette } from "@/src/theme/tokens";

interface ReaderSettingsValue { theme: ReaderTheme; font: ReaderFont; fontSize: number; margin: ReaderMargin; palette: ReaderPalette; fontFamily: string; marginSize: number; setTheme: (value: ReaderTheme) => void; setFont: (value: ReaderFont) => void; setFontSize: (value: number) => void; setMargin: (value: ReaderMargin) => void; }
const ReaderSettingsContext = createContext<ReaderSettingsValue | null>(null);

export function ReaderSettingsProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ReaderTheme>("sepia");
  const [font, setFont] = useState<ReaderFont>("serif");
  const [fontSize, setFontSize] = useState(19);
  const [margin, setMargin] = useState<ReaderMargin>("medium");
  return <ReaderSettingsContext.Provider value={{ theme, font, fontSize, margin, palette: readerThemes[theme], fontFamily: fontFamilies[font], marginSize: marginSizes[margin], setTheme, setFont, setFontSize, setMargin }}>{children}</ReaderSettingsContext.Provider>;
}

export function useReaderSettings() {
  const value = useContext(ReaderSettingsContext);
  if (!value) throw new Error("useReaderSettings must be used within ReaderSettingsProvider");
  return value;
}
