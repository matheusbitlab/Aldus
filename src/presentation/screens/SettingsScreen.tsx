import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/AppThemeContext';
import { ReaderSettingsPanel } from '../components/ReaderSettingsPanel';
import { SettingsGroup, SettingsLayout, SettingsLink } from '../components/SettingsLayout';
import { AdminEntry } from '@/src/admin/presentation/AdminEntry';
import { getAppMetadata } from '@/src/legal/appMetadata';

export default function SettingsScreen() {
  const { profile, user } = useAuth(), { palette } = useAppTheme();
  const [readerVisible, setReaderVisible] = useState(false), metadata = getAppMetadata();
  const go = (path: string) => router.push(path as never);
  return <><SettingsLayout title="Ajustes" back={false}>
    <View style={{ paddingHorizontal: 4, gap: 4 }}><Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{profile?.display_name || 'Leitor'}</Text><Text style={{ color: palette.secondaryText, fontSize: 13 }}>{profile?.username ? `@${profile.username}` : user ? 'Sua conta Aldus' : 'Leitura no dispositivo'}</Text></View>
    <SettingsGroup title="Conta e plano">
      <SettingsLink title="Minha conta" icon="person-circle-outline" onPress={() => go('/account')} />
      <SettingsLink title="Meu Plano" icon="layers-outline" onPress={() => go('/plan')} />
      <SettingsLink title="Sincronização" icon="cloud-outline" onPress={() => go('/preferences?section=sync')} />
    </SettingsGroup>
    <SettingsGroup title="Leitura e aparência">
      <SettingsLink title="Preferências do leitor" icon="book-outline" onPress={() => setReaderVisible(true)} />
      <SettingsLink title="Tema do aplicativo" icon="color-palette-outline" onPress={() => go('/preferences?section=appearance')} />
      <SettingsLink title="Conforto durante a leitura" icon="leaf-outline" onPress={() => go('/preferences?section=comfort')} />
    </SettingsGroup>
    <SettingsGroup title="Biblioteca e serviços">
      <SettingsLink title="Minhas bibliotecas" icon="albums-outline" onPress={() => go('/sources')} />
      <SettingsLink title="Serviços de leitura" description="BibliON e MEC Livros" icon="library-outline" onPress={() => go('/preferences?section=services')} />
    </SettingsGroup>
    <SettingsGroup title="Comunidade"><SettingsLink title="Comunidade literária" icon="people-outline" onPress={() => go('/community')} /></SettingsGroup>
    <SettingsGroup title="Privacidade e informações">
      <SettingsLink title="Privacidade e Dados" icon="shield-checkmark-outline" onPress={() => go('/legal/data')} />
      <SettingsLink title="Legal e informações" description="Sobre o Aldus, termos, privacidade e licenças." icon="information-circle-outline" onPress={() => go('/legal')} />
    </SettingsGroup>
    <AdminEntry compact />
    <SettingsLink title={`Versão ${metadata.version} · build ${metadata.build}`} icon="pricetag-outline" onPress={() => go('/legal/version')} />
  </SettingsLayout><ReaderSettingsPanel visible={readerVisible} panelMode="appearance" onClose={() => setReaderVisible(false)} /></>;
}
