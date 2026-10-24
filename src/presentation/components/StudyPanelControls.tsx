import { useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { HighlightColor } from "@/src/domain/repositories/HighlightRepository";

export const studyColorNames: Record<HighlightColor, string> = { yellow: "Amarelo", green: "Verde", blue: "Azul", pink: "Rosa", purple: "Roxo" };
export const studyColorSwatches: Record<HighlightColor, string> = { yellow: "#F2D66F", green: "#A6D8AF", blue: "#A5CEEF", pink: "#F0B7CE", purple: "#C7B6E6" };

export function StudyAction({ label, onPress, disabled = false, primary = false, danger = false, icon }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const { palette } = useAppTheme();
  const color = primary ? palette.panel : danger ? "#B44343" : palette.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { borderColor: primary ? palette.text : palette.separator, backgroundColor: primary ? palette.text : "transparent", opacity: disabled ? .45 : pressed ? .7 : 1 }]}>
    {icon ? <Ionicons name={icon} size={18} color={color} /> : null}<Text style={{ color, fontSize: 14, fontWeight: "600", flexShrink: 1 }}>{label}</Text>
  </Pressable>;
}

export function StudyDisclosure({ title, children }: { title: string; children: ReactNode }) {
  const { palette } = useAppTheme(); const [open, setOpen] = useState(false);
  return <View style={{ borderTopWidth: 1, borderColor: palette.separator, paddingTop: 8, marginTop: 8 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)} style={styles.disclosure}>
      <Text style={{ color: palette.secondaryText, fontSize: 14, flex: 1 }}>{title}</Text><Ionicons name={open ? "chevron-up" : "chevron-down"} size={17} color={palette.secondaryText} />
    </Pressable>
    {open ? <View style={{ gap: 12, paddingVertical: 8 }}>{children}</View> : null}
  </View>;
}

export function StudyQuote({ text, color }: { text: string; color?: HighlightColor }) {
  const { palette } = useAppTheme();
  return <View style={{ borderLeftWidth: 4, borderLeftColor: color ? studyColorSwatches[color] : palette.accent, padding: 14, borderRadius: 8, backgroundColor: palette.surfaceSecondary }}><Text numberOfLines={5} style={{ color: palette.text, fontSize: 16, lineHeight: 24 }}>{text}</Text></View>;
}
const styles = StyleSheet.create({ action: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, disclosure: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 10 } });
