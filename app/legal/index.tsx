import { router } from 'expo-router';
import { SettingsGroup, SettingsLayout, SettingsLink } from '@/src/presentation/components/SettingsLayout';

export default function LegalIndex() {
  return <SettingsLayout title="Legal e informações"><SettingsGroup title="Aldus Reader">
    <SettingsLink title="Sobre o Aldus Reader" icon="information-circle-outline" onPress={() => router.push('/legal/about' as never)} />
    <SettingsLink title="Política de Privacidade" icon="shield-checkmark-outline" onPress={() => router.push('/legal/privacy' as never)} />
    <SettingsLink title="Termos de Uso" icon="document-text-outline" onPress={() => router.push('/legal/terms' as never)} />
    <SettingsLink title="Direitos Autorais e Conteúdo" icon="book-outline" onPress={() => router.push('/legal/copyright' as never)} />
    <SettingsLink title="Licenças de terceiros" icon="code-slash-outline" onPress={() => router.push('/legal/licenses' as never)} />
  </SettingsGroup></SettingsLayout>;
}
