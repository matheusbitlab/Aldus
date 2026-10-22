import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { ReaderFont, ReaderMargin, ReaderTheme } from "@/src/domain/types/reader";
import { fontFamilies, marginSizes, readerThemes, ReaderPalette } from "@/src/theme/tokens";

interface ReaderSettingsValue {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;
  margin: ReaderMargin;
  lineHeight: number;
  paragraphSpacing: number;
  maxWidth: number;
  brightness: number;
  useSystemBrightness: boolean;
  hideReadingCounts: boolean;
  palette: ReaderPalette;
  fontFamily: string;
  marginSize: number;
  setTheme: (value: ReaderTheme) => void;
  setFont: (value: ReaderFont) => void;
  setFontSize: (value: number) => void;
  setMargin: (value: ReaderMargin) => void;
  setLineHeight: (value: number) => void;
  setParagraphSpacing: (value: number) => void;
  setMaxWidth: (value: number) => void;
  setBrightness: (value: number) => void;
  setUseSystemBrightness: (value: boolean) => void;
  setHideReadingCounts: (value: boolean) => void;
}

const READER_SETTINGS_STORAGE_KEY = "@kindle/reader-settings.v1";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ReaderSettingsContext = createContext<ReaderSettingsValue | null>(null);

export function ReaderSettingsProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ReaderTheme>("sepia");
  const [font, setFont] = useState<ReaderFont>("serif");
  const [fontSize, setFontSize] = useState(16);
  const [margin, setMargin] = useState<ReaderMargin>("medium");
  const [lineHeight, setLineHeight] = useState(1.65);
  const [paragraphSpacing, setParagraphSpacing] = useState(1);
  const [maxWidth, setMaxWidth] = useState(900);
  const [brightness, setBrightness] = useState(65);
  const [useSystemBrightness, setUseSystemBrightness] = useState(true);
  const [ready, setReady] = useState(false);
  const [hideReadingCounts, setHideReadingCounts] = useState(false);

  useEffect(() => {
    let disposed = false;

    void AsyncStorage.getItem(READER_SETTINGS_STORAGE_KEY).then((stored) => {
      if (disposed || !stored) {
        if (!disposed) setReady(true);
        return;
      }

      try {
        const parsed = JSON.parse(stored) as Partial<{
          theme: ReaderTheme;
          font: ReaderFont;
          fontSize: number;
          margin: ReaderMargin;
          lineHeight: number;
          paragraphSpacing: number;
          maxWidth: number;
          brightness: number;
          useSystemBrightness: boolean;
          hideReadingCounts: boolean;
        }>;

        if (parsed.theme && parsed.theme in readerThemes) setTheme(parsed.theme);
        if (parsed.font && parsed.font in fontFamilies) setFont(parsed.font);
        if (typeof parsed.fontSize === "number") setFontSize(clamp(parsed.fontSize, 12, 30));
        if (parsed.margin && parsed.margin in marginSizes) setMargin(parsed.margin);
        if (typeof parsed.lineHeight === "number") setLineHeight(clamp(parsed.lineHeight, 1.1, 2.2));
        if (typeof parsed.paragraphSpacing === "number") setParagraphSpacing(clamp(parsed.paragraphSpacing, 0.3, 2));
        if (typeof parsed.maxWidth === "number") setMaxWidth(clamp(parsed.maxWidth, 500, 1400));
        if (typeof parsed.brightness === "number") setBrightness(clamp(parsed.brightness, 20, 100));
        if (typeof parsed.useSystemBrightness === "boolean") setUseSystemBrightness(parsed.useSystemBrightness);
        if (typeof parsed.hideReadingCounts === "boolean") setHideReadingCounts(parsed.hideReadingCounts);
      } catch {
        // Ignore invalid persisted settings and keep defaults.
      } finally {
        if (!disposed) setReady(true);
      }
    }).catch(() => {
      if (!disposed) setReady(true);
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({
      theme,
      font,
      fontSize,
      margin,
      lineHeight,
      paragraphSpacing,
      maxWidth,
      brightness,
      useSystemBrightness,
      hideReadingCounts,
    })).catch(() => undefined);
  }, [brightness, font, fontSize, hideReadingCounts, lineHeight, margin, maxWidth, paragraphSpacing, ready, theme, useSystemBrightness]);

  const value = useMemo<ReaderSettingsValue>(() => ({
    theme,
    font,
    fontSize,
    margin,
    lineHeight,
    paragraphSpacing,
    maxWidth,
    brightness,
    useSystemBrightness,
    hideReadingCounts,
    palette: readerThemes[theme],
    fontFamily: fontFamilies[font],
    marginSize: marginSizes[margin],
    setTheme,
    setFont,
    setFontSize: (value) => setFontSize(clamp(value, 12, 30)),
    setMargin,
    setLineHeight: (value) => setLineHeight(clamp(value, 1.1, 2.2)),
    setParagraphSpacing: (value) => setParagraphSpacing(clamp(value, 0.3, 2)),
    setMaxWidth: (value) => setMaxWidth(clamp(value, 500, 1400)),
    setBrightness: (value) => setBrightness(clamp(value, 20, 100)),
    setUseSystemBrightness,
    setHideReadingCounts,
  }), [brightness, font, fontSize, hideReadingCounts, lineHeight, margin, maxWidth, paragraphSpacing, theme, useSystemBrightness]);

  return <ReaderSettingsContext.Provider value={value}>{children}</ReaderSettingsContext.Provider>;
}

export function useReaderSettings() {
  const value = useContext(ReaderSettingsContext);
  if (!value) throw new Error("useReaderSettings must be used within ReaderSettingsProvider");
  return value;
}
