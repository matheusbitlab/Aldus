import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AppText } from "./Text";
import { radius, space, touchTarget } from "./tokens";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  label: string;
  onPress(): void;
  variant?: ButtonVariant;
  icon?: IconName;
  /** Ícone depois do texto (ex.: seta). */
  trailingIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Ocupa toda a largura disponível. */
  block?: boolean;
  accessibilityHint?: string;
  /** Nome acessível quando o texto visível é curto demais (ex.: "Renomear" → "Renomear coleção X"). */
  accessibilityLabel?: string;
  expanded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botão único do app. Hierarquia: no máximo um `primary` por tela/área;
 * `secondary` para ações frequentes; `ghost` para ações de texto; `danger` para destrutivas.
 */
export function Button({
  label, onPress, variant = "secondary", icon, trailingIcon, disabled = false, loading = false,
  block = false, accessibilityHint, accessibilityLabel, expanded, style,
}: ButtonProps) {
  const { palette } = useAppTheme();
  const inactive = disabled || loading;
  const look = {
    primary: { background: palette.accent, ink: palette.onAccent, border: palette.accent },
    secondary: { background: palette.surface, ink: palette.text, border: palette.border },
    ghost: { background: "transparent", ink: palette.accent, border: "transparent" },
    danger: { background: palette.danger, ink: palette.onDanger, border: palette.danger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading, expanded }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: palette.separator }}
      style={({ pressed }) => [
        styles.base,
        variant === "ghost" ? styles.ghost : null,
        { backgroundColor: look.background, borderColor: look.border, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        block ? styles.block : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={look.ink} /> : icon ? <Ionicons name={icon} size={18} color={look.ink} /> : null}
      <AppText variant="label" style={{ color: look.ink, flexShrink: 1 }} numberOfLines={2}>{label}</AppText>
      {trailingIcon ? <Ionicons name={trailingIcon} size={18} color={look.ink} /> : null}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  /** Obrigatório: botão só com ícone precisa de nome acessível. */
  label: string;
  onPress(): void;
  /** `filled` = destaque (accent); `tonal` = fundo suave; `plain` = só ícone. */
  appearance?: "plain" | "tonal" | "filled";
  disabled?: boolean;
  selected?: boolean;
  expanded?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, label, onPress, appearance = "plain", disabled = false, selected, expanded, size = 22, style }: IconButtonProps) {
  const { palette } = useAppTheme();
  const background = appearance === "filled" ? palette.accent : appearance === "tonal" ? palette.surfaceSecondary : "transparent";
  const ink = appearance === "filled" ? palette.onAccent : selected ? palette.accent : palette.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected, expanded }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      android_ripple={{ color: palette.separator, borderless: appearance === "plain" }}
      style={({ pressed }) => [styles.icon, { backgroundColor: background, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}
    >
      <View pointerEvents="none"><Ionicons name={icon} size={size} color={ink} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: space.sm,
  },
  ghost: { paddingHorizontal: space.sm },
  block: { alignSelf: "stretch" },
  icon: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
