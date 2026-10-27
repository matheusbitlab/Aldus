import type { PropsWithChildren } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { appUi } from '@/src/theme/appUi';

/** Small shared vocabulary for app chrome. Reader document geometry stays independent. */
export function AppAction({ label, icon, onPress, primary = false, disabled = false, expanded }: {
  label: string; icon?: React.ComponentProps<typeof Ionicons>['name']; onPress(): void;
  primary?: boolean; disabled?: boolean; expanded?: boolean;
}) {
  const { palette } = useAppTheme();
  const ink = primary ? palette.background : palette.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled, expanded }} disabled={disabled} onPress={onPress}
    android_ripple={{ color: palette.separator }}
    style={[styles.action, { backgroundColor: primary ? palette.text : palette.surfaceSecondary, opacity: disabled ? .55 : 1 }]}>
    {icon ? <Ionicons name={icon} size={19} color={ink} /> : null}
    <Text style={{ color: ink, fontSize: 14, fontWeight: '600', flexShrink: 1 }}>{label}</Text>
  </Pressable>;
}

export function AppHeading({ title, description, children }: PropsWithChildren<{ title: string; description?: string }>) {
  const { palette } = useAppTheme();
  return <View style={styles.heading}>
    <View style={{ flex: 1, minWidth: 160, gap: 5 }}>
      <Text accessibilityRole="header" style={[appUi.title, { color: palette.text }]}>{title}</Text>
      {description ? <Text style={{ color: palette.secondaryText, fontSize: 14, lineHeight: 21 }}>{description}</Text> : null}
    </View>{children}
  </View>;
}

export function AppEmptyState({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  const { palette } = useAppTheme();
  return <View style={styles.empty}>
    <Text accessibilityRole="header" style={[appUi.sectionTitle, { color: palette.text }]}>{title}</Text>
    <Text style={{ color: palette.secondaryText, fontSize: 15, lineHeight: 23, maxWidth: 420, textAlign: 'center' }}>{description}</Text>
    {children ? <View style={styles.actions}>{children}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  action: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 18 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
});
