import { termLabel } from '@/src/presentation/i18n/ptBR';
import { useState } from 'react';
import { View } from 'react-native';
import { ADMIN_PERMISSIONS,AdminMember,AdminPermission,AdminResults,AdminSetting } from '../domain/contracts';
import { Button,Card,dateLabel,Field,Label,Muted,PendingChange,rowStyle } from './components';

export function AdminConfiguration({data,enabled,ask}:{data:AdminResults['settings'];enabled:boolean;ask:(v:PendingChange)=>void}){
 const groups=[['Aplicativo','app.'],['Operação','operation.'],['Recursos','features.']] as const;
 return <><Card title="Configurações globais"><Muted>Somente chaves permitidas pelo servidor. Alterações de autenticação, políticas de segurança, armazenamento, segredos ou banco não estão disponíveis. O aviso do aplicativo aparece em Ajustes após atualização; os demais valores estão preparados para integrações futuras e exigem publicação.</Muted></Card>
 {groups.map(([title,prefix])=>{const rows=data.rows.filter(s=>s.key.startsWith(prefix));return rows.length?<View key={prefix}><Label>{title}</Label>{rows.map(s=><Setting key={`${s.key}:${s.revision}`} setting={s} history={data.history.filter(h=>h.key===s.key)} enabled={enabled} ask={ask}/>)}</View>:null;})}
 {data.rows.filter(s=>!groups.some(([,prefix])=>s.key.startsWith(prefix))).map(s=><Setting key={`${s.key}:${s.revision}`} setting={s} history={data.history.filter(h=>h.key===s.key)} enabled={enabled} ask={ask}/>)}
 </>;
}
function Setting({setting,history,enabled,ask}:{setting:AdminSetting;history:AdminResults['settings']['history'];enabled:boolean;ask:(v:PendingChange)=>void}){
 const [value,setValue]=useState(setting.value);return <Card title={termLabel(setting.key)}><Muted>Identificador: {setting.key}</Muted><Muted>{setting.requires_deploy?'Depende de publicação e integração; não altera o app atual automaticamente.':'Aplicado ao aviso das Configurações durante o uso.'} · revisão {setting.revision}</Muted>
 {typeof value==='boolean'?<Button title={`${setting.key}: ${value?'habilitado':'desabilitado'}`} onPress={()=>setValue(v=>!v)}/>:<Field label={`Valor ${setting.key}`} value={value} onChange={setValue} multiline/>}
 <Button title={`Salvar ${setting.key}`} disabled={!enabled} onPress={()=>ask({title:'Alterar configuração',description:'Apenas a chave selecionada será alterada. Direitos básicos gratuitos e estruturas de segurança não são configuráveis aqui.',target:setting.key,revision:setting.revision,command:{action:'setting',payload:{value}}})}/>
 {history.map(h=><View key={h.id} style={rowStyle}><Muted>Revisão {h.revision} · {dateLabel(h.created_at)}</Muted>{h.revision!==setting.revision&&<Button title={`Restaurar ${setting.key} revisão ${h.revision}`} disabled={!enabled} onPress={()=>ask({title:'Restaurar configuração',description:'Cria uma nova revisão com o valor histórico, preservando a trilha de auditoria.',target:setting.key,revision:setting.revision,command:{action:'setting_rollback',payload:{revision:h.revision}}})}/>}</View>)}</Card>;
}
export function AdminMembers({rows,enabled,ask,actor}:{rows:AdminMember[];enabled:boolean;ask:(v:PendingChange)=>void;actor:string}){
 const [target,setTarget]=useState(''),[role,setRole]=useState<'OWNER'|'ADMIN'>('ADMIN'),[permissions,setPermissions]=useState<AdminPermission[]>(['users.read','metrics.read']);
 return <><Card title="Administradores"><Muted>Somente o proprietário pode delegar. E-mail verificado e conta ativa são confirmados pelo servidor; o identificador deve corresponder à conta escolhida em Usuários. O papel legado de controle e o plano Pro não concedem administração.</Muted>
 <Field label="UUID da conta a promover" value={target} onChange={setTarget}/><Button title={`Papel proposto: ${termLabel(role)}`} onPress={()=>setRole(v=>v==='ADMIN'?'OWNER':'ADMIN')}/>
 {ADMIN_PERMISSIONS.map(p=><Button key={p} title={`${permissions.includes(p)?'✓':'○'} ${termLabel(p)}`} onPress={()=>setPermissions(v=>v.includes(p)?v.filter(x=>x!==p):[...v,p])}/>)}
 <Button title="Conceder associação administrativa" disabled={!enabled||target===actor||!/^[a-f0-9-]{36}$/.test(target)} onPress={()=>ask({title:'Conceder administração',description:`Papel ${termLabel(role)}. O proprietário controla todas as operações. Administradores recebem somente as permissões listadas. O servidor impede autopromoção.`,target,revision:rows.find(r=>r.user_id===target)?.revision??0,command:{action:'member',payload:{role,permissions,active:true}}})}/></Card>
 {rows.length?rows.map(m=><Card key={m.user_id} title={termLabel(m.role)}><Label>{m.user_id}{m.user_id===actor?' · sua conta':''}</Label><Muted>{m.active?'Ativo':'Revogado'} · {m.permissions.map(termLabel).join(', ')||'Sem delegações específicas'}</Muted><Button title={`Editar delegações ${m.user_id}`} disabled={m.user_id===actor} onPress={()=>{setTarget(m.user_id);setRole(m.role);setPermissions(m.permissions);}}/><Button title={`${m.active?'Revogar':'Reativar'} associação ${m.user_id}`} disabled={!enabled||m.user_id===actor} onPress={()=>ask({title:'Alterar associação administrativa',description:'Revogação vale nas próximas chamadas ao servidor. O último proprietário ativo é protegido.',target:m.user_id,revision:m.revision,command:{action:'member',payload:{role:m.role,permissions:m.permissions,active:!m.active}}})}/></Card>):<Card title="Nenhum administrador"><Muted>Nenhuma associação encontrada.</Muted></Card>}</>;
}
