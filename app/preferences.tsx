import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SettingsGroup, SettingsLayout, SettingsLink } from '@/src/presentation/components/SettingsLayout';
import { MotionCuesControl } from '@/src/presentation/components/MotionCuesControl';
import { LibrarySyncControls } from '@/src/presentation/components/LibrarySyncControls';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';

export default function PreferencesScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>(), { palette, mode, setMode } = useAppTheme();
  const title = section === 'sync' ? 'Sincronização' : section === 'comfort' ? 'Conforto durante a leitura' : section === 'services' ? 'Serviços de leitura' : 'Tema do aplicativo';
  return <SettingsLayout title={title}>
    {section === 'sync' ? <LibrarySyncControls /> : section === 'comfort' ? <MotionCuesControl color={palette.text} /> : section === 'services' ? <SettingsGroup title="Bibliotecas digitais">
      <SettingsLink title="BibliON" icon="library-outline" onPress={() => router.push('/services/biblion' as never)} />
      <SettingsLink title="MEC Livros" icon="school-outline" onPress={() => router.push('/services/mec' as never)} />
    </SettingsGroup> : <View style={{ gap: 12 }}><Text style={{ color: palette.secondaryText }}>A aparência do livro é independente.</Text>
      {([{ value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Escuro' }] as const).map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: mode === option.value }} onPress={() => void setMode(option.value)} style={{ minHeight: 56, borderRadius: 12, padding: 16, backgroundColor: palette.surface, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: palette.text }}>{option.label}</Text><Text style={{ color: palette.accent }}>{mode === option.value ? '✓' : '○'}</Text></Pressable>)}
    </View>}
  </SettingsLayout>;
}
