import { Text as RNText, TextProps as RNTextProps } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { headingRoles, TextRole, typography } from "./tokens";

export type TextTone = "default" | "secondary" | "accent" | "danger" | "success" | "onAccent";

export interface AppTextProps extends RNTextProps {
  /** Papel tipográfico; define tamanho, peso, família e se é cabeçalho. */
  variant?: TextRole;
  tone?: TextTone;
  align?: "left" | "center" | "right";
}

/** Texto do app. Use sempre um `variant` em vez de fontSize solto. */
export function AppText({ variant = "body", tone = "default", align, style, accessibilityRole, ...rest }: AppTextProps) {
  const { palette } = useAppTheme();
  const color = {
    default: palette.text,
    secondary: palette.secondaryText,
    accent: palette.accent,
    danger: palette.danger,
    success: palette.success,
    onAccent: palette.onAccent,
  }[tone];
  return (
    <RNText
      accessibilityRole={accessibilityRole ?? (headingRoles.has(variant) ? "header" : undefined)}
      style={[typography[variant], { color }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
