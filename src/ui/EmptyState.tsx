import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AppText } from "./Text";
import type { IconName } from "./Button";
import { space } from "./tokens";

/** Estado vazio: ícone discreto, frase curta, uma ação principal (children). */
export function EmptyState({ icon, title, description, children }: PropsWithChildren<{ icon?: IconName; title: string; description?: string }>) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={[styles.badge, { backgroundColor: palette.accentSoft }]}>
          <Ionicons name={icon} size={26} color={palette.accent} />
        </View>
      ) : null}
      <AppText variant="heading" align="center">{title}</AppText>
      {description ? <AppText variant="bodySmall" tone="secondary" align="center" style={styles.description}>{description}</AppText> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: space.section, paddingHorizontal: space.lg, gap: space.sm },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
  description: { maxWidth: 420 },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm, marginTop: space.md },
});
