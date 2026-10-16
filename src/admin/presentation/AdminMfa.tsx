import { useEffect,useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/src/data/remote/supabase';
import { Button,Card,Field,Label,Muted,rowStyle } from './components';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';

export function AdminMfa({recent,onVerified}:{recent:boolean;onVerified:()=>void}){
 const {palette}=useAppTheme();
 const [factor,setFactor]=useState(''),[secret,setSecret]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;void supabase?.auth.mfa.listFactors().then(({data})=>{if(alive)setFactor(data?.totp.find(f=>f.status==='verified')?.id??'');}).catch(()=>{if(alive)setError('Não foi possível consultar os fatores MFA.');});return()=>{alive=false;};},[]);
 async function enroll(){if(!supabase)return;setBusy(true);setError('');try{
  const {data,error:failure}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:`Aldus Admin ${new Date().toISOString()}`});
  if(failure||!data)throw Error();setFactor(data.id);setSecret(data.totp.secret);
 }catch{setError('Não foi possível iniciar TOTP. Confira a disponibilidade MFA do projeto.');}finally{setBusy(false);}}
 async function verify(){if(!supabase)return;setBusy(true);setError('');try{
  const {error:failure}=await supabase.auth.mfa.challengeAndVerify({factorId:factor,code});if(failure)throw Error();setSecret('');setCode('');onVerified();
 }catch{setError('Código não verificado. Nenhuma permissão administrativa foi ampliada.');}finally{setBusy(false);}}
 if(recent)return <View style={{paddingVertical:9,paddingHorizontal:14,marginBottom:14,borderRadius:10,borderWidth:1,borderColor:palette.border,backgroundColor:palette.surface}}><Label>MFA recente confirmado pelo servidor.</Label><Muted>Alterações continuam sujeitas à validação de permissão e segundo fator pelo servidor.</Muted></View>;
 return <Card title="Segurança das operações"><Label>Operações críticas bloqueadas até validar TOTP recente.</Label>
  <Muted>Leituras exigem membro administrativo ativo, e-mail verificado e sessão válida. Alterações exigem segundo fator nos últimos 10 minutos.</Muted>
  {!factor?<Button title="Configurar autenticador TOTP" disabled={busy} onPress={()=>void enroll()}/>:<><Label>{secret?'Adicione esta chave ao seu autenticador. Ela aparece somente nesta sessão de configuração.':''}</Label>{secret?<Label>{secret}</Label>:null}<View style={rowStyle}><View style={{flex:1,minWidth:180}}><Field label="Código TOTP de 6 dígitos" value={code} onChange={setCode} secure/></View><Button title="Verificar TOTP" disabled={busy||!/^\d{6}$/.test(code)} onPress={()=>void verify()}/></View></>}
  {!!error&&<Label>{error}</Label>}
 </Card>;
}
