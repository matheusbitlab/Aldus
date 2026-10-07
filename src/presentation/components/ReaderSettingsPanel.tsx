import { MotionCuesControl } from "./MotionCuesControl";
import Slider from "@react-native-community/slider";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReaderSettings } from "@/src/presentation/contexts/ReaderSettingsContext";
import { PdfReaderSettings, PdfReadingMode } from "@/src/domain/types/pdfReader";
import { pdfReaderThemes } from "@/src/theme/tokens";
import { PdfReaderTheme } from "@/src/domain/types/pdfReader";

interface Props {
  visible: boolean;
  panelMode: "appearance" | "contents" | "search";
  onClose: () => void;
  pdfMode?: PdfReadingMode;
  pdfSettings?: PdfReaderSettings | null;
  onPdfModeChange?: (mode: PdfReadingMode) => void;
  onPdfSettingsChange?: (settings: PdfReaderSettings) => void;
  onToggleFullscreen?: () => void;
  pageNumber?: number;
  totalPages?: number;
  onGoToPage?: (pageNumber: number) => void;
  chapterItems?: Array<{ index: number; title: string }>;
  chapterIndex?: number;
  onSelectChapter?: (chapterIndex: number) => void;
  searchText?: string;
  onSearchTextChange?: (value: string) => void;
  onSearch?: () => void;
  searchResult?: boolean | null;
}

const themes = [
  { value: "light", label: "Claro" },
  { value: "paper", label: "Papel" },
  { value: "sepia", label: "Sépia" },
  { value: "dark", label: "Escuro" },
  { value: "black", label: "Preto" },
] as const;
const fonts = [
  { value: "serif", label: "Serifada" },
  { value: "sans", label: "Sem serifa" },
  { value: "dyslexic", label: "Disléxica" },
] as const;
export function ReaderSettingsPanel({
  visible,
  panelMode,
  onClose,
  pdfMode,
  pdfSettings,
  onPdfModeChange,
  onPdfSettingsChange,
  onToggleFullscreen,
  pageNumber,
  totalPages,
  onGoToPage,
  chapterItems,
  chapterIndex,
  onSelectChapter,
  searchText,
  onSearchTextChange,
  onSearch,
  searchResult,
}: Props) {
  const settings = useReaderSettings();
  const insets = useSafeAreaInsets();
  const [pageInput, setPageInput] = useState(String(pageNumber ?? 1));
  const palette = pdfSettings ? pdfReaderThemes[pdfSettings.theme] : settings.palette;
  const updatePdfSettings = (patch: Partial<PdfReaderSettings>) => {
    if (pdfSettings) onPdfSettingsChange?.({ ...pdfSettings, ...patch });
  };
  const isOriginalPdf = pdfSettings && pdfMode === "original";

  useEffect(() => {
    if (visible) setPageInput(String(pageNumber ?? 1));
  }, [pageNumber, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: palette.panel }]} onPress={(event) => event.stopPropagation()}>
          <ScrollView style={styles.panelScroll} contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />
          <Text style={[styles.title, { color: palette.text }]}>
            {panelMode === "contents" ? "Sumário" : panelMode === "search" ? "Buscar no livro" : pdfSettings ? "Aparência do PDF" : "Aparência"}
          </Text>
          {panelMode === "appearance" && pdfSettings && onPdfModeChange ? (
            <>
              <Text style={[styles.label, { color: palette.secondaryText }]}>MODO</Text>
              <View style={styles.row}>
                <ModeButton label="PDF Original" selected={pdfMode === "original"} onPress={() => onPdfModeChange("original")} palette={palette} />
                <ModeButton label="Leitura Livre" selected={pdfMode === "reflow"} onPress={() => onPdfModeChange("reflow")} palette={palette} />
              </View>
            </>
          ) : null}

          {panelMode === "contents" && chapterItems?.length && onSelectChapter ? (
            <View style={styles.chapterList}>
              {chapterItems.map(({ index, title }) => (
                <Pressable
                  accessibilityRole="button"
                  key={`${index}-${title}`}
                  onPress={() => onSelectChapter(index)}
                  style={[styles.chapterItem, { borderColor: index === chapterIndex ? palette.accent : palette.separator }]}
                >
                  <Text style={{ color: palette.text }} numberOfLines={2}>{title}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {panelMode === "search" ? (
            <>
              <View style={styles.row}>
                <TextInput
                  accessibilityLabel="Buscar no livro"
                  value={searchText ?? ""}
                  onChangeText={onSearchTextChange}
                  onSubmitEditing={onSearch}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: palette.text, borderColor: palette.separator }]}
                />
                <ActionButton label="Buscar" onPress={() => onSearch?.()} palette={palette} />
              </View>
              {searchResult !== null && searchResult !== undefined ? (
                <Text style={{ color: palette.secondaryText, fontSize: 12, marginTop: 6 }}>
                  {searchResult ? "Trecho encontrado" : "Nenhum resultado"}
                </Text>
              ) : null}
            </>
          ) : null}
          {panelMode === "appearance" ? (
            <>
              <Text style={[styles.label, { color: palette.secondaryText }]}>{Platform.OS === "web" ? "LUMINOSIDADE DA PÁGINA" : "BRILHO"}</Text>
              {Platform.OS === "web" ? (
                <View style={styles.row}>
                  <Slider
                    accessibilityLabel="Luminosidade da página"
                    style={styles.fontSlider}
                    minimumValue={20}
                    maximumValue={100}
                    step={1}
                    value={settings.brightness}
                    minimumTrackTintColor={palette.accent}
                    maximumTrackTintColor={palette.separator}
                    thumbTintColor={palette.accent}
                    onValueChange={settings.setBrightness}
                  />
                  <Text style={[styles.value, { color: palette.text }]}>{settings.brightness}%</Text>
                </View>
              ) : (
                <>
                  <View style={styles.inlineToggleRow}>
                    <Text style={{ color: palette.text, flex: 1 }}>Usar brilho do aparelho</Text>
                    <Switch value={settings.useSystemBrightness} onValueChange={settings.setUseSystemBrightness} thumbColor={settings.useSystemBrightness ? palette.accent : palette.panel} trackColor={{ false: palette.separator, true: palette.accent }} />
                  </View>
                  {!settings.useSystemBrightness ? (
                    <View style={styles.row}>
                      <Slider
                        accessibilityLabel="Brilho do leitor"
                        style={styles.fontSlider}
                        minimumValue={20}
                        maximumValue={100}
                        step={1}
                        value={settings.brightness}
                        minimumTrackTintColor={palette.accent}
                        maximumTrackTintColor={palette.separator}
                        thumbTintColor={palette.accent}
                        onValueChange={settings.setBrightness}
                      />
                      <Text style={[styles.value, { color: palette.text }]}>{settings.brightness}%</Text>
                    </View>
                  ) : null}
                </>
              )}
            </>
          ) : null}
          {panelMode === "appearance" && isOriginalPdf ? (
            <>
              <Text style={[styles.label, { color: palette.secondaryText }]}>ZOOM</Text>
              <View style={styles.row}>
                <ActionButton label="−" onPress={() => updatePdfSettings({ zoom: Math.max(0.5, pdfSettings.zoom - 0.25) })} palette={palette} />
                <Text style={[styles.value, { color: palette.text }]}>{Math.round(pdfSettings.zoom * 100)}%</Text>
                <ActionButton label="+" onPress={() => updatePdfSettings({ zoom: Math.min(4, pdfSettings.zoom + 0.25) })} palette={palette} />
              </View>
              <Text style={[styles.label, { color: palette.secondaryText }]}>AJUSTE</Text>
              <View style={styles.row}>
                <ModeButton label="Ajustar à página" selected={pdfSettings.fitMode === "page"} onPress={() => updatePdfSettings({ fitMode: "page", zoom: 1 })} palette={palette} />
                <ModeButton label="Ajustar à largura" selected={pdfSettings.fitMode === "width"} onPress={() => updatePdfSettings({ fitMode: "width", zoom: 1 })} palette={palette} />
              </View>
              <Text style={[styles.label, { color: palette.secondaryText }]}>PÁGINA</Text>
              <View style={styles.row}>
                <ModeButton label="Única" selected={pdfSettings.layout === "single"} onPress={() => updatePdfSettings({ layout: "single" })} palette={palette} />
                <ModeButton label="Dupla" selected={pdfSettings.layout === "double"} onPress={() => updatePdfSettings({ layout: "double", rotation: 0 })} palette={palette} />
                {pdfSettings.layout === "single" ? <ActionButton label={`Girar ${pdfSettings.rotation}°`} onPress={() => updatePdfSettings({ rotation: (pdfSettings.rotation + 90) % 360 })} palette={palette} /> : null}
              </View>
              {onGoToPage && totalPages ? (
                <>
                  <Text style={[styles.label, { color: palette.secondaryText }]}>IR PARA PÁGINA</Text>
                  <View style={styles.row}>
                    <TextInput
                      accessibilityLabel="Número da página"
                      keyboardType="number-pad"
                      value={pageInput}
                      onChangeText={setPageInput}
                      onSubmitEditing={() => submitPage(pageInput, totalPages, onGoToPage)}
                      style={[styles.pageInput, { color: palette.text, borderColor: palette.separator }]}
                    />
                    <ActionButton label={`Ir (1-${totalPages})`} onPress={() => submitPage(pageInput, totalPages, onGoToPage)} palette={palette} />
                  </View>
                </>
              ) : null}
              {onToggleFullscreen ? <ActionButton label="Tela cheia" onPress={onToggleFullscreen} palette={palette} /> : null}
            </>
          ) : null}

          {panelMode === "appearance" && !isOriginalPdf ? (
            <>
              <Text style={[styles.label, { color: palette.secondaryText }]}>TELA</Text>
              <View style={styles.inlineToggleRow}>
                <View style={styles.eReaderCopy}>
                  <Text style={{ color: palette.text, fontWeight: "600" }}>Modo e-reader</Text>
                  <Text style={{ color: palette.secondaryText, fontSize: 12 }}>Fundo Papel com texto de alto contraste</Text>
                </View>
                <Switch
                  accessibilityLabel="Modo e-reader"
                  value={(pdfSettings ? pdfSettings.theme : settings.theme) === "paper"}
                  onValueChange={(enabled) => {
                    const theme = enabled ? "paper" : "sepia";
                    if (pdfSettings) updatePdfSettings({ theme });
                    else settings.setTheme(theme);
                  }}
                  thumbColor={
                    (pdfSettings ? pdfSettings.theme : settings.theme) === "paper"
                      ? palette.accent
                      : palette.panel
                  }
                  trackColor={{ false: palette.separator, true: palette.accent }}
                />
              </View>
              <Text style={[styles.label, { color: palette.secondaryText }]}>TEMA</Text>
              <View style={styles.row}>{themes.map((theme) => <Pressable key={theme.value} onPress={() => pdfSettings ? updatePdfSettings({ theme: theme.value as PdfReaderTheme }) : settings.setTheme(theme.value)} style={[styles.option, { borderColor: (pdfSettings ? pdfSettings.theme : settings.theme) === theme.value ? palette.accent : palette.separator }]}><Text style={{ color: palette.text }}>{theme.label}</Text></Pressable>)}</View>

              <Text style={[styles.label, { color: palette.secondaryText }]}>FONTE</Text>
              <View style={styles.row}>{fonts.map((font) => <Pressable key={font.value} onPress={() => pdfSettings ? updatePdfSettings({ font: font.value }) : settings.setFont(font.value)} style={[styles.option, { borderColor: (pdfSettings ? pdfSettings.font : settings.font) === font.value ? palette.accent : palette.separator }]}><Text style={{ color: palette.text }}>{font.label}</Text></Pressable>)}</View>

              <Text style={[styles.label, { color: palette.secondaryText }]}>TAMANHO DA FONTE</Text>
              <View style={styles.fontScaleRow}>
                <Text style={[styles.fontScaleSmall, { color: palette.secondaryText }]}>A</Text>
                <Slider
                  accessibilityLabel="Tamanho da fonte"
                  style={styles.fontSlider}
                  minimumValue={14}
                  maximumValue={26}
                  step={1}
                  value={pdfSettings ? pdfSettings.fontSize : settings.fontSize}
                  minimumTrackTintColor={palette.accent}
                  maximumTrackTintColor={palette.separator}
                  thumbTintColor={palette.accent}
                  onValueChange={(value) => pdfSettings ? updatePdfSettings({ fontSize: value }) : settings.setFontSize(value)}
                />
                <Text style={[styles.fontScaleLarge, { color: palette.text }]}>A</Text>
              </View>

              <Text style={[styles.label, { color: palette.secondaryText }]}>ESPAÇAMENTO ENTRE LINHAS</Text>
              <SegmentedControl
                options={[{ label: "Pequeno", value: 1.2 }, { label: "Médio", value: 1.5 }, { label: "Grande", value: 1.8 }]}
                selectedValue={closestValue(pdfSettings ? pdfSettings.lineHeight : settings.lineHeight, [1.2, 1.5, 1.8])}
                palette={palette}
                onSelect={(value) => pdfSettings ? updatePdfSettings({ lineHeight: Number(value) }) : settings.setLineHeight(Number(value))}
              />

              <Text style={[styles.label, { color: palette.secondaryText }]}>ESPAÇO ENTRE PARÁGRAFOS</Text>
              <SegmentedControl
                options={[{ label: "Pequeno", value: 0.4 }, { label: "Médio", value: 0.8 }, { label: "Grande", value: 1.2 }]}
                selectedValue={closestValue(pdfSettings ? pdfSettings.paragraphSpacing : settings.paragraphSpacing, [0.4, 0.8, 1.2])}
                palette={palette}
                onSelect={(value) => pdfSettings ? updatePdfSettings({ paragraphSpacing: Number(value) }) : settings.setParagraphSpacing(Number(value))}
              />

              <Text style={[styles.label, { color: palette.secondaryText }]}>MARGENS E LARGURA</Text>
              <SegmentedControl
                options={[{ label: "Estreita", value: 0 }, { label: "Normal", value: 1 }, { label: "Larga", value: 2 }]}
                selectedValue={layoutPresetIndex(pdfSettings ? pdfSettings.margin : settings.marginSize, pdfSettings ? pdfSettings.maxWidth : settings.maxWidth)}
                palette={palette}
                onSelect={(value) => {
                  const index = Number(value);
                  if (pdfSettings) {
                    const presets = [{ margin: 40, maxWidth: 560 }, { margin: 24, maxWidth: 760 }, { margin: 12, maxWidth: 1200 }];
                    updatePdfSettings(presets[index]);
                  } else {
                    const presets = [
                      { margin: "large" as const, maxWidth: 600 },
                      { margin: "medium" as const, maxWidth: 900 },
                      { margin: "small" as const, maxWidth: 1200 },
                    ];
                    settings.setMargin(presets[index].margin);
                    settings.setMaxWidth(presets[index].maxWidth);
                  }
                }}
              />
              {pdfSettings ? <ModeButton label={pdfSettings.alignment === "justify" ? "Alinhamento: Justificado" : "Alinhamento: Esquerda"} selected={false} onPress={() => updatePdfSettings({ alignment: pdfSettings.alignment === "justify" ? "left" : "justify" })} palette={palette} /> : null}
            </>
          ) : null}
          {panelMode === "appearance" ? <MotionCuesControl color={palette.text} /> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 12, paddingBottom: 0 },
  panel: { width: "100%", maxWidth: 560, maxHeight: "90%", padding: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, alignSelf: "center" },
  panelScroll: { maxHeight: "100%" },
  panelContent: { padding: 24, paddingBottom: 40 },
  handle: { width: 42, height: 4, borderRadius: 3, backgroundColor: "#A7AAA2", alignSelf: "center", marginBottom: 22 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 26 },
  label: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700", marginTop: 18, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  inlineToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  eReaderCopy: { flex: 1, gap: 4 },
  option: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 13 },
  fontScaleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  fontScaleSmall: { fontSize: 14, fontWeight: "600" },
  fontScaleLarge: { fontSize: 24, fontWeight: "700" },
  fontSlider: { flex: 1, minWidth: 0, height: 38 },
  segmented: { flexDirection: "row", width: "100%", gap: 6 },
  segment: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderRadius: 9 },
  segmentText: { fontSize: 12, textAlign: "center", flexShrink: 1 },
  value: { minWidth: 52, textAlign: "center", fontSize: 14, fontWeight: "600" },
  pageInput: { minWidth: 88, height: 42, paddingHorizontal: 10, borderWidth: 1, borderRadius: 6 },
  searchInput: { flex: 1, minWidth: 120, height: 42, paddingHorizontal: 10, borderWidth: 1, borderRadius: 6 },
  chapterList: { gap: 8 },
  chapterItem: { paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 6 },
});

function submitPage(value: string, totalPages: number, onGoToPage: (pageNumber: number) => void): void {
  const page = Number(value);
  if (Number.isInteger(page) && page >= 1 && page <= totalPages) onGoToPage(page);
}

function closestValue(value: number, choices: number[]): number {
  return choices.reduce((closest, choice) =>
    Math.abs(choice - value) < Math.abs(closest - value) ? choice : closest
  );
}

function layoutPresetIndex(margin: number, maxWidth: number): number {
  if (margin >= 36 && maxWidth <= 700) return 0;
  if (margin <= 18 && maxWidth >= 1000) return 2;
  return 1;
}

function SegmentedControl({
  options,
  selectedValue,
  palette,
  onSelect,
}: {
  options: Array<{ label: string; value: number }>;
  selectedValue: number;
  palette: ReturnType<typeof useReaderSettings>["palette"];
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === selectedValue;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.segment, { backgroundColor: selected ? palette.accent : "transparent", borderColor: selected ? palette.accent : palette.separator }]}
          >
            <Text numberOfLines={1} style={[styles.segmentText, { color: selected ? "#FFF" : palette.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ModeButton({
  label,
  selected,
  onPress,
  palette,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useReaderSettings>["palette"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.option, { backgroundColor: selected ? palette.accent : "transparent", borderColor: selected ? palette.accent : palette.separator }]}
    >
      <Text style={{ color: selected ? "#FFF" : palette.text }}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  palette,
}: {
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof useReaderSettings>["palette"];
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.option, { borderColor: palette.separator }]}>
      <Text style={{ color: palette.text }}>{label}</Text>
    </Pressable>
  );
}
