import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { SourceKind, UserSource } from '@/src/domain/types/sources';
import type { SourceCatalog, SourceOperationContext, SourceOperationProgress } from '@/src/domain/types/sourceCatalog';
import { sourceCapabilities, sourceIdentity, sourceTypeLabel } from '@/src/domain/types/sourceCatalog';
import { configuredCatalog, BUILTIN_CATALOG_NAMES } from '@/src/data/scraping/catalogPlugins';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { appDependencies } from '@/src/presentation/services/dependencies';
import { useSourceStore } from '@/src/presentation/stores/sourceStore';
import { googleDrive } from '@/src/data/drive/driveDependencies';
import { parseDriveFolder } from '@/src/data/drive/driveFolder';
import { sourceCatalogs } from '@/src/data/sources/sourceCatalogDependencies';
import { DriveError } from '@/src/data/drive/DriveErrors';
import { sourceOperationId } from '@/src/utils/sourceDiagnostics';
import { sourceLibraryTypeLabel, sourceProgressCounts, sourceProgressLabel, sourceVisibleInAccount, useSourceAccountGeneration, useSourceAccountId } from './sourcePresentation';

export type SourceManagerAction = 'manage' | 'edit' | 'reconnect' | 'remove' | 'disconnect' | 'toggle';
interface Props { visible: boolean; onClose: () => void; sourceId?: string | null; action?: SourceManagerAction; initialKind?: 'google-drive' | 'json'; }
interface Operation { controller: AbortController; context: SourceOperationContext; }
class SourceFormError extends Error {}
export function SourceManagerModal(props: Props) {
  const accountId = useSourceAccountId(), generation = useSourceAccountGeneration();
  // Never render a previous account's draft/preview while an effect catches up.
  return <SourceManagerContent key={`${accountId ?? 'device'}:${generation}`} {...props} accountId={accountId} />;
}
function SourceManagerContent({ visible, onClose, sourceId = null, action = 'manage', initialKind = 'google-drive', accountId }: Props & { accountId: string | null }) {
  const insets = useSafeAreaInsets(), { palette } = useAppTheme();
  const { sources, load, add, update, remove } = useSourceStore();
  const [mode, setMode] = useState<'add' | 'manage' | 'edit'>(sourceId ? 'manage' : 'add');
  const [name, setName] = useState(''), [url, setUrl] = useState(''), [kind, setKind] = useState<SourceKind>('google-drive');
  const [advanced, setAdvanced] = useState(false), [connected, setConnected] = useState(false), [ready, setReady] = useState(false);
  const [manageOptions, setManageOptions] = useState(false);
  const [preparationError, setPreparationError] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<SourceCatalog | null>(null), [progress, setProgress] = useState<SourceOperationProgress | null>(null);
  const [busy, setBusy] = useState(false), [cancellable, setCancellable] = useState(true), [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<'remove' | 'disconnect' | 'toggle' | null>(null);
  const draft = useRef({ id: '', createdAt: 0 }), operation = useRef<Operation | null>(null), alive = useRef(true);
  const flowId = useRef(sourceOperationId()), preparedId = useRef<string | null>(null);
  const discardPrepared = () => { if (preparedId.current) sourceCatalogs.cancel(preparedId.current); preparedId.current = null; setPrepared(null); };
  const target = sources.find(source => source.id === (sourceId ?? draft.current.id) && sourceVisibleInAccount(source, accountId));
  const [, redraw] = useState(0);
  useEffect(() => sourceCatalogs.subscribe(() => redraw(value => value + 1)), []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; operation.current?.controller.abort(); if (preparedId.current) sourceCatalogs.cancel(preparedId.current); }; }, []);
  useEffect(() => {
    operation.current?.controller.abort(); operation.current = null;
    if (preparedId.current) sourceCatalogs.cancel(preparedId.current); preparedId.current = null; flowId.current = sourceOperationId();
    setBusy(false); setManageOptions(false); setError(null); setNotice(null); setProgress(null); setPrepared(null);
    if (!visible) return;
    const current = sourceId ? useSourceStore.getState().sources.find(source => source.id === sourceId && sourceVisibleInAccount(source, accountId)) : undefined;
    draft.current = { id: current?.id ?? `source-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: current?.createdAt ?? Date.now() };
    setName(current?.name ?? ''); setUrl(current?.url ?? ''); setKind(current?.kind ?? initialKind);
    setMode(current ? action === 'edit' ? 'edit' : 'manage' : sourceId ? 'manage' : 'add');
    setAdvanced(!!current && current.kind !== 'google-drive' && current.kind !== 'json' && action === 'edit');
    setConnected(!!current && googleDrive.authorization.connected(current.id));
    setConfirmation(action === 'remove' || action === 'disconnect' || action === 'toggle' ? action : null);
    void load();
    return () => { operation.current?.controller.abort(); operation.current = null; if (preparedId.current) sourceCatalogs.cancel(preparedId.current); preparedId.current = null; };
  }, [visible, sourceId, action, initialKind, accountId, load]);
  const prepareAuthorization = () => {
    setReady(false); setPreparationError(null);
    void googleDrive.authorization.prepare().then(() => { if (alive.current) setReady(true); }).catch(failure => {
      if (alive.current) setPreparationError(failure instanceof DriveError ? failure.message : 'Não foi possível preparar a conexão. Tente novamente.');
    });
  };
  useEffect(() => { if (visible && (kind === 'google-drive' || target?.kind === 'google-drive')) prepareAuthorization(); }, [visible, kind, target?.kind]);
  const close = () => { if (operation.current && !cancellable) return; operation.current?.controller.abort(); discardPrepared(); onClose(); };
  const active = (op: Operation) => alive.current && operation.current === op && !op.controller.signal.aborted;
  const run = async (phase: SourceOperationProgress['phase'], task: (op: Operation) => Promise<void>, canCancel = true) => {
    if (operation.current) return;
    const controller = new AbortController(), context: SourceOperationContext = { operationId: mode === 'manage' ? sourceOperationId() : flowId.current };
    const op: Operation = { controller, context };
    context.onProgress = next => { if (active(op) && next.operationId === context.operationId) setProgress(next); };
    operation.current = op; setBusy(true); setCancellable(canCancel); setError(null); setNotice(null); setProgress({ operationId: context.operationId, phase });
    try { await task(op); if (active(op)) setProgress(current => ({ ...current, operationId: context.operationId, phase: 'success' })); }
    catch (failure) {
      if (operation.current === op && alive.current) {
        const cancelled = controller.signal.aborted || (failure as Error)?.name === 'AbortError' || failure instanceof DriveError && failure.code === 'cancelled';
        setProgress({ operationId: context.operationId, phase: cancelled ? 'cancelled' : 'error' });
        if (!cancelled) setError(failure instanceof DriveError || failure instanceof SourceFormError ? failure.message : 'Não foi possível concluir a operação. Confira a conexão, o endereço e as permissões. Seus dados foram preservados; tente novamente.');
        if (kind === 'google-drive') setConnected(googleDrive.authorization.connected(draft.current.id));
      }
    } finally {
      if (operation.current === op) { operation.current = null; if (alive.current) { setBusy(false); if (controller.signal.aborted) setProgress({ operationId: context.operationId, phase: 'cancelled' }); } }
    }
  };
  const candidate = (requireName = false): UserSource => {
    const cleanName = name.trim();
    if (requireName && !cleanName) throw new SourceFormError('Dê um nome para esta biblioteca.');
    if (requireName && (['Todos', ...BUILTIN_CATALOG_NAMES, 'BNDigital', 'Minhas Fontes', 'Minhas bibliotecas'].some(reserved => reserved.toLocaleLowerCase() === cleanName.toLocaleLowerCase()) || sources.some(source => source.id !== draft.current.id && source.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase()))) throw new SourceFormError('Já existe uma biblioteca com esse nome. Escolha outro nome.');
    const folder = kind === 'google-drive' ? parseDriveFolder(url) : undefined;
    if (!folder) {
      let endpoint: URL; try { endpoint = new URL(url.trim().replaceAll('{query}', 'consulta')); } catch { throw new SourceFormError('Informe um endereço HTTP ou HTTPS válido.'); }
      if (!/^https?:$/.test(endpoint.protocol)) throw new SourceFormError('Informe um endereço HTTP ou HTTPS válido.');
    }
    return { ...(target ?? {}), id: draft.current.id, ownerId: accountId, name: cleanName || 'Minha biblioteca', url: url.trim(), kind,
      folderId: folder?.folderId, resourceKey: folder?.resourceKey ?? (folder && target?.folderId === folder.folderId ? target.resourceKey : undefined), enabled: true, status: 'active', lastError: null, lastCheckedAt: Date.now(), createdAt: draft.current.createdAt };
  };
  const connect = () => void run('authorizing', async op => {
    discardPrepared();
    // This call starts synchronously from the click, preserving the GIS popup gesture.
    const source: UserSource = { id: draft.current.id, name: name.trim() || 'Minha biblioteca', url, kind: 'google-drive', enabled: true, createdAt: draft.current.createdAt, ownerId: accountId };
    await googleDrive.connect(source, op.controller.signal, op.context);
    if (active(op)) { setConnected(true); setNotice('Drive conectado nesta sessão. Agora informe a pasta da sua biblioteca.'); }
  });
  const searchBooks = () => void run('verifying', async op => {
    discardPrepared();
    const source = candidate();
    if (!googleDrive.authorization.connected(source.id)) throw new DriveError('disconnected');
    const folder = await googleDrive.describeRoot(source, op.controller.signal, op.context);
    if (!active(op)) return;
    if (!name.trim()) { source.name = folder.name || 'Minha biblioteca'; setName(source.name); }
    const result = await sourceCatalogs.prepare(source, op.controller.signal, op.context);
    if (active(op)) { preparedId.current = source.id; setPrepared(result); setNotice('Busca concluída. Revise o nome e salve a biblioteca. Nenhum arquivo foi baixado.'); }
  });
  const savePrepared = () => void run('saving', async op => {
    const source = candidate(true);
    if (!prepared || prepared.sourceId !== source.id || prepared.sourceIdentity !== sourceIdentity(source)) throw new SourceFormError('Busque os livros desta pasta antes de salvar.');
    if (!googleDrive.authorization.connected(source.id)) throw new DriveError('expired');
    if (target) await update(source.id, source, op.controller.signal, { prepared, context: op.context });
    else await add(source, op.controller.signal, { prepared, context: op.context });
    if (active(op)) { preparedId.current = null; setMode('manage'); setPrepared(null); setNotice('Biblioteca salva. Importe os livros que você quiser ler.'); }
  });
  const checkAdvanced = async (source: UserSource, op: Operation) => {
    const result = await appDependencies.searchBooks.executeDetailed('Dom Casmurro', [configuredCatalog(source)], {}, op.controller.signal);
    const outcome = result.sources[0]; if (!outcome || outcome.status === 'error') throw new SourceFormError('O catálogo não respondeu. Confira o endereço, a conexão e o formato. Na Web, o servidor precisa permitir CORS.');
  };
  const saveAdvanced = () => void run('verifying', async op => {
    const source = candidate(true); let catalog: SourceCatalog | undefined;
    if (sourceCapabilities(source).supportsCatalog) catalog = await sourceCatalogs.prepare(source, op.controller.signal, op.context);
    else await checkAdvanced(source, op);
    if (!active(op)) return;
    if (target) await update(source.id, source, op.controller.signal, { prepared: catalog, context: op.context });
    else await add(source, op.controller.signal, { prepared: catalog, context: op.context });
    if (active(op)) { setMode('manage'); setNotice('Biblioteca salva. Nenhum livro foi baixado.'); }
  });
  const refreshTarget = () => {
    if (!target) return;
    const source = { ...target, enabled: true, status: 'active' as const, lastError: null, lastCheckedAt: Date.now() };
    void run(source.kind === 'google-drive' && !googleDrive.authorization.connected(source.id) ? 'authorizing' : 'verifying', async op => {
      if (source.kind === 'google-drive' && !googleDrive.authorization.connected(source.id)) await googleDrive.connect(source, op.controller.signal, op.context);
      if (sourceCapabilities(source).supportsCatalog) {
        const catalog = await sourceCatalogs.prepare(source, op.controller.signal, op.context);
        await update(source.id, source, op.controller.signal, { prepared: catalog, context: op.context });
      } else { await checkAdvanced(source, op); await update(source.id, source, op.controller.signal, { context: op.context }); }
      if (active(op)) { setConnected(source.kind === 'google-drive' && googleDrive.authorization.connected(source.id)); setNotice('Biblioteca atualizada. Seus livros importados foram preservados.'); }
    });
  };
  const confirm = () => {
    if (!target || !confirmation) return;
    const choice = confirmation;
    void run('saving', async op => {
      if (choice === 'remove') { await remove(target.id); if (active(op)) onClose(); return; }
      if (choice === 'disconnect') {
        const revoked = await googleDrive.disconnect(target.id); if (!active(op)) return;
        await update(target.id, { enabled: false, status: 'error', lastError: revoked ? 'Drive desconectado. Livros importados preservados.' : 'Desconectado neste dispositivo. A revogação no Google não foi confirmada. Confira os aplicativos conectados na sua conta Google.' }, op.controller.signal);
        if (active(op)) { setConnected(false); setNotice('Conexão encerrada. Catálogo e livros importados preservados.'); }
      } else if (target.enabled) { await update(target.id, { enabled: false }, op.controller.signal); if (active(op)) setNotice('Biblioteca desativada. Seus livros importados foram preservados.'); }
      if (active(op)) setConfirmation(null);
    }, false);
  };
  const enterEdit = () => { if (!target) return; discardPrepared(); flowId.current = sourceOperationId(); setName(target.name); setUrl(target.url); setKind(target.kind); setMode('edit'); setAdvanced(target.kind !== 'google-drive' && target.kind !== 'json'); setError(null); setNotice(null); };
  const changeUrl = (value: string) => { discardPrepared(); setUrl(value); setError(null); setNotice(null); };
  const changeKind = (value: SourceKind) => { discardPrepared(); setKind(value); setError(null); setNotice(null); setConnected(value === 'google-drive' && googleDrive.authorization.connected(draft.current.id)); };
  const primary = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: busy || disabled }} disabled={busy || disabled} onPress={onPress} style={[styles.primary, { backgroundColor: palette.accent, opacity: busy || disabled ? .5 : 1 }]}><Text style={styles.primaryText}>{label}</Text></Pressable>;
  const secondary = (label: string, onPress: () => void, danger = false) => <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={[styles.secondary, { borderColor: palette.border }]}><Text style={{ color: danger ? palette.accent : palette.text, fontWeight: '600' }}>{label}</Text></Pressable>;
  const field = (label: string, value: string, change: (value: string) => void, placeholder: string, isUrl = false) => <View style={styles.field}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><TextInput accessibilityLabel={label} value={value} editable={!busy} onChangeText={change} placeholder={placeholder} placeholderTextColor={palette.secondaryText} autoCapitalize={isUrl ? 'none' : 'sentences'} autoCorrect={!isUrl} keyboardType={isUrl ? 'url' : 'default'} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]} /></View>;
  const catalog = target ? sourceCatalogs.view(target.id).catalog : null;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={[styles.backdrop, { backgroundColor: palette.overlay, paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}><View style={[styles.sheet, { backgroundColor: palette.panel }]}>
    <View style={[styles.titleRow, { borderBottomColor: palette.separator }]}><View style={{ flex: 1, gap: 3 }}><Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{mode === 'add' ? 'Adicionar biblioteca' : mode === 'edit' ? 'Editar biblioteca' : 'Sua biblioteca'}</Text><Text style={{ color: palette.secondaryText, fontSize: 12 }}>Seus arquivos continuam sob seu controle.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar bibliotecas" disabled={busy && !cancellable} onPress={close} style={[styles.icon, { opacity: busy && !cancellable ? .4 : 1 }]}><Ionicons name="close" size={23} color={palette.text} /></Pressable></View>
    {busy || progress?.phase === 'cancelled' ? <View style={[styles.progress, { backgroundColor: palette.surfaceSecondary, marginHorizontal: 16, marginTop: 12 }]}>{busy ? <ActivityIndicator color={palette.accent} /> : null}<View style={{ flex: 1, gap: 4 }}><Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{busy && !cancellable ? 'Concluindo alteração…' : sourceProgressLabel(progress)}</Text>{sourceProgressCounts(progress) ? <Text style={{ color: palette.secondaryText, fontSize: 12 }}>{sourceProgressCounts(progress)}</Text> : null}</View>{busy && cancellable ? <Pressable accessibilityRole="button" accessibilityLabel="Cancelar operação da biblioteca" onPress={() => operation.current?.controller.abort()} style={styles.cancel}><Text style={{ color: palette.accent }}>Cancelar</Text></Pressable> : null}</View> : null}
    {error ? <Text accessibilityRole="alert" style={[styles.feedback, { color: palette.accent, marginHorizontal: 20, marginTop: 12 }]}>{error}</Text> : null}
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {sourceId && !target ? <Text accessibilityRole="alert" style={{ color: palette.secondaryText }}>Esta biblioteca não está disponível nesta conta. Nenhum dado foi removido.</Text> : <>
        {mode === 'manage' && target ? <><View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}><Ionicons name={target.kind === 'google-drive' ? 'logo-google' : 'library-outline'} size={27} color={palette.accent} /><Text style={[styles.summaryName, { color: palette.text }]}>{target.name}</Text><Text style={{ color: palette.secondaryText }}>{sourceLibraryTypeLabel(target.kind)}{catalog ? ` · ${catalog.items.length.toLocaleString('pt-BR')} ${catalog.items.length === 1 ? 'livro' : 'livros'}` : ' · Ainda não atualizada'}</Text></View>
          {confirmation ? <View style={[styles.panel, { borderColor: palette.accent }]}><Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>{confirmation === 'remove' ? 'Remover esta biblioteca?' : confirmation === 'disconnect' ? 'Desconectar o Google Drive?' : 'Desativar esta biblioteca?'}</Text><Text style={{ color: palette.secondaryText, lineHeight: 21 }}>{confirmation === 'remove' ? 'A configuração e o catálogo desta biblioteca serão removidos desta conta. Livros já importados, notas e progresso serão preservados.' : confirmation === 'disconnect' ? 'O catálogo local e os livros importados permanecem. Revogar o acesso no Google pode afetar outras bibliotecas conectadas à mesma conta e aplicativo.' : 'A biblioteca deixa de participar das buscas. O catálogo local e os livros importados permanecem preservados.'}</Text>{primary(confirmation === 'remove' ? 'Confirmar remoção da biblioteca' : confirmation === 'disconnect' ? 'Confirmar desconexão' : 'Confirmar desativação', confirm)}{secondary('Cancelar alteração', () => setConfirmation(null))}</View> : <>
            {sourceCapabilities(target).supportsCatalog ? primary('Abrir biblioteca', () => { close(); router.push({ pathname: '/sources/[sourceId]', params: { sourceId: target.id } } as never); }) : <Text style={{ color: palette.secondaryText }}>Este catálogo oferece somente pesquisa. Seus resultados continuam na área de busca.</Text>}
            {secondary(target.kind === 'google-drive' && !googleDrive.authorization.connected(target.id) ? 'Reconectar Google Drive' : !target.enabled ? 'Ativar e atualizar biblioteca' : sourceCapabilities(target).supportsCatalog ? 'Atualizar biblioteca' : 'Testar conexão', refreshTarget)}
            <Pressable accessibilityRole="button" accessibilityLabel="Mais opções da biblioteca" accessibilityState={{ expanded: manageOptions }} onPress={() => setManageOptions(!manageOptions)} disabled={busy} style={styles.disclosure}><Text style={{ color: palette.secondaryText }}>Mais opções</Text><Ionicons name={manageOptions ? 'chevron-up' : 'chevron-down'} size={17} color={palette.secondaryText} /></Pressable>
            {manageOptions ? <View style={styles.actionGrid}>{secondary('Editar biblioteca', enterEdit)}{secondary(target.enabled ? 'Desativar biblioteca' : 'Ativar biblioteca', () => target.enabled ? setConfirmation('toggle') : refreshTarget())}{target.kind === 'google-drive' ? secondary('Desconectar Google Drive', () => setConfirmation('disconnect')) : null}{secondary('Remover biblioteca', () => setConfirmation('remove'), true)}</View> : null}
          </>}</> : null}
        {mode === 'add' ? <View style={styles.addChoices}><Pressable accessibilityRole="button" accessibilityLabel="Adicionar com Google Drive" accessibilityState={{ selected: kind === 'google-drive' }} disabled={busy} onPress={() => { changeKind('google-drive'); setAdvanced(false); }} style={[styles.choice, { backgroundColor: palette.surface, borderColor: kind === 'google-drive' ? palette.accent : palette.border }]}><Ionicons name="logo-google" size={19} color={palette.accent} /><Text style={{ color: palette.text, fontWeight: '600' }}>Google Drive</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Adicionar biblioteca por link" disabled={busy} onPress={() => { changeKind('json'); setAdvanced(false); }} style={styles.linkChoice}><Text style={{ color: palette.accent }}>Adicionar por link</Text></Pressable></View> : null}
        {mode !== 'manage' && kind === 'json' && !advanced ? <View style={[styles.panel, { borderColor: palette.border }]}><Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Biblioteca por link</Text><Text style={[styles.help, { color: palette.secondaryText }]}>Adicione o endereço de um catálogo de livros. Nenhum arquivo será baixado automaticamente.</Text>{field('Nome da biblioteca', name, setName, 'Ex.: Minhas leituras')}{field('Link da biblioteca', url, changeUrl, 'https://catalogo.exemplo/biblioteca', true)}{primary(mode === 'edit' ? 'Salvar alterações' : 'Salvar biblioteca por link', saveAdvanced)}<Text style={[styles.help, { color: palette.secondaryText }]}>Se o catálogo usa OPDS ou uma página de pesquisa, escolha seu formato em Configuração avançada.</Text></View> : null}
        {mode !== 'manage' && kind === 'google-drive' ? <>
          <View style={styles.intro}><Ionicons name="logo-google" size={26} color={palette.accent} /><Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Sua pasta vira uma biblioteca.</Text><Text style={{ color: palette.secondaryText, lineHeight: 21 }}>Conecte o Drive, escolha uma pasta e encontre seus EPUB e PDF. Os arquivos só são baixados quando você escolhe importar um livro.</Text></View>
          <View style={styles.steps} accessibilityLabel="Etapas para adicionar biblioteca"><Step number="1" title="Conectar" complete={connected} palette={palette} /><Step number="2" title="Buscar livros" complete={!!prepared} palette={palette} /><Step number="3" title="Salvar" complete={false} palette={palette} /></View>
          <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text style={[styles.label, { color: palette.text }]}>{connected ? 'Google Drive conectado nesta sessão' : '1. Conecte seu Google Drive'}</Text><Text style={[styles.help, { color: palette.secondaryText }]}>A conexão é separada do login no Aldus. A permissão do Google permite ler e baixar arquivos de todo o Drive; o Aldus consulta apenas a pasta informada e suas subpastas.</Text>{primary(connected ? 'Conectar outra conta Google' : 'Conectar Google Drive', connect, !ready)}{!ready ? <Text style={[styles.help, { color: palette.secondaryText }]}>{preparationError ?? 'Preparando conexão segura…'}</Text> : null}{preparationError ? secondary('Tentar preparar conexão novamente', prepareAuthorization) : null}</View>
          {connected ? <View style={[styles.panel, { borderColor: palette.border }]}>{field('Link da pasta do Google Drive', url, changeUrl, 'Cole o link da pasta', true)}<Text style={[styles.help, { color: palette.secondaryText }]}>Abra a pasta no Google Drive e copie o link. A pasta precisa estar acessível à conta Google conectada.</Text>{primary(prepared ? 'Buscar livros novamente' : 'Buscar livros', searchBooks, !url.trim())}</View> : null}
          {prepared ? <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.surface }]}><Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Biblioteca encontrada</Text><Text style={{ color: palette.secondaryText }}>{prepared.items.length.toLocaleString('pt-BR')} {prepared.items.length === 1 ? 'livro encontrado' : 'livros encontrados'} · {Math.max(0, (prepared.folders?.length ?? 1) - 1).toLocaleString('pt-BR')} subpastas</Text>{prepared.items.length ? prepared.items.slice(0, 3).map(item => <Text key={item.remoteBookId} numberOfLines={1} style={{ color: palette.text, fontSize: 12 }}>• {item.title}</Text>) : <Text style={{ color: palette.secondaryText }}>A pasta é válida, mas ainda não contém EPUB ou PDF. Você pode salvá-la e atualizar depois.</Text>}{field('Nome da biblioteca', name, setName, 'Ex.: Minhas leituras')}{primary(mode === 'edit' ? 'Salvar alterações' : 'Salvar biblioteca', savePrepared)}<Text style={[styles.help, { color: palette.secondaryText }]}>Esta busca consultou apenas informações dos arquivos. Nada foi importado para sua biblioteca pessoal.</Text></View> : null}
          {mode === 'edit' && !prepared ? field('Nome da biblioteca', name, setName, 'Nome da biblioteca') : null}
        </> : null}
        {mode !== 'manage' ? <View style={[styles.advanced, { borderTopColor: palette.border }]}><Pressable accessibilityRole="button" accessibilityLabel="Configuração avançada" accessibilityState={{ expanded: advanced }} disabled={busy} onPress={() => setAdvanced(!advanced)} style={styles.disclosure}><Text style={{ color: palette.secondaryText, fontWeight: '600' }}>Configuração avançada</Text><Ionicons name={advanced ? 'chevron-up' : 'chevron-down'} size={17} color={palette.secondaryText} /></Pressable>{advanced ? <View style={{ gap: 14 }}><Text style={[styles.help, { color: palette.secondaryText }]}>Para catálogos JSON, OPDS e páginas de busca. Configurações existentes são preservadas até você salvar.</Text><View style={styles.kindOptions}>{(['google-drive', 'json', 'opds', 'html'] as SourceKind[]).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Tipo: ${sourceTypeLabel(value)}`} accessibilityState={{ selected: kind === value }} disabled={busy} onPress={() => changeKind(value)} style={[styles.kind, { borderColor: kind === value ? palette.accent : palette.border, backgroundColor: kind === value ? palette.surfaceSecondary : palette.surface }]}><Text style={{ color: palette.text, fontSize: 12 }}>{value === 'google-drive' ? 'Google Drive' : value.toUpperCase()}</Text></Pressable>)}</View>{kind !== 'google-drive' ? <>{!['json', 'opds', 'html'].includes(kind) ? <Text style={{ color: palette.secondaryText }}>Tipo existente: {sourceTypeLabel(kind)}. Será mantido se você não escolher outro.</Text> : null}{field('Nome da biblioteca', name, setName, 'Ex.: Catálogo de estudos')}{field('Endereço do catálogo', url, changeUrl, 'https://catalogo.exemplo/busca?q={query}', true)}<Text style={[styles.help, { color: palette.secondaryText }]}>{kind === 'json' ? 'Um JSON sem {query} pode oferecer uma biblioteca completa de EPUB e PDF. Catálogos de busca permanecem somente pesquisa. Na Web, o servidor precisa permitir CORS.' : 'O endereço pode usar {query}. OPDS e HTML permanecem catálogos de pesquisa. Na Web, o servidor precisa permitir CORS.'}</Text>{primary(mode === 'edit' ? 'Salvar alterações' : 'Salvar catálogo', saveAdvanced)}</> : <Text style={[styles.help, { color: palette.secondaryText }]}>O campo de pasta também aceita seu identificador. Tokens não são salvos pelo Aldus. O índice de metadados permanece neste dispositivo; revogar o acesso pode afetar outras bibliotecas da mesma conta Google.</Text>}</View> : null}</View> : null}
        {mode === 'edit' ? secondary('Cancelar edição', () => { discardPrepared(); setMode('manage'); setError(null); }) : null}
      </>}
      {notice ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: palette.secondaryText }]}>{notice}</Text> : null}
    </ScrollView>
  </View></View></Modal>;
}
function Step({ number, title, complete, palette }: { number: string; title: string; complete: boolean; palette: { accent: string; text: string; secondaryText: string; border: string } }) {
  return <View style={styles.step}><View style={[styles.stepNumber, { borderColor: complete ? palette.accent : palette.border, backgroundColor: complete ? palette.accent : 'transparent' }]}><Text style={{ color: complete ? '#fff' : palette.secondaryText, fontWeight: '700', fontSize: 12 }}>{complete ? '✓' : number}</Text></View><Text style={{ color: palette.text, fontSize: 11, flexShrink: 1 }}>{title}</Text></View>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10 }, sheet: { width: '100%', maxWidth: 620, maxHeight: '94%', alignSelf: 'center', borderRadius: 16, overflow: 'hidden' }, titleRow: { minHeight: 77, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth }, title: { fontSize: 21, fontWeight: '700' }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 32, gap: 16 }, addChoices: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14 }, linkChoice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 }, intro: { gap: 10 }, heading: { fontSize: 19, fontWeight: '700' }, help: { fontSize: 12, lineHeight: 19 }, label: { fontSize: 13, fontWeight: '600' }, panel: { padding: 16, borderWidth: 1, borderRadius: 12, gap: 13 }, steps: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 3 }, step: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }, stepNumber: { width: 27, height: 27, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primary: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 11 }, primaryText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' }, secondary: { minHeight: 46, borderRadius: 8, borderWidth: 1, padding: 12, justifyContent: 'center' }, field: { gap: 8 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 }, advanced: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4 }, disclosure: { minHeight: 48, flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'center' }, kindOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, kind: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44, justifyContent: 'center' }, summaryName: { fontSize: 23, fontWeight: '700' }, actionGrid: { gap: 10 }, progress: { padding: 13, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, feedback: { fontSize: 13, lineHeight: 20 },
});
