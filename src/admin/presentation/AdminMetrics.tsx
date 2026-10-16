import { Text, View } from 'react-native';
import { AdminMetrics as Metrics } from '../domain/contracts';
import { bytes, Card, dateLabel, Label, Muted, rowStyle } from './components';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { dayLabel, numberLabel } from '@/src/presentation/i18n/ptBR';

function Indicator({label,value}:{label:string;value:string}) {
 const {palette}=useAppTheme();
 return <View style={{flexGrow:1,flexShrink:1,flexBasis:'22%',minWidth:155,minHeight:118,padding:18,borderRadius:14,backgroundColor:palette.surfaceSecondary,gap:7,justifyContent:'space-between'}}>
  <Muted>{label}</Muted><Text style={{fontSize:27,fontWeight:'700',color:palette.text}}>{value}</Text>
 </View>;
}
export function AdminMetrics({data,kind}:{data:Metrics;kind:string}) {
 const {palette}=useAppTheme();
 const maximum=Math.max(0,...data.registrationsByDay.map(d=>d.count));
 const totalPlans=data.freeAccounts+data.proAccounts;
 return <>
  {['overview','metrics'].includes(kind)?<>
   <Card title="Contas e utilização real"><View style={rowStyle}>
    {([
     ['Usuários cadastrados',data.registeredUsers],['Novos no período',data.newUsers],
     ['Contas gratuitas',data.freeAccounts],['Contas Pro',data.proAccounts],
     ['Assinaturas vigentes',data.activeSubscriptions],['Livros sincronizados',data.usage.books],
     ['Operações de sincronização aceitas',data.syncOperations],['Acessos registrados no período',data.recentSignIns],
    ] as const).map(([label,value])=><Indicator key={label} label={label} value={numberLabel(value)}/>)}
   </View><Muted>Acessos registrados não equivalem a usuários ativos. Atividade, conversão histórica e falhas de sincronização precisam de medição adicional.</Muted></Card>
   <View style={[rowStyle,{alignItems:'stretch',gap:18}]}>
    <View style={{flexGrow:2,flexBasis:450,minWidth:0}}><Card title="Cadastros por dia">
     <Muted>Registros de criação de conta no período selecionado. Datas em português, com agrupamento em UTC.</Muted>
     {data.registrationsByDay.length?<View style={{gap:12}}>
      <View style={{height:170,flexDirection:'row',alignItems:'flex-end',gap:3}}>
       {data.registrationsByDay.map(d=><View key={d.day} accessible accessibilityLabel={`${dayLabel(d.day)}: ${numberLabel(d.count)} cadastros`} style={{flex:1,minWidth:0,height:'100%',justifyContent:'flex-end'}}>
        <View style={{height:`${d.count?Math.max(2,d.count/Math.max(1,maximum)*100):0}%`,backgroundColor:palette.accent,borderTopLeftRadius:4,borderTopRightRadius:4}}/>
       </View>)}
      </View>
      <View style={[rowStyle,{justifyContent:'space-between'}]}><Muted>{dayLabel(data.registrationsByDay[0].day)}</Muted><Muted>{dayLabel(data.registrationsByDay.at(-1)!.day)}</Muted></View>
      <Label>{numberLabel(data.registrationsByDay.reduce((sum,d)=>sum+d.count,0))} cadastros representados · maior valor diário: {numberLabel(maximum)}</Label>
     </View>:<Muted>Nenhum cadastro no período. O gráfico aparecerá quando houver registros.</Muted>}
    </Card></View>
    <View style={{flexGrow:1,flexBasis:260,minWidth:0}}><Card title="Distribuição atual de planos">
     {totalPlans?([['Gratuito',data.freeAccounts],['Pro',data.proAccounts]] as const).map(([label,count])=><View key={label} style={{gap:7,marginVertical:8}}>
      <Label>{label}: {numberLabel(count)}</Label><View accessibilityRole="progressbar" accessibilityLabel={`Contas ${label}`} accessibilityValue={{min:0,max:100,now:Math.round(count/totalPlans*100),text:`${numberLabel(count)} de ${numberLabel(totalPlans)} contas`}} style={{height:10,backgroundColor:palette.surfaceSecondary,borderRadius:5,overflow:'hidden'}}>
       <View style={{height:10,width:`${count/totalPlans*100}%`,backgroundColor:label==='Pro'?palette.text:palette.accent}}/>
      </View></View>):<Muted>Nenhuma conta com plano contabilizado.</Muted>}
     <Muted>Retrato atual, sem série histórica de mudanças de plano.</Muted>
    </Card></View>
   </View>
  </>:null}
  {['overview','subscriptions'].includes(kind)?<Card title="Assinaturas e financeiro">
   <View style={rowStyle}><Indicator label="Assinaturas vigentes" value={numberLabel(data.activeSubscriptions)}/><Indicator label="Assinaturas expiradas" value={numberLabel(data.expiredSubscriptions)}/><Indicator label="Concessões manuais Pro" value={numberLabel(data.manualProGrants)}/></View>
   <Muted>Concessão administrativa é um benefício, não uma venda. Os preços do catálogo são informativos.</Muted>
   <View style={[rowStyle,{alignItems:'stretch'}]}>{['Receita mensal','Receita anual','Receita total','Conversão de Gratuito para Pro','Cancelamentos','Histórico de pagamentos'].map(label=><View key={label} style={{flex:1,flexBasis:260,padding:14,borderWidth:1,borderColor:palette.border,borderRadius:12}}><Label>{label}</Label><Muted>Aguardando integração de pagamentos.</Muted></View>)}</View>
  </Card>:null}
  {['overview','storage','metrics'].includes(kind)?<Card title="Armazenamento privado">
   <View style={rowStyle}><Indicator label="Armazenamento utilizado" value={bytes(data.usage.storageBytes)}/><Indicator label="Média por conta cadastrada" value={bytes(data.averageStorageBytes,true)}/><Indicator label="Livros sincronizados" value={numberLabel(data.usage.books)}/><Indicator label="Objetos privados" value={numberLabel(data.usage.objects)}/></View>
   <Muted>Objetos com tamanho em verificação: {numberLabel(data.usage.unknownSizeObjects)}. O administrador recebe agregados, sem acesso ao conteúdo privado.</Muted>
   <Muted>Histórico de crescimento de armazenamento indisponível: o contrato atual oferece somente o retrato de uso. Nenhuma evolução foi estimada.</Muted>
  </Card>:null}
  {kind==='health'?<Card title="Saúde do Sistema">
   <Label>Banco de dados: conexão confirmada nesta consulta.</Label><Muted>Observado em {dateLabel(data.observedAt)}</Muted>
   <Label>Operações de sincronização aceitas: {numberLabel(data.syncOperations)}</Label>
   <Muted>Autenticação, falhas de sincronização e processamento: telemetria agregada indisponível. Recibos de sucesso não medem falhas.</Muted>
   <Muted>Drive, transferência de arquivos e publicações: monitoramento indisponível. Exige sondas operacionais autorizadas.</Muted>
   <Muted>Credenciais administrativas do Supabase e da Vercel não são usadas pelo navegador.</Muted>
  </Card>:null}
 </>;
}
