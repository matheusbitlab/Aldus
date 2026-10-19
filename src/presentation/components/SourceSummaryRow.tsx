import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { UserSource } from '@/src/domain/types/sources';
import { sourceCapabilities } from '@/src/domain/types/sourceCatalog';
import { useSourceCatalog } from '@/src/presentation/hooks/useSourceCatalog';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { useSearchStore } from '@/src/presentation/stores/searchStore';
import type { SourceManagerAction } from './SourceManagerModal';
import { sourceLibraryTypeLabel, sourceProgressCounts, sourceProgressLabel, sourceVisibleInAccount, useSourceAccountGeneration, useSourceAccountId } from './sourcePresentation';

interface Props { source: UserSource; onManage: (sourceId: string, action?: SourceManagerAction) => void; }
export function SourceSummaryRow(props: Props) {
  const account = useSourceAccountId(), generation = useSourceAccountGeneration();
  if (!sourceVisibleInAccount(props.source, account)) return null;
  return <SourceSummaryContent key={`${account}:${generation}:${props.source.id}`} {...props} />;
}
function SourceSummaryContent({ source, onManage }: Props) {
  const { palette } = useAppTheme(), view = useSourceCatalog(source), capabilities = sourceCapabilities(source);
  const [menu, setMenu] = useState(false);
  const updating = view.status === 'refreshing' || view.status === 'loading';
  const auth = capabilities.requiresAuthorization && view.status === 'auth_required';
  const status = updating ? sourceProgressLabel(view.operation) ?? 'Carregando biblioteca…' : auth ? 'Reconectar para atualizar' : !source.enabled ? 'Desativada' : view.status === 'error' ? 'Precisa de atenção' : !view.catalog ? 'Aguardando primeira atualização' : view.catalog.items.length === 0 ? 'Nenhum EPUB ou PDF encontrado' : view.status === 'offline' || view.status === 'stale' ? 'Catálogo salvo neste dispositivo' : 'Pronta para explorar';
  const open = () => {
    if (capabilities.supportsCatalog) router.push({ pathname: '/sources/[sourceId]', params: { sourceId: source.id } } as never);
    else if (capabilities.supportsSearch) { useSearchStore.getState().selectSource(source.name); router.push('/(tabs)/search' as never); }
    else onManage(source.id);
  };
  const choose = (action: SourceManagerAction) => { setMenu(false); onManage(source.id, action); };
  const option = (label: string, action: SourceManagerAction) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}: ${source.name}`} onPress={() => choose(action)} style={styles.option}><Text style={{ color: action === 'remove' ? palette.accent : palette.text }}>{label}</Text></Pressable>;
  return <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
    <View style={styles.top}><View style={[styles.symbol, { backgroundColor: palette.surfaceSecondary }]}><Ionicons name={source.kind === 'google-drive' ? 'logo-google' : 'library-outline'} size={23} color={palette.accent} /></View><Pressable accessibilityRole="button" accessibilityLabel={`${capabilities.supportsCatalog ? 'Abrir biblioteca' : 'Pesquisar'}: ${source.name}`} onPress={open} style={styles.name}><Text style={{ color: palette.text, fontSize: 19, fontWeight: '700' }}>{source.name}</Text><Text style={{ color: palette.secondaryText, fontSize: 12 }}>{sourceLibraryTypeLabel(source.kind)}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Opções da biblioteca ${source.name}`} accessibilityState={{ expanded: menu }} onPress={() => setMenu(!menu)} style={styles.menuButton}><Ionicons name="ellipsis-horizontal" size={23} color={palette.text} /></Pressable></View>
    <View style={styles.metadata}><Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>{capabilities.supportsCatalog ? view.catalog ? `${view.catalog.items.length.toLocaleString('pt-BR')} ${view.catalog.items.length === 1 ? 'livro' : 'livros'}${view.catalog.rootFolderId ? ` · ${Math.max(0, (view.catalog.folders?.length ?? 1) - 1).toLocaleString('pt-BR')} pastas` : ''}` : 'Ainda não atualizada' : 'Somente pesquisa'}</Text><Text accessibilityLiveRegion="polite" style={{ color: auth || view.status === 'error' ? palette.accent : palette.secondaryText, fontSize: 12 }}>{status}</Text>{updating && sourceProgressCounts(view.operation) ? <Text style={{ color: palette.secondaryText, fontSize: 11 }}>{sourceProgressCounts(view.operation)}</Text> : null}{view.catalog ? <Text style={{ color: palette.secondaryText, fontSize: 11 }}>Atualizada em {new Date(view.catalog.lastUpdated).toLocaleString('pt-BR')}</Text> : null}</View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${capabilities.supportsCatalog ? 'Explorar biblioteca' : 'Pesquisar catálogo'}: ${source.name}`} onPress={open} style={[styles.open, { borderColor: palette.border }]}><Text style={{ color: palette.accent, fontWeight: '700' }}>{capabilities.supportsCatalog ? 'Abrir biblioteca' : 'Pesquisar livros'}</Text><Ionicons name="arrow-forward" size={17} color={palette.accent} /></Pressable>
    {menu ? <View accessibilityLabel={`Ações da biblioteca ${source.name}`} style={[styles.menu, { borderTopColor: palette.border }]}>{capabilities.supportsRefresh ? option(auth ? 'Reconectar' : 'Atualizar biblioteca', auth ? 'reconnect' : 'manage') : null}{option('Editar biblioteca', 'edit')}{option(source.enabled ? 'Desativar biblioteca' : 'Ativar biblioteca', source.enabled ? 'toggle' : 'manage')}{source.kind === 'google-drive' ? option('Desconectar Google Drive', 'disconnect') : null}{option('Remover biblioteca', 'remove')}</View> : null}
  </View>;
}
const styles = StyleSheet.create({ card: { padding: 17, gap: 15, borderWidth: 1, borderRadius: 13, marginBottom: 13 }, top: { flexDirection: 'row', alignItems: 'center', gap: 12 }, symbol: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, name: { flex: 1, gap: 5, minHeight: 48, justifyContent: 'center' }, menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, metadata: { gap: 5 }, open: { minHeight: 45, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, menu: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 }, option: { minHeight: 46, justifyContent: 'center', paddingVertical: 9 } });
