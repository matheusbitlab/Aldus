import { useCallback,useEffect,useRef,useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminRepository,AdminError } from '../data/AdminRepository';
import { AdminSession } from '../domain/contracts';
import { useAuth } from '@/src/presentation/contexts/AuthContext';
import { libraryAccountScope } from '@/src/data/library/LibraryAccountScope';

/** Never falls back to cached Auth profile.role or email. Recheck on focus/foreground;
 * server rejects every read/write immediately after membership/session revocation. */
export function useAdminAccess(){
 const {user,profile}=useAuth();
 const [state,setState]=useState<{owner:string|null;session:AdminSession|null;loading:boolean;error:string|null}>({owner:null,session:null,loading:true,error:null});
 const generation=useRef(0),pending=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{
  pending.current?.abort();const controller=new AbortController();pending.current=controller;const ticket=++generation.current;
  setState({owner:user?.id??null,session:null,loading:true,error:null});
  if(!user||profile?.id!==user.id||profile.account_status!=='active'){
   setState({owner:user?.id??null,session:null,loading:false,error:'Acesso administrativo negado.'});return;
  }
  try{const session=await adminRepository.session(controller.signal);if(ticket===generation.current&&!controller.signal.aborted)setState({owner:user.id,session,loading:false,error:null});}
  catch(error){if(ticket===generation.current&&!controller.signal.aborted)setState({owner:user.id,session:null,loading:false,error:error instanceof AdminError?error.message:'Administração indisponível.'});}
 },[user?.id,profile?.id,profile?.account_status]);
 useFocusEffect(useCallback(()=>{void refresh();return()=>{generation.current++;pending.current?.abort();};},[refresh]));
 useEffect(()=>{
  const revoke=()=>{generation.current++;pending.current?.abort();setState({owner:null,session:null,loading:false,error:null});};
  const stop=libraryAccountScope.subscribe(revoke);
  const app=AppState.addEventListener('change',next=>{if(next==='active')void refresh();else revoke();});
  return()=>{stop();app.remove();generation.current++;pending.current?.abort();};
 },[refresh]);
 return {...state,session:state.owner===user?.id?state.session:null,refresh};
}
