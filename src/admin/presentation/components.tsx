import { PropsWithChildren,useState } from 'react';
import { Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatBytes } from '@/src/domain/saas/planPresentation';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { AdminCommand } from '../domain/contracts';
import { adminRepository } from '../data/AdminRepository';
import { newLibraryId } from '@/src/domain/entities/libraryId';

export function Card({title,children}:PropsWithChildren<{title:string}>){const {palette}=useAppTheme();return <View style={[styles.card,{backgroundColor:palette.surface,borderColor:palette.border}]}><Text accessibilityRole="header" style={[styles.heading,{color:palette.text}]}>{title}</Text>{children}</View>;}
export function Label({children}:PropsWithChildren){const {palette}=useAppTheme();return <Text selectable style={{color:palette.text,lineHeight:22,marginVertical:3}}>{children}</Text>;}
export function Muted({children}:PropsWithChildren){const {palette}=useAppTheme();return <Text style={{color:palette.secondaryText,lineHeight:21,marginVertical:3}}>{children}</Text>;}
export function Button({title,onPress,disabled=false,accessibilityLabel,selected=false,expanded,icon,navigation=false}: {title:string;onPress:()=>void;disabled?:boolean;accessibilityLabel?:string;selected?:boolean;expanded?:boolean;icon?:React.ComponentProps<typeof Ionicons>['name'];navigation?:boolean}){
 const {palette,resolvedTheme}=useAppTheme();const selectedInk=resolvedTheme==='light'?'#9D4F32':palette.accent;
 return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??title} accessibilityState={{disabled,selected,expanded}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,{borderColor:selected?selectedInk:navigation?'transparent':palette.border,backgroundColor:selected||pressed?palette.surfaceSecondary:navigation?'transparent':palette.surface,opacity:disabled ? 0.55 : 1,flexDirection:'row',gap:10,alignItems:'center',justifyContent:navigation?'flex-start':'center'}]}>{icon?<Ionicons name={icon} size={19} color={selected?selectedInk:palette.secondaryText}/>:null}{title?<Text style={{color:selected?selectedInk:palette.text,fontWeight:'600',flexShrink:1}}>{title}</Text>:null}</Pressable>;
}
export function Field({label,value,onChange,secure=false,multiline=false}:{label:string;value:string;onChange:(v:string)=>void;secure?:boolean;multiline?:boolean}){
 const {palette}=useAppTheme();return <View style={{marginVertical:6}}><Label>{label}</Label><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} secureTextEntry={secure} multiline={multiline} autoCapitalize="none" style={[styles.input,{color:palette.text,backgroundColor:palette.input,borderColor:palette.border,minHeight:multiline?76:44}]}/></View>;
}
export const rowStyle={flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'} as const;
export const money=(n:number|null|undefined)=>n==null?'Não definido':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
export const bytes=(n:number|null|undefined,allowFraction=false)=>formatBytes(n??null,allowFraction);
export const dateLabel=(v:string|null|undefined)=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('pt-BR'):'Data indisponível';
export interface PendingChange {title:string;description:string;target:string;revision:number;command:AdminCommand}
export function ConfirmChange({change,onClose,onSaved,onDenied}:{change:PendingChange;onClose:()=>void;onSaved:()=>void;onDenied:()=>void}){
 const {palette}=useAppTheme();const [reason,setReason]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [requestId,setRequestId]=useState(newLibraryId);
 async function submit(){setBusy(true);setError('');try{
  const result=await adminRepository.change(requestId,change.target,change.revision,change.command,reason,confirmation,new AbortController().signal);
  if(result.ok){onSaved();onClose();}
  else if(result.code==='conflict')setError('O recurso mudou. Feche, atualize os dados e revise a ação.');
  else if(result.code==='forbidden_or_mfa'){setError('Permissão revogada ou MFA recente necessário. Atualize a autorização.');onDenied();}
  else setError(result.code==='rate_limit'?'Limite de operações atingido. Aguarde um minuto.':'O servidor rejeitou a configuração. Revise os campos.');
 }catch{setError('Resposta indisponível. Tentar novamente usa o mesmo identificador e evita duplicar a ação.');}finally{setBusy(false);}}
 return <Modal visible transparent animationType="fade" onRequestClose={()=>{if(!busy)onClose();}}><View style={styles.scrim}><ScrollView keyboardShouldPersistTaps="handled" accessibilityViewIsModal style={[styles.dialog,{backgroundColor:palette.surface,borderColor:palette.border,maxHeight:'90%'}]}>
  <Text style={[styles.heading,{color:palette.text}]}>{change.title}</Text><Label>{change.description}</Label><Muted>Recurso: {change.target}. A ação será auditada e exige TOTP verificado nos últimos 10 minutos.</Muted>
  <Field label="Motivo administrativo (mínimo 8 caracteres, sem dados sensíveis)" value={reason} onChange={v=>{setReason(v);setRequestId(newLibraryId());}}/>
  <Field label={`Digite CONFIRMAR ${change.target}`} value={confirmation} onChange={setConfirmation}/>
  {!!error&&<Label>{error}</Label>}<View style={rowStyle}><Button title={busy?'Salvando…':'Confirmar operação'} disabled={busy||reason.trim().length<8||confirmation!==`CONFIRMAR ${change.target}`} onPress={()=>void submit()}/><Button title="Cancelar" disabled={busy} onPress={onClose}/></View>
 </ScrollView></View></Modal>;
}
const styles=StyleSheet.create({card:{borderWidth:1,borderRadius:14,padding:18,marginBottom:14,gap:5},heading:{fontSize:20,fontWeight:'700',marginBottom:8},button:{minHeight:44,paddingHorizontal:14,paddingVertical:12,borderWidth:1,borderRadius:9,justifyContent:'center'},input:{borderWidth:1,borderRadius:8,padding:11,fontSize:15},scrim:{flex:1,backgroundColor:'rgba(0,0,0,.5)',justifyContent:'center',alignItems:'center',padding:18},dialog:{padding:22,borderRadius:14,borderWidth:1,width:'100%',maxWidth:680}});
