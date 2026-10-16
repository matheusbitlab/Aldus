import { useCallback,useEffect,useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator,ScrollView,Text,useWindowDimensions,View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { dateInputToIsoDay,termLabel } from '@/src/presentation/i18n/ptBR';
import { AdminError,adminRepository } from '../data/AdminRepository';
import { AdminFilters,AdminResults,AdminSection,AdminSession,canAdmin,SECTION_PERMISSION } from '../domain/contracts';
import { useAdminAccess } from './useAdminAccess';
import { AdminMfa } from './AdminMfa';
import { AdminMetrics } from './AdminMetrics';
import { AdminUsers } from './AdminUsers';
import { AdminConfiguration,AdminMembers } from './AdminConfiguration';
import { AdminCatalog } from './AdminCatalog';
import { AdminWebStyles } from './AdminWebStyles';
import { Button,Card,ConfirmChange,dateLabel,Field,Label,Muted,PendingChange,rowStyle } from './components';

const sections:{id:AdminSection;label:string;icon:React.ComponentProps<typeof Ionicons>['name'];description:string}[]=[
 {id:'overview',label:'Visão Geral',icon:'grid-outline',description:'Acompanhe as contas e a operação do Aldus.'},
 {id:'users',label:'Usuários',icon:'people-outline',description:'Consulte contas, benefícios e consumo com segurança.'},
 {id:'subscriptions',label:'Assinaturas',icon:'card-outline',description:'Concessões, vigência e situação comercial.'},
 {id:'plans',label:'Planos e Preços',icon:'layers-outline',description:'Gerencie o catálogo e as franquias do produto.'},
 {id:'storage',label:'Armazenamento',icon:'cloud-outline',description:'Uso agregado da biblioteca privada.'},
 {id:'metrics',label:'Métricas',icon:'bar-chart-outline',description:'Indicadores com origem e período identificados.'},
 {id:'settings',label:'Configurações',icon:'options-outline',description:'Configurações permitidas e histórico de revisões.'},
 {id:'members',label:'Administradores',icon:'shield-checkmark-outline',description:'Delegações e associações administrativas.'},
 {id:'audit',label:'Auditoria',icon:'list-outline',description:'Rastreabilidade das operações administrativas.'},
 {id:'health',label:'Saúde do Sistema',icon:'pulse-outline',description:'Estado observado e limites da telemetria disponível.'},
];
export default function AdminScreen(){
 const access=useAdminAccess(),{palette}=useAppTheme(),insets=useSafeAreaInsets();
 const refresh=useCallback(()=>{void access.refresh();},[access.refresh]);
 return <View testID="admin-shell" style={{flex:1,backgroundColor:palette.background,paddingTop:insets.top}}>
  <AdminWebStyles/>
  {access.session?<AdminContent key={access.session.userId} session={access.session} refreshAccess={refresh}/>:<ScrollView contentContainerStyle={{padding:24,width:'100%',maxWidth:1000,alignSelf:'center',gap:18}}>
   <Text accessibilityRole="header" style={{fontSize:32,fontWeight:'700',color:palette.text}}>Painel administrativo</Text>
   <Muted>Aldus Reader · Gestão da plataforma</Muted>
   {access.loading?<Card title="Verificando autorização"><ActivityIndicator color={palette.accent}/><Muted>Consultando permissões no servidor…</Muted></Card>:<Card title="Acesso administrativo indisponível"><Label>{access.error||'Acesso negado.'}</Label><Muted>É necessária uma associação administrativa verificada no servidor. Os planos Gratuito e Pro e o papel legado de controle não concedem acesso. O serviço pode ainda depender de implantação.</Muted><Button title="Verificar autorização novamente" onPress={refresh}/></Card>}
   <Button title="Voltar aos Ajustes" onPress={()=>router.replace('/settings' as never)}/>
  </ScrollView>}
 </View>;
}
function AdminContent({session,refreshAccess}:{session:AdminSession;refreshAccess:()=>void}){
 const [section,setSection]=useState<AdminSection>(()=>sections.find(s=>canAdmin(session,SECTION_PERMISSION[s.id]))?.id??'overview');
 const [filters,setFilters]=useState<AdminFilters>({}),[from,setFrom]=useState(''),[until,setUntil]=useState('');
 const [data,setData]=useState<AdminResults[keyof AdminResults]|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 const [change,setChange]=useState<PendingChange|null>(null),[saved,setSaved]=useState(false),[selectedUser,setSelectedUser]=useState<string|null>(null);
 const [menuOpen,setMenuOpen]=useState(false),[collapsed,setCollapsed]=useState(false),[auditSearch,setAuditSearch]=useState(''),[periodOpen,setPeriodOpen]=useState(false);
 const {palette}=useAppTheme(),{width}=useWindowDimensions(),insets=useSafeAreaInsets();
 const desktop=width>=1040,permitted=canAdmin(session,SECTION_PERMISSION[section]);
 const current=sections.find(s=>s.id===section)!;
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError('');setLoading(true);
  if(!permitted){setLoading(false);return()=>controller.abort();}
  void adminRepository.read(section,filters,controller.signal).then(v=>{if(!controller.signal.aborted)setData(v);}).catch(e=>{
   if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Consulta indisponível.');if(e instanceof AdminError&&e.code==='denied')refreshAccess();}
  }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[section,filters,reload,permitted,refreshAccess]);
 function period(){
  const first=from?dateInputToIsoDay(from):null,last=until?dateInputToIsoDay(until):null;
  if((from&&!first)||(until&&!last)){setError('Use datas válidas no formato DD/MM/AAAA.');return;}
  const start=first?new Date(`${first}T00:00:00Z`):null,end=last?new Date(`${last}T23:59:59Z`):null;
  if(start&&end&&(end<start||end.getTime()-start.getTime()>366*86400000)){setError('O período deve estar em ordem e ter no máximo 366 dias.');return;}
  setFilters(v=>({...v,page:0,from:start?.toISOString(),until:end?.toISOString()}));
 }
 function ask(next:PendingChange){setSaved(false);setChange(next);}
 function select(id:AdminSection){setData(null);setSection(id);setFilters({});setFrom('');setUntil('');setSaved(false);setMenuOpen(false);setAuditSearch('');setSelectedUser(null);}
 const nav=<View accessibilityLabel="Seções administrativas" style={{gap:5}}>{sections.filter(s=>canAdmin(session,SECTION_PERMISSION[s.id])).map(s=><Button key={s.id} title={desktop&&collapsed?'':s.label} accessibilityLabel={s.label} selected={section===s.id} navigation icon={s.icon} onPress={()=>select(s.id)}/>)}</View>;
 const auditRows=section==='audit'&&data?(data as AdminResults['audit']).rows:[];
 const auditFiltered=auditRows.filter(a=>[a.actor,a.resource,termLabel(a.action),termLabel(a.outcome),a.reason].join(' ').toLocaleLowerCase('pt-BR').includes(auditSearch.toLocaleLowerCase('pt-BR')));
 return <View style={{flex:1,flexDirection:'row'}}>
  {desktop?<View testID="admin-sidebar" style={{width:collapsed?84:246,padding:16,borderRightWidth:1,borderColor:palette.border,backgroundColor:palette.surface,gap:22}}>
   <View style={{paddingVertical:18}}><Text style={{fontSize:collapsed?20:30,fontWeight:'700',color:palette.text}}>{collapsed?'A.':'Aldus'}</Text>{!collapsed?<Muted>Painel administrativo</Muted>:null}</View>
   <ScrollView>{nav}</ScrollView><Button title={collapsed?'Expandir menu':'Recolher menu'} onPress={()=>setCollapsed(v=>!v)} icon="menu-outline"/>
  </View>:null}
  <View style={{flex:1,minWidth:0}}>
   <View style={[rowStyle,{padding:desktop?24:16,borderBottomWidth:1,borderColor:palette.border,justifyContent:'space-between',backgroundColor:palette.surface}]}>
    <View style={{flex:1,minWidth:180}}><Text accessibilityRole="header" style={{fontSize:desktop?28:24,fontWeight:'700',color:palette.text}}>{current.label}</Text><Muted>{current.description}</Muted></View>
    <View style={rowStyle}>{!desktop?<Button title={menuOpen?'Fechar navegação':'Abrir navegação'} expanded={menuOpen} icon="menu-outline" onPress={()=>setMenuOpen(v=>!v)}/>:null}<Button title="Voltar aos Ajustes" onPress={()=>router.replace('/settings' as never)}/></View>
   </View>
   <ScrollView contentContainerStyle={{padding:desktop?28:16,paddingBottom:Math.max(insets.bottom,28),width:'100%',gap:6}}>
    {!desktop&&menuOpen?<Card title="Navegação administrativa">{nav}</Card>:null}
    <View style={[rowStyle,{justifyContent:'space-between',marginBottom:16}]}><Muted>Papel verificado: {termLabel(session.role)}</Muted><Muted>{session.recentMfa?'Segundo fator recente confirmado':'Alterações aguardam segundo fator'}</Muted></View>
    <AdminMfa recent={session.recentMfa} onVerified={refreshAccess}/>
    {periodOpen&&['overview','users','metrics','subscriptions','storage','audit','health'].includes(section)&&permitted?<Card title="Período da consulta"><Muted>Sem filtro: últimos 30 dias nas métricas; todas as contas na lista. Intervalo máximo: 366 dias. Fuso dos filtros: UTC.</Muted><View style={rowStyle}>
     <View style={{flex:1,minWidth:160}}><Field label="Data inicial (DD/MM/AAAA)" value={from} onChange={setFrom}/></View><View style={{flex:1,minWidth:160}}><Field label="Data final (DD/MM/AAAA)" value={until} onChange={setUntil}/></View><Button title="Aplicar período" onPress={period}/><Button title="Limpar período" onPress={()=>{setFrom('');setUntil('');setFilters(v=>({...v,page:0,from:undefined,until:undefined}));}}/>
    </View></Card>:null}
    <View style={[rowStyle,{marginBottom:14}]}><Button title="Atualizar dados" onPress={()=>setReload(v=>v+1)} icon="refresh-outline"/><Button title="Revalidar permissões" onPress={refreshAccess}/>{['overview','users','metrics','subscriptions','storage','audit','health'].includes(section)?<Button title={periodOpen?'Ocultar filtros de período':'Filtrar período'} expanded={periodOpen} icon="calendar-outline" onPress={()=>setPeriodOpen(v=>!v)}/>:null}{saved?<Label>Alteração confirmada e auditada pelo servidor.</Label>:null}</View>
    {!permitted?<Card title="Acesso negado"><Muted>Nenhuma permissão delegada para esta seção.</Muted></Card>:loading?<Card title="Carregando dados"><ActivityIndicator color={palette.accent}/></Card>:error?<Card title="Consulta indisponível"><Text accessibilityRole="alert" style={{color:palette.text}}>{error}</Text><Button title="Tentar consulta novamente" onPress={()=>setReload(v=>v+1)}/></Card>:data?<>
     {['overview','subscriptions','storage','metrics','health'].includes(section)?<AdminMetrics data={data as AdminResults['overview']} kind={section}/>:null}
     {section==='users'?<AdminUsers rows={(data as AdminResults['users']).rows} page={(data as AdminResults['users']).page} filters={filters} onFilters={setFilters} session={session} ask={ask} reload={reload} onDenied={refreshAccess} selected={selectedUser} setSelected={setSelectedUser}/>:null}
     {section==='plans'?<AdminCatalog data={data as AdminResults['plans']} enabled={session.recentMfa} ask={ask}/>:null}
     {section==='settings'?<AdminConfiguration data={data as AdminResults['settings']} enabled={session.recentMfa} ask={ask}/>:null}
     {section==='members'?<AdminMembers rows={(data as AdminResults['members']).rows} enabled={session.recentMfa} actor={session.userId} ask={ask}/>:null}
     {section==='audit'?<Card title="Auditoria administrativa"><Field label="Pesquisar nesta página da auditoria" value={auditSearch} onChange={setAuditSearch}/><Muted>{auditFiltered.length} eventos nesta página.</Muted>
      {auditFiltered.length?auditFiltered.map((a,i)=><View key={a.id??i} style={{paddingVertical:14,borderBottomWidth:1,borderColor:palette.border}}><Label>{termLabel(a.action)} · {termLabel(a.outcome)}</Label><Muted>{dateLabel(a.occurred_at)} · Ator: {a.actor??'Provisionamento confiável'} · Recurso: {a.resource}</Muted><Muted>{a.reason??'Motivo minimizado para ação negada.'}</Muted></View>):<Muted>Nenhum evento correspondente nesta página.</Muted>}
      <View style={rowStyle}><Button title="Auditoria: página anterior" disabled={!filters.page} onPress={()=>setFilters(v=>({...v,page:(v.page??0)-1}))}/><Button title="Auditoria: próxima página" disabled={auditRows.length<25} onPress={()=>setFilters(v=>({...v,page:(v.page??0)+1}))}/></View>
     </Card>:null}
    </>:<Card title="Nenhum dado"><Muted>Não há registros disponíveis.</Muted></Card>}
   </ScrollView>
  </View>
  {change?<ConfirmChange key={`${change.target}:${change.command.action}`} change={change} onClose={()=>setChange(null)} onSaved={()=>{setData(null);setLoading(true);setSaved(true);setReload(v=>v+1);}} onDenied={refreshAccess}/>:null}
 </View>;
}
