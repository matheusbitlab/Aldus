import { useState } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SettingsLayout, SettingsGroup } from '@/src/presentation/components/SettingsLayout';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { getAppMetadata } from '@/src/legal/appMetadata';
import { legalIdentity } from '@/src/legal/legalConfig';
import { feedbackCategories, feedbackMailto, FeedbackCategory } from '@/src/legal/betaFeedback';

export default function SupportScreen() {
  const { palette } = useAppTheme(), metadata = getAppMetadata();
  const [category, setCategory] = useState<FeedbackCategory>('Outro');
  const [description, setDescription] = useState(''), [reproduction, setReproduction] = useState(''), [error, setError] = useState('');
  const uri = feedbackMailto({ contact: legalIdentity.contactEmail, ...metadata, platform: Platform.OS, category, description, reproduction });
  const inputStyle = { color: palette.text, borderColor: palette.secondaryText, borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 110, textAlignVertical: 'top' as const };
  const openDraft = async () => {
    if (!uri) return;
    setError('');
    try { await Linking.openURL(uri); }
    catch { setError('Não foi possível abrir seu aplicativo de e-mail. Use o contato abaixo para enviar o relato.'); }
  };
  return <SettingsLayout title="Ajuda e feedback">
    <Text style={{ color: palette.secondaryText }}>Versão {metadata.version} · build {metadata.build} · {Platform.OS}</Text>
    <Text style={{ color: palette.text }}>Conte o que aconteceu e como repetir. Nenhum livro, anexo, log ou dado da conta é coletado automaticamente. Você revisa e envia o e-mail no seu aplicativo.</Text>
    <SettingsGroup title="Tipo de problema"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }}>{feedbackCategories.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: category === value }} accessibilityLabel={value} onPress={() => setCategory(value)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: category === value ? palette.accent : palette.background }}><Text style={{ color: category === value ? '#fff' : palette.text }}>{value}</Text></Pressable>)}</View></SettingsGroup>
    <View style={{ gap: 7 }}><Text style={{ color: palette.text }}>O que aconteceu?</Text><TextInput accessibilityLabel="Descrição do problema" multiline maxLength={4000} value={description} onChangeText={setDescription} style={inputStyle} /></View>
    <View style={{ gap: 7 }}><Text style={{ color: palette.text }}>Como reproduzir? (opcional)</Text><TextInput accessibilityLabel="Como reproduzir o problema" multiline maxLength={4000} value={reproduction} onChangeText={setReproduction} style={inputStyle} /></View>
    <Text style={{ color: palette.secondaryText }}>Não informe senhas, códigos de confirmação, links privados ou conteúdo dos livros.</Text>
    {legalIdentity.contactEmail ? <Text selectable style={{ color: palette.text }}>Contato: {legalIdentity.contactEmail}</Text> : <Text style={{ color: palette.secondaryText }}>O responsável ainda precisa configurar o contato de suporte antes de distribuir o beta.</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel="Preparar e-mail de feedback" accessibilityState={{ disabled: !uri }} disabled={!uri} onPress={openDraft} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: palette.accent, opacity: uri ? 1 : 0.45 }}><Text style={{ color: '#fff', fontWeight: '600' }}>Preparar e-mail</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{error}</Text> : null}
    <Text style={{ color: palette.secondaryText }}>Os flashcards, catálogos conectados, capas locais, preferências e caches de OCR permanecem neste dispositivo. A sincronização da biblioteca contempla livros e seus dados de leitura e organização.</Text>
  </SettingsLayout>;
}
