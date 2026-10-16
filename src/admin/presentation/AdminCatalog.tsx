import { useState } from 'react';
import { View } from 'react-native';
import { AdminPlan,AdminResults } from '../domain/contracts';
import { Button,Card,dateLabel,Field,Label,money,Muted,PendingChange,rowStyle } from './components';
import { planLabel } from '@/src/presentation/i18n/ptBR';

export function AdminCatalog({data,ask,enabled}:{data:AdminResults['plans'];ask:(v:PendingChange)=>void;enabled:boolean}){
 const [proposalId,setProposalId]=useState(''),[proposalName,setProposalName]=useState(''),[description,setDescription]=useState('');
 return <><Card title="Planos e preços"><Muted>Catálogo comercial; nenhuma cobrança ativa. Preço efetivamente cobrado: Aguardando integração de pagamentos. Futuro faturamento deverá fixar a versão do preço no contrato.</Muted></Card>
 {data.rows.map(p=><PlanEditor key={`${p.id}:${p.revision}`} plan={p} ask={ask} enabled={enabled}/>)}
 <Card title="Proposta de novo plano"><Muted>Propostas ficam registradas para revisão e não alteram o catálogo ativo ou criam cobranças.</Muted><Field label="Identificador da proposta" value={proposalId} onChange={setProposalId}/><Field label="Nome da proposta" value={proposalName} onChange={setProposalName}/><Field label="Descrição da proposta" value={description} onChange={setDescription}/><Button title="Registrar proposta" disabled={!enabled||!/^[a-z][a-z0-9_]{1,63}$/.test(proposalId)||!proposalName.trim()} onPress={()=>ask({title:'Registrar proposta de plano',description:'Não ativará um novo plano nem iniciará cobrança.',target:proposalId,revision:0,command:{action:'plan_proposal',payload:{name:proposalName,description}}})}/>{data.proposals.map(p=><Label key={p.id}>{p.proposal.id}: {p.proposal.name} · proposta pendente</Label>)}</Card>
 <Card title="Histórico de preços e vigência">{data.priceHistory.map(p=><Label key={p.id}>{p.plan_id} · mensal {money(p.monthly_brl_centavos)} · anual {money(p.annual_brl_centavos)} · vigente desde {dateLabel(p.effective_from)} · sem faturamento</Label>)}</Card></>;
}
function PlanEditor({plan,ask,enabled}:{plan:AdminPlan;ask:(v:PendingChange)=>void;enabled:boolean}){
 const [name,setName]=useState(planLabel(plan.id,plan.name)),[description,setDescription]=useState(plan.commercial_description),[monthly,setMonthly]=useState(plan.price_brl_centavos?.toString()??''),[annual,setAnnual]=useState(plan.annual_brl_centavos?.toString()??(plan.id==='free'?'0':''));
 const [books,setBooks]=useState(String(plan.synced_books)),[storage,setStorage]=useState(String(plan.storage_bytes)),[available,setAvailable]=useState(plan.available);
 const [feature,setFeature]=useState('premium_future'),[features,setFeatures]=useState(()=>Object.fromEntries(Object.entries(plan.features).filter(([key])=>key.startsWith('premium_'))));
 const display=planLabel(plan.id,plan.name);
 const numbersValid=/^[1-9]\d*$/.test(books)&&/^[1-9]\d*$/.test(storage)&&(!monthly||/^\d+$/.test(monthly))&&(!annual||/^\d+$/.test(annual));
 return <Card title={`Plano ${display}`}><Muted>Identificador do plano: {plan.id}</Muted><Field label={`Nome comercial ${display}`} value={name} onChange={setName}/><Field label={`Descrição comercial ${display}`} value={description} onChange={setDescription} multiline/>
 <View style={rowStyle}><View style={{flex:1,minWidth:170}}><Field label={`Preço mensal em centavos ${display} (vazio = indefinido)`} value={monthly} onChange={setMonthly}/></View><View style={{flex:1,minWidth:170}}><Field label={`Preço anual em centavos ${display} (vazio = indefinido)`} value={annual} onChange={setAnnual}/></View></View>
 <Field label={`Franquia de livros ${display}`} value={books} onChange={setBooks}/><Field label={`Franquia de bytes ${display}`} value={storage} onChange={setStorage}/>
 <Button title={`Visibilidade no catálogo ${display}: ${available?'visível':'oculto'}`} onPress={()=>setAvailable(v=>!v)}/><Muted>Leitura, importação, sincronização, estudo básico e armazenamento privado permanecem em todos os planos. Alterar limites não exclui dados; restringe apenas crescimento remoto.</Muted>
 <Field label={`Chave de recurso premium ${display}`} value={feature} onChange={setFeature}/><Button title={`Adicionar chave premium ${display}`} disabled={!/^premium_[a-z0-9_]{1,55}$/.test(feature)} onPress={()=>setFeatures(v=>({...v,[feature]:true}))}/>
 {Object.entries(features).map(([key,value])=><Button key={key} title={`${plan.id} · ${key}: ${value?'permitido':'desligado'}`} onPress={()=>setFeatures(v=>({...v,[key]:!value}))}/>)}
 <Button title={`Salvar plano ${display}`} disabled={!enabled||!numbersValid||!name.trim()} onPress={()=>ask({title:`Alterar catálogo ${display}`,description:'Preços são comerciais, com nova versão de vigência imediata. Não alteram faturamento de contratos nem dados de usuários.',target:plan.id,revision:plan.revision,command:{action:'plan',payload:{name,description,monthlyCentavos:monthly?Number(monthly):null,annualCentavos:annual?Number(annual):null,books:Number(books),storageBytes:Number(storage),available,features}}})}/></Card>;
}
