import { dateTimeInputFromIso, dateTimeInputToIso, planLabel, termLabel } from '@/src/presentation/i18n/ptBR';
import { useEffect,useState } from 'react';
import { View,useWindowDimensions } from 'react-native';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { AdminFilters,AdminSession,AdminUserDetail,AdminUserRow,canAdmin } from '../domain/contracts';
import { adminRepository } from '../data/AdminRepository';
import { Button,bytes,Card,dateLabel,Field,Label,Muted,PendingChange,rowStyle } from './components';

export function AdminUsers({rows,page,filters,onFilters,session,ask,reload,onDenied,selected,setSelected}:{rows:AdminUserRow[];page:number;filters:AdminFilters;onFilters:(f:AdminFilters)=>void;session:AdminSession;ask:(v:PendingChange)=>void;reload:number;onDenied:()=>void;selected:string|null;setSelected:(id:string|null)=>void}){
 const [search,setSearch]=useState(filters.search??''),[plan,setPlan]=useState(filters.plan??''),[status,setStatus]=useState(filters.status??'');
 const {width}=useWindowDimensions(),{palette}=useAppTheme(),wide=width>=1200;
 return <><Card title="Pesquisar contas"><Field label="Nome, nome de usuário, e-mail ou identificador" value={search} onChange={setSearch}/>
  <Label>Plano da conta</Label><View style={rowStyle}>{([['','Todos os planos'],['free','Gratuito'],['pro','Pro']] as const).map(([id,label])=><Button key={id} title={label} selected={plan===id} onPress={()=>setPlan(id)}/>)}</View>
  <Label>Situação da conta</Label><View style={rowStyle}>{([['','Todas as contas'],['active','Ativas'],['disabled','Desativadas']] as const).map(([id,label])=><Button key={id} title={label} selected={status===id} onPress={()=>setStatus(id)}/>)}</View>
  <Button title="Pesquisar usuários" onPress={()=>{setSelected(null);onFilters({...filters,page:0,search,plan,status});}}/>
 </Card>
 <Card title="Usuários"><Muted>Página {(page+1).toLocaleString('pt-BR')} · até 25 contas. E-mails exigem permissão para consultar usuários. Abra Gerenciar para consultar consumo e benefícios.</Muted>
  <View role={wide&&rows.length?'table':undefined} aria-label={wide?'Contas do Aldus':undefined}>
  {wide&&rows.length?<View role="row" style={[rowStyle,{paddingVertical:12,borderBottomWidth:1,borderColor:palette.border}]}><View role="columnheader" style={{flex:2}}><Label>Conta</Label></View><View role="columnheader" style={{flex:1}}><Label>Plano e situação</Label></View><View role="columnheader" style={{flex:1}}><Label>Cadastro</Label></View><View role="columnheader" style={{width:165}}><Label>Ações</Label></View></View>:null}
  {rows.length?rows.map(u=><View role={wide?'row':undefined} key={u.id} style={{paddingVertical:16,borderBottomWidth:1,borderColor:palette.border,flexDirection:wide?'row':'column',alignItems:wide?'center':'stretch',gap:12}}>
   <View role={wide?'cell':undefined} style={{flex:wide?2:undefined,minWidth:0}}><Label>{u.display_name||u.username||'Perfil sem nome'}</Label><Muted>{u.email}</Muted><Muted>{u.id}</Muted></View>
   <View role={wide?'cell':undefined} style={{flex:wide?1:undefined,minWidth:0}}><Label>{planLabel(u.effective_plan)}</Label><Muted>{termLabel(u.account_status)}</Muted></View>
   <View role={wide?'cell':undefined} style={{flex:wide?1:undefined,minWidth:0}}><Label>{dateLabel(u.created_at)}</Label><Muted>Último acesso: {dateLabel(u.last_sign_in_at)}</Muted></View>
   <View role={wide?'cell':undefined} style={{width:wide?165:undefined}}><Button title={`Gerenciar ${u.username||u.id}`} onPress={()=>setSelected(u.id)}/></View>
  </View>):<Muted>Nenhuma conta encontrada. Ajuste os filtros para pesquisar novamente.</Muted>}
  </View>
  <View style={[rowStyle,{marginTop:14}]}><Button title="Usuários: página anterior" disabled={page===0} onPress={()=>onFilters({...filters,page:page-1})}/><Button title="Usuários: próxima página" disabled={rows.length<25} onPress={()=>onFilters({...filters,page:page+1})}/></View>
 </Card>
 {selected&&<UserDetail key={selected} id={selected} session={session} ask={ask} reload={reload} onDenied={onDenied}/>}
 </>;
}
function UserDetail({id,session,ask,reload,onDenied}:{id:string;session:AdminSession;ask:(v:PendingChange)=>void;reload:number;onDenied:()=>void}){
 const [detail,setDetail]=useState<AdminUserDetail|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [endsAt,setEndsAt]=useState(()=>dateTimeInputFromIso(new Date(Date.now()+30*86400000).toISOString())),[feature,setFeature]=useState('premium_future'),[enabled,setEnabled]=useState(true);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setDetail(null);setError('');void adminRepository.read('user',{id},controller.signal).then(v=>{if(!controller.signal.aborted)setDetail(v);}).catch(()=>{if(!controller.signal.aborted){setError('Conta indisponível ou permissão revogada.');onDenied();}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[id,reload,onDenied]);
 if(loading)return <Card title="Carregando conta"><Muted>Consultando o servidor…</Muted></Card>;
 if(!detail)return <Card title="Conta indisponível"><Label>{error||'Conta não encontrada.'}</Label></Card>;
 const expiry=dateTimeInputToIso(endsAt);const validExpiry=!!expiry&&Date.parse(expiry)>Date.now();
 return <><Card title="Informações da conta"><Label>{detail.account.displayName||detail.account.username||id}</Label><Label>{detail.account.email} · E-mail {detail.account.emailVerified?'verificado':'não verificado'}</Label><Label>Status da conta: {termLabel(detail.account.status)}</Label><Muted>Cadastro: {dateLabel(detail.account.createdAt)} · Último login: {dateLabel(detail.account.lastSignInAt)}</Muted>
 {canAdmin(session,'users.write')&&<Button title={detail.account.status==='active'?'Desativar conta':'Reativar conta'} disabled={!session.recentMfa} onPress={()=>ask({title:'Alterar situação da conta',description:'Desativar bloqueia contratos remotos que verificam conta ativa. Não apaga dados nem impede leitura offline previamente autorizada. Contas administrativas exigem gestão separada da associação.',target:id,revision:detail.revision,command:{action:'account_status',payload:{status:detail.account.status==='active'?'disabled':'active'}}})}/>}</Card>
 <Card title="Assinatura e consumo"><Label>Plano efetivo: {planLabel(detail.effectivePlan.id, detail.effectivePlan.name)}</Label><Label>Limites: {detail.effectivePlan.synced_books} livros · {bytes(detail.effectivePlan.storage_bytes)}</Label><Label>Uso: {detail.usage.books} livros · {bytes(detail.usage.storageBytes)}</Label><Label>Assinatura registrada: {detail.subscription ? planLabel(detail.subscription.plan_id) : 'Indisponível'} / {termLabel(detail.subscription?.status)}</Label><Muted>Origem: {termLabel(detail.subscription?.grant_source)} · Expiração: {dateLabel(detail.subscription?.ends_at)}</Muted><Muted>Concessões manuais não são vendas. A redução de plano não apaga livros, progresso, estudo ou arquivos.</Muted>
 {canAdmin(session,'subscriptions.manage')&&<><Field label="Expiração do benefício (DD/MM/AAAA HH:mm, UTC)" value={endsAt} onChange={setEndsAt}/><View style={rowStyle}><Button title="Conceder Pro temporário" disabled={!session.recentMfa||!validExpiry} onPress={()=>ask({title:'Concessão manual de Pro',description:'Benefício temporário sem cobrança. O servidor confirmará a conta ativa e a expiração.',target:id,revision:detail.revision,command:{action:'benefit',payload:{mode:'grant',endsAt:expiry??''}}})}/><Button title="Revogar benefício Pro" disabled={!session.recentMfa} onPress={()=>ask({title:'Revogar benefício',description:'O plano efetivo retorna ao Gratuito. Leitura local, sincronização básica e dados históricos são preservados.',target:id,revision:detail.revision,command:{action:'benefit',payload:{mode:'revoke'}}})}/></View>
 <Field label="Permissão adicional (prefixo premium_)" value={feature} onChange={setFeature}/><View style={rowStyle}><Button title={enabled?'Permissão: permitir':'Permissão: revogar'} onPress={()=>setEnabled(v=>!v)}/><Button title="Preparar concessão premium" disabled={!session.recentMfa||!validExpiry||!/^premium_[a-z0-9_]+$/.test(feature)} onPress={()=>ask({title:'Alterar permissão adicional',description:'A concessão não altera direitos básicos gratuitos e não implementa o recurso premium por si só.',target:id,revision:detail.revision,command:{action:'entitlement',payload:{feature,enabled,endsAt:expiry??''}}})}/></View></>}
 <Label>Permissões efetivas da conta</Label>{Object.entries(detail.features).map(([key,value])=><Muted key={key}>{termLabel(key)}: {value?'permitido':'desligado'}</Muted>)}
 {detail.entitlements.length?detail.entitlements.map(e=><Muted key={e.feature}>{termLabel(e.feature)}: {e.enabled?'permitido':'revogado'} · {dateLabel(e.endsAt)}</Muted>):<Muted>Sem permissões adicionais.</Muted>}</Card>
 <Card title="Sincronização e histórico"><Label>Recibos aceitos: {detail.sync.receipts} · Último: {dateLabel(detail.sync.lastAcceptedAt)}</Label><Muted>Falhas: indisponíveis sem telemetria. Nenhum conteúdo de biblioteca está disponível ao administrador.</Muted>{detail.history.length?detail.history.map((a,i)=><Label key={i}>{dateLabel(a.occurred_at)} · {termLabel(a.action)} · {termLabel(a.outcome)}</Label>):<Muted>Nenhuma ação administrativa registrada para esta conta.</Muted>}</Card></>;
}
