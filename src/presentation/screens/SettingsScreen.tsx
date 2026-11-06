import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../contexts/AppThemeContext';
import { ReaderSettingsPanel } from '../components/ReaderSettingsPanel';
import { SettingsGroup, SettingsLayout, SettingsLink } from '../components/SettingsLayout';
import { AdminEntry } from '@/src/admin/presentation/AdminEntry';
import { getAppMetadata } from '@/src/legal/appMetadata';
import { AppText, ListRow, radius, space } from '@/src/ui';

/** Iniciais para o avatar: só do nome informado; sem nome, um marcador neutro. */
function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'A';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toLocaleUpperCase('pt-BR');
}

/** Aba Conta: perfil no topo e ajustes agrupados por intenção. */
export default function SettingsScreen() {
  const { profile, user } = useAuth(), { palette } = useAppTheme();
  const [readerVisible, setReaderVisible] = useState(false), metadata = getAppMetadata();
  const go = (path: string) => router.push(path as never);
  const name = profile?.display_name || 'Leitor';
  return <><SettingsLayout title="Conta" back={false}>
    <View style={[styles.profile, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}>
        <AppText variant="heading" tone="accent">{initials(profile?.display_name)}</AppText>
      </View>
      <View style={styles.profileText}>
        <AppText variant="subheading" numberOfLines={1}>{name}</AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>{profile?.username ? `@${profile.username}` : user ? 'Sua conta Aldus' : 'Leitura no dispositivo'}</AppText>
      </View>
    </View>
    <SettingsGroup title="Conta e plano">
      <SettingsLink title="Minha conta" description="Perfil, e-mail e senha" icon="person-circle-outline" onPress={() => go('/account')} />
      <SettingsLink title="Meu Plano" description="Recursos e franquias" icon="layers-outline" onPress={() => go('/plan')} />
      <SettingsLink title="Sincronização" description="Biblioteca entre dispositivos" icon="cloud-outline" onPress={() => go('/preferences?section=sync')} />
    </SettingsGroup>
    <SettingsGroup title="Leitura e aparência">
      <SettingsLink title="Preferências do leitor" description="Fonte, margens e tema do livro" icon="book-outline" onPress={() => setReaderVisible(true)} />
      <SettingsLink title="Tema do aplicativo" description="Claro, escuro ou do sistema" icon="color-palette-outline" onPress={() => go('/preferences?section=appearance')} />
      <SettingsLink title="Conforto durante a leitura" icon="leaf-outline" onPress={() => go('/preferences?section=comfort')} />
    </SettingsGroup>
    <SettingsGroup title="Fontes de livros">
      <SettingsLink title="Minhas bibliotecas" description="Google Drive e bibliotecas por link" icon="albums-outline" onPress={() => go('/sources')} />
      <SettingsLink title="Serviços de leitura" description="BibliON e MEC Livros" icon="library-outline" onPress={() => go('/preferences?section=services')} />
    </SettingsGroup>
    <SettingsGroup title="Comunidade"><SettingsLink title="Comunidade literária" icon="people-outline" onPress={() => go('/community')} /></SettingsGroup>
    <SettingsGroup title="Privacidade e informações">
      <SettingsLink title="Ajuda e feedback" icon="chatbubble-ellipses-outline" onPress={() => go('/support')} />
      <SettingsLink title="Privacidade e Dados" description="Exportar ou apagar seus dados" icon="shield-checkmark-outline" onPress={() => go('/legal/data')} />
      <SettingsLink title="Legal e informações" description="Sobre o Aldus, termos, privacidade e licenças." icon="information-circle-outline" onPress={() => go('/legal')} />
    </SettingsGroup>
    <AdminEntry compact />
    <ListRow title={`Versão ${metadata.version} · build ${metadata.build}`} icon="pricetag-outline" onPress={() => go('/legal/version')} />
  </SettingsLayout><ReaderSettingsPanel visible={readerVisible} panelMode="appearance" onClose={() => setReaderVisible(false)} /></>;
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileText: { flex: 1, minWidth: 0, gap: space.xxs },
});
