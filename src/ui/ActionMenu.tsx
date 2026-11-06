import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AppText } from "./Text";
import { Button, IconName } from "./Button";
import { elevation, layout, radius, space, touchTarget } from "./tokens";

export interface ActionMenuItem {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  onPress(): void;
  disabled?: boolean;
}

export interface ActionMenuProps {
  visible: boolean;
  title: string;
  items: ActionMenuItem[];
  onClose(): void;
}

/**
 * Menu de ações (ex.: o "+" da Biblioteca). Folha inferior no celular, cartão central no
 * desktop. Fecha antes de executar a ação para não empilhar modais.
 */
export function ActionMenu({ visible, title, items, onClose }: ActionMenuProps) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= layout.sidebarBreakpoint;
  return (
    <Modal visible={visible} transparent animationType={wide ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={[styles.root, wide ? styles.rootWide : null]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]} onPress={onClose} />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            wide ? styles.sheetWide : { paddingBottom: Math.max(insets.bottom, space.lg) },
            { backgroundColor: palette.panel, borderColor: palette.border },
            elevation.floating,
          ]}
        >
          <AppText variant="heading" style={styles.title}>{title}</AppText>
          {items.map(item => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={item.description}
              accessibilityState={{ disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => { onClose(); item.onPress(); }}
              android_ripple={{ color: palette.surfaceSecondary }}
              style={[styles.item, { opacity: item.disabled ? 0.5 : 1 }]}
            >
              <View style={[styles.icon, { backgroundColor: palette.accentSoft }]}>
                <Ionicons name={item.icon} size={20} color={palette.accent} />
              </View>
              <View style={styles.text}>
                <AppText variant="body" style={{ fontWeight: "600" }}>{item.label}</AppText>
                {item.description ? <AppText variant="caption" tone="secondary">{item.description}</AppText> : null}
              </View>
            </Pressable>
          ))}
          <Button label="Cancelar" variant="ghost" onPress={onClose} style={styles.cancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  rootWide: { justifyContent: "center", alignItems: "center", padding: space.xxl },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.xl,
    paddingHorizontal: space.sm,
    gap: space.xxs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetWide: { width: "100%", maxWidth: 440, borderRadius: radius.xl, paddingBottom: space.md },
  title: { marginHorizontal: space.md, marginBottom: space.sm },
  item: {
    minHeight: touchTarget + 12,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
  },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: space.xxs },
  cancel: { alignSelf: "center", marginTop: space.xs },
});
