import { planLabel } from '@/src/presentation/i18n/ptBR';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGuard } from '@/src/presentation/components/AuthGuard';
import { LibrarySyncControls } from '@/src/presentation/components/LibrarySyncControls';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { accountPlanRepository } from '@/src/presentation/services/dependencies';
import { CatalogPlan, PlanFailure } from '@/src/domain/saas/accountPlan';
import { catalogPrice, featureLabels, formatBytes, progressPercent, subscriptionLabel } from '@/src/domain/saas/planPresentation';
import { useSaasRead } from './useSaasRead';

const readAccount = (signal: AbortSignal) => accountPlanRepository.readExperience(signal);
const readCatalog = (signal: AbortSignal) => accountPlanRepository.readCatalog(signal);
const dateLabel = (value: string) => new Date(value).toLocaleString('pt-BR');
const errors: Record<PlanFailure, string> = {
  unavailable: 'O serviço de planos não está disponível. Ele pode ainda não estar ativado neste ambiente.',
  network: 'Não foi possível acessar o serviço. Verifique sua conexão e tente novamente.',
  session: 'Sua sessão precisa ser validada. Acesse Minha conta ou entre novamente.',
  authorization: 'O servidor não autorizou esta consulta. Verifique a situação da sua conta.',
  contract: 'Os dados recebidos estão incompletos ou inconsistentes. Atualize para consultar novamente.',
};
export function PlanButton({ title, onPress, disabled = false }: { title: string; onPress?: () => void; disabled?: boolean }) {
  const { palette } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { borderColor: palette.border, backgroundColor: pressed ? palette.surfaceSecondary : palette.surface, opacity: disabled ? 0.65 : 1 }]}>
    <Text style={{ color: palette.text, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}
function Copy({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  const { palette } = useAppTheme(); return <Text style={{ color: muted ? palette.secondaryText : palette.text, fontSize: 15, lineHeight: 23 }}>{children}</Text>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useAppTheme(); return <View style={[styles.section, { borderColor: palette.border, backgroundColor: palette.surface }]}>
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>{children}</View>;
}
function Layout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets();
  return <AuthGuard><View style={{ flex: 1, backgroundColor: palette.background }}><ScrollView contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 28) }]}>
    <View style={styles.actions}><PlanButton title="Voltar aos Ajustes" onPress={() => router.push('/settings' as never)} /></View>
    <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{title}</Text><Copy muted>{subtitle}</Copy>{children}
  </ScrollView></View></AuthGuard>;
}
function Failure({ error, refresh }: { error: PlanFailure | null; refresh: () => Promise<void> }) {
  const { palette } = useAppTheme(); return <Section title="Consulta indisponível"><Text accessibilityRole="alert" style={{ color: palette.text, lineHeight: 23 }}>{errors[error ?? 'unavailable']}</Text>
    <Copy muted>Seu plano e consumo não puderam ser consultados. Leitura local, importações e dados existentes são preservados.</Copy>
    <View style={styles.actions}><PlanButton title="Tentar novamente" onPress={() => void refresh()} /><PlanButton title="Minha conta" onPress={() => router.push('/account' as never)} /></View></Section>;
}
function Meter({ title, used, limit, bytes = false, reserved = 0 }: { title: string; used: number | null; limit: number; bytes?: boolean; reserved?: number }) {
  const { palette } = useAppTheme(), percent = progressPercent(used, limit);
  const format = (n: number | null) => bytes ? formatBytes(n) : n === null ? 'Em verificação' : n.toLocaleString('pt-BR');
  const reservation = percent === null ? 0 : Math.min(100 - percent, progressPercent(reserved, limit) ?? 0);
  return <View style={{ gap: 10 }}>
    <Copy>{title}: {format(used)} de {format(limit)}</Copy>
    <View accessibilityRole="progressbar" accessibilityLabel={title} accessibilityValue={percent === null ? { text: 'Em verificação' } : { min: 0, max: 100, now: Math.round(percent), text: `${format(used)} de ${format(limit)}; ${format(reserved)} reservados` }}
      aria-valuetext={percent === null ? 'Em verificação' : `${format(used)} de ${format(limit)}; ${format(reserved)} reservados`}
      aria-valuemin={percent === null ? undefined : 0} aria-valuemax={percent === null ? undefined : 100} aria-valuenow={percent === null ? undefined : Math.round(percent)}
      style={{ height: 10, borderRadius: 5, backgroundColor: palette.surfaceSecondary, overflow: 'hidden', flexDirection: 'row' }}>
      {percent !== null ? <><View style={{ width: `${percent}%`, backgroundColor: palette.accent }} /><View style={{ width: `${reservation}%`, backgroundColor: palette.secondaryText }} /></> : null}
    </View>
    {used === null ? <Copy muted>Em verificação. A disponibilidade será informada após reconciliação.</Copy> : null}
  </View>;
}
export function MyPlanScreen() {
  const state = useSaasRead(readAccount), { palette } = useAppTheme(), data = state.data;
  // A grant cannot remain visibly Pro after its expiry while the page stays open.
  useEffect(() => {
    const end = data?.account.subscription.endsAt;
    if (!end || data?.account.effectivePlan === 'free') return;
    const delay = Date.parse(end) - Date.now();
    const timer = setTimeout(() => void state.refresh(), Math.max(0, Math.min(delay, 2147483647)));
    return () => clearTimeout(timer);
  }, [data, state.refresh]);
  const quota = data?.quota, account = data?.account;
  const full = quota && (quota.overLimit || quota.remaining.syncedBooks === 0 || quota.remaining.storageBytes === 0);
  return <Layout title="Meu Plano" subtitle="Sua conta, sua biblioteca e o espaço privado na nuvem.">
    <View style={styles.actions}><PlanButton title="Atualizar plano e consumo" disabled={state.loading} onPress={() => void state.refresh()} /><PlanButton title="Comparar Planos" onPress={() => router.push('/plan/compare' as never)} /></View>
    {state.loading ? <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator color={palette.accent} /><Copy>Consultando plano e consumo…</Copy></View> : !data ? <Failure error={state.error} refresh={state.refresh} /> : null}
    {account && quota ? <>
      <Section title={planLabel(account.effectivePlan, account.plan.name)}>
        <Copy>Plano efetivo · {planLabel(account.effectivePlan, account.plan.name)}</Copy><Copy>Estado da assinatura · {subscriptionLabel(account)}</Copy>
        {account.effectivePlan === 'free' ? <Copy muted>O plano Gratuito é permanente. Sincronização e armazenamento privado fazem parte dele.</Copy> : <Copy muted>Este acesso não comprova pagamento. A contratação comercial ainda não está disponível.</Copy>}
        <Copy muted>{account.subscription.grantSource === 'trusted_backend' ? 'Origem da concessão: administração do Aldus.' : 'Origem da concessão: atribuição automática do servidor.'}</Copy>
        {account.subscription.planId !== account.effectivePlan ? <Copy muted>A concessão de {planLabel(account.subscription.planId)} não está vigente. O plano efetivo acima determina a franquia atual.</Copy> : null}
        {account.subscription.endsAt ? <Copy>Fim da concessão: {dateLabel(account.subscription.endsAt)}</Copy> : null}
        <Copy muted>Fonte: servidor autenticado · Consultado em {state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString('pt-BR') : '—'}</Copy>
      </Section>
      <Section title="Biblioteca e armazenamento">
        <Meter title="Livros sincronizados" used={quota.usage.syncedBooks} limit={quota.limits.syncedBooks} />
        <Copy muted>Livros disponíveis na franquia: {quota.remaining.syncedBooks.toLocaleString('pt-BR')}</Copy>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <Meter title="Armazenamento utilizado" used={quota.usage.storageBytes} limit={quota.limits.storageBytes} reserved={quota.usage.reservedBytes} bytes />
        <Copy>Reservado para envios: {formatBytes(quota.usage.reservedBytes)} · {quota.usage.reservedUploads.toLocaleString('pt-BR')} {quota.usage.reservedUploads===1?'envio reservado':'envios reservados'}</Copy>
        <Copy>Espaço disponível: {formatBytes(quota.remaining.storageBytes)}</Copy>
        <Copy muted>Arquivos registrados na nuvem: {quota.usage.objects.toLocaleString('pt-BR')}</Copy>
        {quota.usage.storageBytes !== null && quota.usage.storageBytes > quota.limits.storageBytes ? <Copy>Excesso de armazenamento: {formatBytes(quota.usage.storageBytes - quota.limits.storageBytes)}</Copy> : null}
        {quota.usage.syncedBooks > quota.limits.syncedBooks ? <Copy>Livros acima da franquia: {quota.usage.syncedBooks - quota.limits.syncedBooks}</Copy> : null}
        <Copy muted>A barra destaca o uso em cor de destaque e as reservas em cinza. Reservas ainda não são arquivos armazenados. A disponibilidade já desconta essas reservas.</Copy>
        {full ? <Text accessibilityRole="alert" style={{ color: palette.text, lineHeight: 23 }}>{quota.overLimit ? 'Consumo acima da franquia atual.' : 'Franquia atingida.'} Seus dados continuam disponíveis. Novos envios que aumentem o consumo poderão aguardar espaço; leitura, importações locais e alterações permitidas continuam.</Text> : null}
        <PlanButton title="Gerenciar minha biblioteca" onPress={() => router.push('/library' as never)} />
        <Copy muted>Para liberar espaço, use as ações de cada livro e confira a confirmação. Remover do dispositivo mantém o arquivo na conta; remover da biblioteca afeta a conta e os dispositivos.</Copy>
      </Section>
      <Section title="Benefícios ativos">{Object.entries(featureLabels).filter(([key]) => account.features[key] === true).map(([key, label]) => <Copy key={key}>✓ {label}</Copy>)}</Section>
    </> : null}
    <Section title="Sincronização"><LibrarySyncControls showPlanLink={false} showQuotaSummary={false} /></Section>
  </Layout>;
}
function CatalogCard({ plan }: { plan: CatalogPlan }) {
  const { palette } = useAppTheme();
  return <View style={[styles.catalog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{planLabel(plan.id, plan.name)}</Text>
    <Text style={{ color: palette.text, fontSize: 22, fontWeight: '600' }}>{catalogPrice(plan)}</Text>
    {plan.priceBrlCentavos !== null && plan.id !== 'free' ? <Copy muted>Valor mensal de catálogo, apenas informativo.</Copy> : null}
    {plan.annualBrlCentavos !== null ? <Copy muted>Catálogo anual: {(plan.annualBrlCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Valor informativo.</Copy> : null}
    <Copy>{plan.limits.syncedBooks.toLocaleString('pt-BR')} livros sincronizados</Copy><Copy>{formatBytes(plan.limits.storageBytes)} de armazenamento privado</Copy>
    <View style={[styles.divider, { backgroundColor: palette.border }]} />
    {Object.entries(featureLabels).filter(([key]) => plan.features[key] === true).map(([key, label]) => <Copy key={key}>✓ {label}</Copy>)}
    {plan.id === 'free' ? <Copy muted>Gratuito e permanente.</Copy> : <><PlanButton title="Contratação ainda indisponível" disabled /><Copy muted>Sem cobrança, oferta ou avaliação automática. Benefícios premium futuros serão informados quando estiverem disponíveis.</Copy></>}
  </View>;
}
export function ComparePlansScreen() {
  const state = useSaasRead(readCatalog), { palette } = useAppTheme();
  return <Layout title="Comparar Planos" subtitle="A leitura é para todos. Compare a capacidade disponível no catálogo do Aldus.">
    <View style={styles.actions}><PlanButton title="Meu Plano" onPress={() => router.push('/plan' as never)} /><PlanButton title="Atualizar catálogo" disabled={state.loading} onPress={() => void state.refresh()} /></View>
    {state.loading ? <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator color={palette.accent} /><Copy>Consultando catálogo…</Copy></View> : state.data ? <View style={styles.catalogs}>{state.data.map(plan => <CatalogCard key={plan.id} plan={plan} />)}</View> : <Failure error={state.error} refresh={state.refresh} />}
    <Copy muted>Leitura e importação local são gratuitas. Sincronização e armazenamento privado também fazem parte do plano Gratuito. Nenhum plano pode ser contratado por esta tela.</Copy>
    <Copy muted>As franquias de catálogo representam o produto Aldus. A disponibilidade operacional da nuvem depende da infraestrutura ativa; esta comparação não promete ativação comercial do Pro.</Copy>
  </Layout>;
}
const styles = StyleSheet.create({
  page: { padding: 24, gap: 18, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  title: { fontSize: 30, fontWeight: '700' }, sectionTitle: { fontSize: 21, fontWeight: '600' },
  section: { padding: 20, gap: 16, borderWidth: 1, borderRadius: 14 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { minHeight: 46, paddingVertical: 13, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderRadius: 9, flexShrink: 1 },
  divider: { height: 1 }, loading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  catalogs: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, catalog: { flexBasis: 320, flexGrow: 1, flexShrink: 1, minWidth: 0, padding: 20, gap: 16, borderWidth: 1, borderRadius: 14 },
});
