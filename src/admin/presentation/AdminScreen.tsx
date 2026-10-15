import { useCallback,useEffect,useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator,ScrollView,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { AdminError,adminRepository } from '../data/AdminRepository';
import { AdminFilters,AdminResults,AdminSection,AdminSession,canAdmin,SECTION_PERMISSION } from '../domain/contracts';
import { useAdminAccess } from './useAdminAccess';
import { AdminMfa } from './AdminMfa';
import { AdminMetrics } from './AdminMetrics';
import { AdminUsers } from './AdminUsers';
import { AdminCatalog } from './AdminCatalog';
import { AdminConfiguration,AdminMembers } from './AdminConfiguration';
import { Button,Card,ConfirmChange,dateLabel,Field,Label,Muted,PendingChange,rowStyle } from './components';

const sections:{id:AdminSection;label:string}[]=[{id:'overview',label:'Visão Geral'},{id:'users',label:'Usuários'},{id:'subscriptions',label:'Assinaturas'},{id:'plans',label:'Planos e Preços'},{id:'storage',label:'Armazenamento'},{id:'metrics',label:'Métricas'},{id:'settings',label:'Configurações'},{id:'members',label:'Administradores'},{id:'audit',label:'Auditoria'},{id:'health',label:'Saúde do Sistema'}];
export default function AdminScreen(){
 const access=useAdminAccess();const {palette}=useAppTheme();const insets=useSafeAreaInsets();
 const refresh=useCallback(()=>{void access.refresh();},[access.refresh]);
 return <View style={{flex:1,backgroundColor:palette.background,paddingTop:Math.max(insets.top,12)}}><ScrollView contentContainerStyle={{padding:18,paddingBottom:Math.max(insets.bottom,24),maxWidth:1400,width:'100%',alignSelf:'center'}}>
  <View style={[rowStyle,{justifyContent:'space-between',marginBottom:18}]}><View><Text style={{fontSize:30,fontWeight:'700',color:palette.text}}>Aldus Admin</Text><Muted>Administração do aplicativo e da plataforma</Muted></View><Button title="Voltar aos Ajustes" onPress={()=>router.replace('/settings' as never)}/></View>
  {access.loading?<Card title="Verificando autorização"><ActivityIndicator color={palette.accent}/><Muted>Consultando permissões no servidor…</Muted></Card>:access.session?<AdminContent key={access.session.userId} session={access.session} refreshAccess={refresh}/>:<Card title="Acesso administrativo indisponível"><Label>{access.error||'Acesso negado.'}</Label><Muted>Esta área exige uma associação administrativa verificada no servidor. Free, Pro e master não concedem acesso. O contrato pode ainda depender de implantação.</Muted><Button title="Verificar autorização novamente" onPress={refresh}/></Card>}
 </ScrollView></View>;
}
function AdminContent({session,refreshAccess}:{session:AdminSession;refreshAccess:()=>void}){
 const [section,setSection]=useState<AdminSection>(()=>sections.find(s=>canAdmin(session,SECTION_PERMISSION[s.id]))?.id??'overview');
 const [filters,setFilters]=useState<AdminFilters>({}),[from,setFrom]=useState(''),[until,setUntil]=useState('');
 const [data,setData]=useState<AdminResults[keyof AdminResults]|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 const [change,setChange]=useState<PendingChange|null>(null),[saved,setSaved]=useState(false);
 const [selectedUser,setSelectedUser]=useState<string|null>(null);
 const {palette}=useAppTheme();const permitted=canAdmin(session,SECTION_PERMISSION[section]);
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError('');setLoading(true);
  if(!permitted){setLoading(false);return()=>controller.abort();}
  void adminRepository.read(section,filters,controller.signal).then(v=>{if(!controller.signal.aborted)setData(v);}).catch(e=>{
   if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Consulta indisponível.');if(e instanceof AdminError&&e.code==='denied')refreshAccess();}
  }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[section,filters,reload,permitted,refreshAccess]);
 function period(){
  if((from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))||(until&&!/^\d{4}-\d{2}-\d{2}$/.test(until))){setError('Use datas no formato AAAA-MM-DD.');return;}
  const start=from?new Date(`${from}T00:00:00Z`):null,end=until?new Date(`${until}T23:59:59Z`):null;
  if((start&&!Number.isFinite(start.getTime()))||(end&&!Number.isFinite(end.getTime()))){setError('Datas inválidas.');return;}
  setFilters(v=>({...v,page:0,from:start?.toISOString(),until:end?.toISOString()}));
 }
 function ask(next:PendingChange){setSaved(false);setChange(next);}
 return <>
 <Muted>Papel verificado: {session.role} · {session.userId}</Muted><View style={[rowStyle,{marginVertical:14}]}>{sections.filter(s=>canAdmin(session,SECTION_PERMISSION[s.id])).map(s=><Button key={s.id} title={`${section===s.id?'• ':''}${s.label}`} onPress={()=>{setData(null);setSection(s.id);setFilters({});setSaved(false);}}/>)}</View>
 <AdminMfa recent={session.recentMfa} onVerified={refreshAccess}/>
 {['overview','users','metrics','subscriptions','storage','audit','health'].includes(section)&&permitted&&<Card title="Período da consulta"><Muted>Sem filtro: últimos 30 dias nas métricas; todas as contas na lista de usuários. Intervalo máximo: 366 dias. Fuso dos filtros: UTC.</Muted><View style={rowStyle}><View style={{flex:1,minWidth:160}}><Field label="Data inicial AAAA-MM-DD" value={from} onChange={setFrom}/></View><View style={{flex:1,minWidth:160}}><Field label="Data final AAAA-MM-DD" value={until} onChange={setUntil}/></View><Button title="Aplicar período" onPress={period}/><Button title="Limpar período" onPress={()=>{setFrom('');setUntil('');setFilters(v=>({...v,page:0,from:undefined,until:undefined}));}}/></View></Card>}
 <View style={[rowStyle,{marginBottom:12}]}><Button title="Atualizar dados" onPress={()=>setReload(v=>v+1)}/><Button title="Revalidar permissões" onPress={refreshAccess}/>{saved&&<Label>Alteração confirmada e auditada pelo servidor.</Label>}</View>
 {!permitted?<Card title="Acesso negado"><Muted>Nenhuma permissão delegada para esta seção.</Muted></Card>:loading?<ActivityIndicator color={palette.accent}/>:error?<Card title="Consulta indisponível"><Label>{error}</Label></Card>:data?<>
 {['overview','subscriptions','storage','metrics','health'].includes(section)&&<AdminMetrics data={data as AdminResults['overview']} kind={section}/>}
 {section==='users'&&<AdminUsers rows={(data as AdminResults['users']).rows} page={(data as AdminResults['users']).page} filters={filters} onFilters={setFilters} session={session} ask={ask} reload={reload} onDenied={refreshAccess} selected={selectedUser} setSelected={setSelectedUser}/>}
 {section==='plans'&&<AdminCatalog data={data as AdminResults['plans']} enabled={session.recentMfa} ask={ask}/>}
 {section==='settings'&&<AdminConfiguration data={data as AdminResults['settings']} enabled={session.recentMfa} ask={ask}/>}
 {section==='members'&&<AdminMembers rows={(data as AdminResults['members']).rows} enabled={session.recentMfa} actor={session.userId} ask={ask}/>}
 {section==='audit'&&<Card title="Auditoria administrativa">{(data as AdminResults['audit']).rows.length?(data as AdminResults['audit']).rows.map((a,i)=><View key={a.id??i} style={{marginVertical:8}}><Label>{dateLabel(a.occurred_at)} · {a.action} · {a.outcome}</Label><Muted>Ator: {a.actor??'Bootstrap confiável'} · Recurso: {a.resource}</Muted><Muted>{a.reason??'Motivo minimizado para ação negada.'}</Muted></View>):<Muted>Nenhum evento no período.</Muted>}<View style={rowStyle}><Button title="Auditoria: página anterior" disabled={!filters.page} onPress={()=>setFilters(v=>({...v,page:(v.page??0)-1}))}/><Button title="Auditoria: próxima página" disabled={(data as AdminResults['audit']).rows.length<25} onPress={()=>setFilters(v=>({...v,page:(v.page??0)+1}))}/></View></Card>}
 </>:<Card title="Nenhum dado"><Muted>Não há registros disponíveis.</Muted></Card>}
 {change&&<ConfirmChange key={`${change.target}:${change.command.action}`} change={change} onClose={()=>setChange(null)} onSaved={()=>{setSaved(true);setReload(v=>v+1);}} onDenied={refreshAccess}/>}
 </>;
}
