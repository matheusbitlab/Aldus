import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSourceStore } from '@/src/presentation/stores/sourceStore';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { SourceManagerModal, SourceManagerAction } from '@/src/presentation/components/SourceManagerModal';
import { SourceSummaryRow } from '@/src/presentation/components/SourceSummaryRow';
import { sourceVisibleInAccount, useSourceAccountGeneration, useSourceAccountId } from '@/src/presentation/components/sourcePresentation';
import { googleDrive } from '@/src/data/drive/driveDependencies';

export default function Sources() {
  const accountId = useSourceAccountId(), generation = useSourceAccountGeneration();
  return <SourceList key={`${accountId}:${generation}`} accountId={accountId} />;
}
function SourceList({ accountId }: { accountId: string | null }) {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets();
  const { sources, legacySources, load, loadError, adoptLegacy } = useSourceStore();
  const [manager, setManager] = useState<{ sourceId: string | null; action: SourceManagerAction; initialKind?: 'google-drive' | 'json' } | null>(null);
  const [loading, setLoading] = useState(true), [review, setReview] = useState(false), [adopting, setAdopting] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; void load().finally(() => { if (alive.current) setLoading(false); }); return () => { alive.current = false; }; }, [load]);
  const current = sources.filter(source => sourceVisibleInAccount(source, accountId));
  const drive = current.find(source => source.kind === 'google-drive');
  const legacy = legacySources.filter(source => !source.ownerId && !current.some(item => item.id === source.id));
  const manage = (sourceId: string, action: SourceManagerAction = 'manage') => setManager({ sourceId, action });
  const adopt = () => {
    if (!adopting || busy) return;
    setBusy(true); setError(null);
    void adoptLegacy(adopting).then(() => { if (alive.current) setAdopting(null); }).catch(() => { if (alive.current) setError('Não foi possível vincular esta biblioteca. Os dados foram preservados. Tente novamente.'); }).finally(() => { if (alive.current) setBusy(false); });
  };
  const header = <View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Voltar aos ajustes" onPress={() => router.back()} style={styles.back}><Text style={{ color: palette.accent }}>← Voltar</Text></Pressable>
    <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>Minhas bibliotecas</Text>
    <Text style={[styles.lead, { color: palette.secondaryText }]}>Conecte suas bibliotecas e encontre seus livros em um só lugar.</Text>
    <View style={[styles.provider, { backgroundColor: palette.surface, borderColor: palette.border }]}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Ionicons name="logo-google" size={28} color={palette.accent} /><Text accessibilityRole="header" style={{ color: palette.text, fontSize: 20, fontWeight: '700' }}>Google Drive</Text></View><Text style={{ color: palette.secondaryText, fontSize: 13, lineHeight: 21 }}>Acesse os livros EPUB e PDF das suas pastas do Google Drive.</Text><Pressable accessibilityRole="button" accessibilityLabel={drive ? 'Gerenciar Google Drive' : 'Conectar Google Drive'} onPress={() => drive ? manage(drive.id, googleDrive.authorization.connected(drive.id) ? 'manage' : 'reconnect') : setManager({ sourceId: null, action: 'manage', initialKind: 'google-drive' })} style={[styles.add, { backgroundColor: palette.accent }]}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{drive ? 'Gerenciar Google Drive' : 'Conectar Google Drive'}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></Pressable>{drive ? <Pressable accessibilityRole="button" accessibilityLabel="Adicionar outra pasta do Google Drive" onPress={() => setManager({ sourceId: null, action: 'manage', initialKind: 'google-drive' })} style={styles.secondary}><Text style={{ color: palette.accent, fontSize: 12 }}>Adicionar outra pasta</Text></Pressable> : null}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Adicionar biblioteca por link" onPress={() => setManager({ sourceId: null, action: 'manage', initialKind: 'json' })} style={[styles.linkCard, { borderColor: palette.border }]}><Ionicons name="link-outline" size={22} color={palette.accent} /><View style={{ flex: 1, gap: 5 }}><Text style={{ color: palette.text, fontWeight: '600', fontSize: 15 }}>Adicionar biblioteca por link</Text><Text style={{ color: palette.secondaryText, fontSize: 12, lineHeight: 19 }}>Adicione uma biblioteca de livros disponível na internet.</Text></View><Ionicons name="chevron-forward" size={17} color={palette.secondaryText} /></Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/search' as never)} style={styles.secondary}><Text style={{ color: palette.accent, fontSize: 13 }}>Explorar catálogos públicos →</Text></Pressable>
    {current.length ? <Text accessibilityRole="header" style={{ color: palette.secondaryText, fontSize: 11, letterSpacing: 1.2, marginTop: 10 }}>SUAS BIBLIOTECAS</Text> : null}
    {loadError ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{loadError}</Text> : null}
  </View>;
  const footer = legacy.length ? <View style={[styles.device, { borderColor: palette.border }]}>
    <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>Bibliotecas deste dispositivo</Text>
    <Text style={{ color: palette.secondaryText, fontSize: 12 }}>{legacy.length.toLocaleString('pt-BR')} {legacy.length === 1 ? 'cadastro antigo disponível' : 'cadastros antigos disponíveis'}</Text>
    <Text style={{ color: palette.secondaryText, fontSize: 12, lineHeight: 19 }}>Cadastros antigos ainda não estão vinculados a uma conta. Revise apenas se forem seus.</Text>
    {!review ? <Pressable accessibilityRole="button" accessibilityLabel="Revisar bibliotecas deste dispositivo" onPress={() => setReview(true)} style={styles.secondary}><Text style={{ color: palette.accent }}>Revisar bibliotecas deste dispositivo</Text></Pressable> : <>
      {legacy.map(source => <View key={source.id} style={[styles.legacyRow, { borderTopColor: palette.border }]}><Text style={{ color: palette.text, fontWeight: '600' }}>{source.name}</Text>{accountId ? <Pressable accessibilityRole="button" accessibilityLabel={`Usar nesta conta: ${source.name}`} disabled={busy} onPress={() => setAdopting(source.id)} style={styles.secondary}><Text style={{ color: palette.accent }}>Usar nesta conta</Text></Pressable> : <Text style={{ color: palette.secondaryText, fontSize: 12 }}>Entre em uma conta para vincular este cadastro.</Text>}</View>)}
      {adopting ? <View style={[styles.confirm, { backgroundColor: palette.surface }]}><Text style={{ color: palette.text, fontWeight: '700' }}>Vincular esta biblioteca à sua conta?</Text><Text style={{ color: palette.secondaryText, fontSize: 13, lineHeight: 20 }}>A configuração e seu catálogo local serão preservados. Nenhum livro será baixado, removido ou transferido entre contas. Confirme apenas se este cadastro é seu.</Text><Pressable accessibilityRole="button" accessibilityLabel="Confirmar uso da biblioteca nesta conta" disabled={busy} onPress={adopt} style={[styles.add, { backgroundColor: palette.accent, opacity: busy ? .5 : 1 }]}><Text style={{ color: '#fff', fontWeight: '700' }}>{busy ? 'Vinculando…' : 'Confirmar uso nesta conta'}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => setAdopting(null)} style={styles.secondary}><Text style={{ color: palette.secondaryText }}>Cancelar</Text></Pressable></View> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setReview(false); setAdopting(null); }} style={styles.secondary}><Text style={{ color: palette.secondaryText }}>Ocultar cadastros antigos</Text></Pressable>
    </>}
    {error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{error}</Text> : null}
  </View> : null;
  return <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom }}>
    {loading ? <View style={styles.header}>{header}<ActivityIndicator color={palette.accent} /></View> : <FlatList data={current} keyExtractor={source => source.id} ListHeaderComponent={header} ListFooterComponent={footer} contentContainerStyle={styles.content} renderItem={({ item }) => <SourceSummaryRow source={item} onManage={manage} />} ListEmptyComponent={<View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}><Ionicons name="library-outline" size={35} color={palette.accent} /><Text style={{ color: palette.text, fontSize: 20, fontWeight: '600' }}>Abra espaço para suas leituras.</Text><Text style={{ color: palette.secondaryText, fontSize: 13, lineHeight: 21 }}>Adicione sua primeira biblioteca para explorar seus livros com calma. Seus livros já importados continuam na Biblioteca do Aldus.</Text></View>} />}
    <SourceManagerModal visible={manager !== null} sourceId={manager?.sourceId ?? null} action={manager?.action ?? 'manage'} initialKind={manager?.initialKind} onClose={() => setManager(null)} />
  </View>;
}
const styles = StyleSheet.create({ content: { padding: 18, paddingBottom: 35 }, header: { gap: 13, marginBottom: 22 }, back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, title: { fontSize: 29, fontWeight: '700', letterSpacing: -.6 }, lead: { fontSize: 14, lineHeight: 23, maxWidth: 560 }, provider: { borderWidth: 1, borderRadius: 13, padding: 18, gap: 14 }, linkCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 1, borderRadius: 11 }, add: { minHeight: 49, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }, secondary: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingVertical: 8 }, empty: { padding: 23, borderRadius: 13, borderWidth: 1, gap: 13 }, device: { marginTop: 18, padding: 17, borderWidth: 1, borderRadius: 11, gap: 10 }, legacyRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 13, gap: 5 }, confirm: { padding: 15, borderRadius: 10, gap: 13 } });
