import { router } from "expo-router";
import { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { IconButton } from "./Button";
import { AppText } from "./Text";
import { layout, space } from "./tokens";

export interface ScreenProps {
  /** `false` quando a tela tem sua própria lista virtualizada (FlatList). */
  scroll?: boolean;
  /** Largura máxima do conteúdo: listas/formulários (`narrow`) ou grades (`content`). */
  width?: "narrow" | "content";
  /** Tela dentro das abas: a barra de abas já cuida do inset inferior. */
  inTabs?: boolean;
  header?: ReactNode;
}

/** Moldura padrão das telas fora do Reader: área segura, margens e largura máxima. */
export function Screen({ scroll = true, width = "narrow", inTabs = false, header, children }: PropsWithChildren<ScreenProps>) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const gutter = layout.gutter(windowWidth);
  const frame = {
    width: "100%" as const,
    maxWidth: layout[width] + gutter * 2,
    alignSelf: "center" as const,
    paddingHorizontal: gutter,
  };
  const top = Math.max(insets.top, space.lg);
  const bottom = inTabs ? space.xxl : Math.max(insets.bottom, space.xxl);
  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: palette.background, paddingTop: top }]}>
        <View style={frame}>{header}</View>
        <View style={[styles.fill, frame]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[styles.fill, { backgroundColor: palette.background }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[frame, { paddingTop: top, paddingBottom: bottom, gap: space.xxl }]}>
        {header}
        {children}
      </ScrollView>
    </View>
  );
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Mostra "voltar"; usa o histórico ou cai em `fallbackHref`. */
  back?: boolean;
  backLabel?: string;
  fallbackHref?: string;
  /** Ações à direita (IconButton/Button). Mantenha no máximo duas. */
  actions?: ReactNode;
  /** Título grande (`display`) só nas raízes das abas. */
  large?: boolean;
}

export function ScreenHeader({ title, subtitle, back = false, backLabel = "Voltar", fallbackHref = "/library", actions, large = false }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {back ? (
        <IconButton
          icon="arrow-back"
          label={backLabel}
          onPress={() => (router.canGoBack() ? router.back() : router.replace(fallbackHref as never))}
          style={styles.back}
        />
      ) : null}
      <View style={styles.titles}>
        <AppText variant={large ? "display" : "title"}>{title}</AppText>
        {subtitle ? <AppText variant="bodySmall" tone="secondary">{subtitle}</AppText> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

/** Seção com título serifado e conteúdo. */
export function Section({ title, action, children }: PropsWithChildren<{ title?: string; action?: ReactNode }>) {
  return (
    <View style={styles.section}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? <AppText variant="heading" style={styles.titles}>{title}</AppText> : <View style={styles.titles} />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48 },
  back: { marginLeft: -space.md + 2 },
  titles: { flex: 1, minWidth: 0, gap: space.xxs },
  actions: { flexDirection: "row", alignItems: "center", gap: space.xs },
  section: { gap: space.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
