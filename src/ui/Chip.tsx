import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { PropsWithChildren } from "react";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AppText } from "./Text";
import type { IconName } from "./Button";
import { radius, space, touchTarget } from "./tokens";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress(): void;
  icon?: IconName;
  disabled?: boolean;
  /** Texto extra para leitores de tela (ex.: "indisponível"). */
  accessibilityHint?: string;
}

/** Filtro/alternância compacta. Seleção indicada por cor E por ícone (não só cor). */
export function Chip({ label, selected = false, onPress, icon, disabled = false, accessibilityHint }: ChipProps) {
  const { palette } = useAppTheme();
  const ink = selected ? palette.accent : palette.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? palette.accentSoft : palette.surface,
          borderColor: selected ? palette.accent : palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {selected ? <Ionicons name="checkmark" size={15} color={ink} /> : icon ? <Ionicons name={icon} size={15} color={ink} /> : null}
      <AppText variant="label" style={{ color: ink }} numberOfLines={1}>{label}</AppText>
    </Pressable>
  );
}

/** Linha de chips com rolagem horizontal (não quebra layout em telas estreitas). */
export function ChipRow({ children, label }: PropsWithChildren<{ label?: string }>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={label}
      contentContainerStyle={styles.row}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget - 8,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
  },
  row: { gap: space.sm, paddingVertical: space.xs, alignItems: "center" },
});
