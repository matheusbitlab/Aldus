import { termLabel } from '@/src/presentation/i18n/ptBR';
import { useState } from 'react';
import { View } from 'react-native';
import { ADMIN_PERMISSIONS,AdminMember,AdminPermission,AdminResults,AdminSetting } from '../domain/contracts';
import { Button,Card,dateLabel,Field,Label,Muted,PendingChange,rowStyle } from './components';

export function AdminConfiguration({data,enabled,ask}:{data:AdminResults['settings'];enabled:boolean;ask:(v:PendingChange)=>void}){
 const [selected,setSelected]=useState<string|null>(null);
 const groups=[['Aplicativo','app.'],['Operação','operation.'],['Recursos','features.']] as const;
 const setting=data.rows.find(s=>s.key===selected);
 const summary=(s:AdminSetting)=><Button key={s.key} title={`${termLabel(s.key)} · ${typeof s.value==='boolean'?(s.value?'Ativada':'Desativada'):(s.value.trim().slice(0,84)+(s.value.length>84?'…':'')||'Não definido')}`} selected={selected===s.key} navigation onPress={()=>setSelected(s.key)}/>;
 return <><Muted>Selecione uma configuração para editar. Toda alteração exige confirmação e fica na auditoria.</Muted>
 {groups.map(([title,prefix])=>{const rows=data.rows.filter(s=>s.key.startsWith(prefix));return rows.length?<Card key={prefix} title={title}>{rows.map(summary)}</Card>:null;})}
 {data.rows.filter(s=>!groups.some(([,prefix])=>s.key.startsWith(prefix))).map(summary)}
 {setting?<Setting key={`${setting.key}:${setting.revision}`} setting={setting} history={data.history.filter(h=>h.key===setting.key)} enabled={enabled} ask={ask} onClose={()=>setSelected(null)}/>:null}
 </>;
}
function Setting({setting,history,enabled,ask,onClose}:{setting:AdminSetting;history:AdminResults['settings']['history'];enabled:boolean;ask:(v:PendingChange)=>void;onClose:()=>void}){
 const [value,setValue]=useState(setting.value),[historyOpen,setHistoryOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false);
 return <Card title={`Editar: ${termLabel(setting.key)}`}><Muted>{setting.requires_deploy?'Depende de publicação e integração; não altera o app atual automaticamente.':'Aplicado ao aviso dos Ajustes durante o uso.'}</Muted>
 {typeof value==='boolean'?<Button title={value?'Ativada':'Desativada'} onPress={()=>setValue(v=>!v)}/>:<Field label="Conteúdo da configuração" value={value} onChange={setValue} multiline/>}
 <View style={rowStyle}><Button title="Revisar alteração" disabled={!enabled||value===setting.value} onPress={()=>ask({title:'Alterar configuração',description:'Apenas a chave selecionada será alterada. Direitos básicos gratuitos e estruturas de segurança não são configuráveis aqui.',target:setting.key,revision:setting.revision,command:{action:'setting',payload:{value}}})}/><Button title="Fechar edição" onPress={onClose}/></View>
 <Button title="Histórico de revisões" expanded={historyOpen} onPress={()=>setHistoryOpen(v=>!v)}/>
 {historyOpen?(history.length?history.map(h=><View key={h.id} style={rowStyle}><Muted>Revisão {h.revision} · {dateLabel(h.created_at)}</Muted>{h.revision!==setting.revision&&<Button title={`Restaurar revisão ${h.revision}`} disabled={!enabled} onPress={()=>ask({title:'Restaurar configuração',description:'Cria uma nova revisão com o valor histórico, preservando a trilha de auditoria.',target:setting.key,revision:setting.revision,command:{action:'setting_rollback',payload:{revision:h.revision}}})}/>}</View>):<Muted>Nenhuma revisão anterior disponível.</Muted>):null}
 <Button title="Detalhes avançados" expanded={detailsOpen} onPress={()=>setDetailsOpen(v=>!v)}/>
 {detailsOpen?<><Muted>Identificador: {setting.key} · revisão {setting.revision}</Muted><Muted>Autenticação, permissões, políticas de segurança, segredos e banco não são configuráveis aqui.</Muted></>:null}
 </Card>;
}
export function AdminMembers({rows,enabled,ask,actor}:{rows:AdminMember[];enabled:boolean;ask:(v:PendingChange)=>void;actor:string}){
 const [target,setTarget]=useState(''),[role,setRole]=useState<'OWNER'|'ADMIN'>('ADMIN'),[permissions,setPermissions]=useState<AdminPermission[]>(['users.read','metrics.read']);
 return <><Card title="Administradores"><Muted>Somente o proprietário pode delegar. E-mail verificado e conta ativa são confirmados pelo servidor; o identificador deve corresponder à conta escolhida em Usuários. O papel legado de controle e o plano Pro não concedem administração.</Muted>
 <Field label="UUID da conta a promover" value={target} onChange={setTarget}/><Button title={`Papel proposto: ${termLabel(role)}`} onPress={()=>setRole(v=>v==='ADMIN'?'OWNER':'ADMIN')}/>
 {ADMIN_PERMISSIONS.map(p=><Button key={p} title={`${permissions.includes(p)?'✓':'○'} ${termLabel(p)}`} onPress={()=>setPermissions(v=>v.includes(p)?v.filter(x=>x!==p):[...v,p])}/>)}
 <Button title="Conceder associação administrativa" disabled={!enabled||target===actor||!/^[a-f0-9-]{36}$/.test(target)} onPress={()=>ask({title:'Conceder administração',description:`Papel ${termLabel(role)}. O proprietário controla todas as operações. Administradores recebem somente as permissões listadas. O servidor impede autopromoção.`,target,revision:rows.find(r=>r.user_id===target)?.revision??0,command:{action:'member',payload:{role,permissions,active:true}}})}/></Card>
 {rows.length?rows.map(m=><Card key={m.user_id} title={termLabel(m.role)}><Label>{m.user_id}{m.user_id===actor?' · sua conta':''}</Label><Muted>{m.active?'Ativo':'Revogado'} · {m.permissions.map(termLabel).join(', ')||'Sem delegações específicas'}</Muted><Button title={`Editar delegações ${m.user_id}`} disabled={m.user_id===actor} onPress={()=>{setTarget(m.user_id);setRole(m.role);setPermissions(m.permissions);}}/><Button title={`${m.active?'Revogar':'Reativar'} associação ${m.user_id}`} disabled={!enabled||m.user_id===actor} onPress={()=>ask({title:'Alterar associação administrativa',description:'Revogação vale nas próximas chamadas ao servidor. O último proprietário ativo é protegido.',target:m.user_id,revision:m.revision,command:{action:'member',payload:{role:m.role,permissions:m.permissions,active:!m.active}}})}/></Card>):<Card title="Nenhum administrador"><Muted>Nenhuma associação encontrada.</Muted></Card>}</>;
}
