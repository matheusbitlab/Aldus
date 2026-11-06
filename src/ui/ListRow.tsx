import { Ionicons } from "@expo/vector-icons";
import { Children, Fragment, PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AppText } from "./Text";
import type { IconName } from "./Button";
import { radius, space, touchTarget } from "./tokens";

export interface ListRowProps {
  title: string;
  description?: string;
  icon?: IconName;
  /** Conteúdo à direita (valor, switch, badge). Sem ele e com onPress, mostra chevron. */
  trailing?: ReactNode;
  onPress?(): void;
  destructive?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Linha de lista/configuração. Com `onPress` vira botão; sem, é informativa. */
export function ListRow({ title, description, icon, trailing, onPress, destructive = false, disabled = false, accessibilityHint }: ListRowProps) {
  const { palette } = useAppTheme();
  const ink = destructive ? palette.danger : palette.text;
  const body = (
    <>
      {icon ? <Ionicons name={icon} size={21} color={destructive ? palette.danger : palette.accent} /> : null}
      <View style={styles.text}>
        <AppText variant="body" style={{ color: ink, fontWeight: "500" }}>{title}</AppText>
        {description ? <AppText variant="caption" tone="secondary">{description}</AppText> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={17} color={palette.secondaryText} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint ?? description}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: palette.surfaceSecondary }}
      style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

/** Grupo de linhas com título discreto e separadores finos. */
export function ListGroup({ title, footer, children }: PropsWithChildren<{ title?: string; footer?: string }>) {
  const { palette } = useAppTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <AppText variant="overline" tone="secondary" accessibilityRole="header" style={styles.groupTitle}>{title}</AppText> : null}
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: palette.separator }]} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? <AppText variant="caption" tone="secondary" style={styles.groupTitle}>{footer}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + 8,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md + 1,
  },
  text: { flex: 1, gap: space.xxs },
  group: { gap: space.sm },
  groupTitle: { marginHorizontal: space.xs },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
});
