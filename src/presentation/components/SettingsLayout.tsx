import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../contexts/AppThemeContext';

export function SettingsLayout({ title, children, back = true }: PropsWithChildren<{ title: string; back?: boolean }>) {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ width: '100%', maxWidth: 680, alignSelf: 'center', padding: 20, paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 30), gap: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {back ? <Pressable accessibilityRole="button" accessibilityLabel="Voltar aos Ajustes" onPress={() => router.canGoBack() ? router.back() : router.replace('/settings' as never)} style={styles.back}><Ionicons name="arrow-back" size={22} color={palette.text} /></Pressable> : null}
        <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 28, fontWeight: '700', flexShrink: 1 }}>{title}</Text>
      </View>
      {children}
    </ScrollView>
  </View>;
}
export function SettingsGroup({ title, children }: PropsWithChildren<{ title: string }>) {
  const { palette } = useAppTheme();
  return <View style={{ gap: 7 }}><Text accessibilityRole="header" style={{ color: palette.secondaryText, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>{title}</Text><View style={{ backgroundColor: palette.surface, borderRadius: 14, paddingHorizontal: 12 }}>{children}</View></View>;
}
export function SettingsLink({ title, description, icon, onPress }: { title: string; description?: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  const { palette } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={description} onPress={onPress} android_ripple={{ color: palette.surfaceSecondary }} style={styles.row}>
    <Ionicons name={icon} size={21} color={palette.accent} />
    <View style={{ flex: 1, gap: 3 }}><Text style={{ color: palette.text, fontSize: 15, fontWeight: '500' }}>{title}</Text>{description ? <Text style={{ color: palette.secondaryText, fontSize: 12, lineHeight: 17 }}>{description}</Text> : null}</View>
    <Ionicons name="chevron-forward" size={17} color={palette.secondaryText} />
  </Pressable>;
}
const styles = StyleSheet.create({ row: { minHeight: 54, paddingVertical: 13, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 13 }, back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' } });
