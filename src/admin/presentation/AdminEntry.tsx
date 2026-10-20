import { useCallback,useState } from 'react';
import { router,useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/presentation/contexts/AuthContext';
import { useAdminAccess } from './useAdminAccess';
import { adminRepository } from '../data/AdminRepository';
import { Button,Card,Label } from './components';
import { SettingsGroup, SettingsLink } from '@/src/presentation/components/SettingsLayout';

export function AdminEntry({compact=false}:{compact?:boolean}={}){
 const access=useAdminAccess();const {user}=useAuth();const [notice,setNotice]=useState<{owner:string;value:string}|null>(null);
 useFocusEffect(useCallback(()=>{const controller=new AbortController();setNotice(null);if(user)void adminRepository.appNotice(controller.signal).then(value=>{if(!controller.signal.aborted)setNotice({owner:user.id,value});}).catch(()=>{});return()=>controller.abort();},[user?.id]));
 return <>{notice?.owner===user?.id&&notice?.value?<Card title="Aviso do Aldus"><Label>{notice.value}</Label></Card>:null}{access.session?(compact?<SettingsGroup title="Administração"><SettingsLink title="Aldus Admin" icon="shield-checkmark-outline" onPress={()=>router.push('/admin' as never)}/></SettingsGroup>:<Card title="Aldus Admin"><Label>Administração autorizada pelo servidor.</Label><Button title="Abrir Aldus Admin" onPress={()=>router.push('/admin' as never)}/></Card>):null}</>;
}
