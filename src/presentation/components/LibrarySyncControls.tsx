import { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { LibraryBook } from '@/src/domain/entities/LibraryBook';
import { LibrarySyncEntry, LibraryEntityKind } from '@/src/domain/types/librarySync';
import { appDependencies } from '@/src/presentation/services/dependencies';
import { useAppTheme } from '@/src/presentation/contexts/AppThemeContext';
import { useLibraryStore } from '@/src/presentation/stores/libraryStore';
import { availabilityLabels } from '@/src/data/library/LibrarySyncCoordinator';
import { libraryMutationEvents } from '@/src/data/library/LibrarySyncPayload';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatBytes } from '@/src/domain/saas/planPresentation';

export function useLibrarySync(){const sync=appDependencies.librarySync;useSyncExternalStore(sync.subscribe,()=>sync.version,()=>sync.version);return sync;}
const entityLabels:Record<LibraryEntityKind,string>={book:'Livro',progress:'Posição de leitura',bookmark:'Marcador e nota',highlight:'Grifo e comentário',organization:'Organização',pdf_position:'Posições do PDF'};
function describe(payload:Record<string,any>,deleted:boolean){if(deleted)return 'Remover';return [payload.title,payload.author,payload.text,payload.note,payload.comment,typeof payload.percentage==='number'?`${Math.round(payload.percentage*100)}%`:null,payload.favorite===true?'Favorito':null,Array.isArray(payload.collections)?payload.collections.join(', '):null,Array.isArray(payload.tags)?payload.tags.join(', '):null,payload.mode==='reflow'?'PDF em Reflow':payload.mode==='original'?'PDF Original':null].filter(Boolean).join(' · ').slice(0,1000)||'Alteração de posição ou dados pessoais';}
function Action({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){const {palette}=useAppTheme();return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{paddingVertical:12,paddingHorizontal:10,opacity:disabled?.5:1,borderWidth:1,borderColor:palette.border,borderRadius:6}}><Text style={{color:palette.accent}}>{label}</Text></Pressable>;}
function Dialog({children,onClose}:{children:React.ReactNode;onClose:()=>void}){const {palette}=useAppTheme();return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={{flex:1,backgroundColor:'rgba(0,0,0,.6)',justifyContent:'center',padding:20}}><ScrollView style={{maxHeight:'85%',backgroundColor:palette.surface,borderRadius:10}} contentContainerStyle={{padding:20,gap:14}}>{children}<Action label="Fechar" onPress={onClose}/></ScrollView></View></Modal>;}

export function LibrarySyncControls({showPlanLink=true,showQuotaSummary=true}:{showPlanLink?:boolean;showQuotaSummary?:boolean}={}){
  const sync=useLibrarySync(),{palette}=useAppTheme();
  const [error,setError]=useState<string|null>(null),[legacy,setLegacy]=useState<LibraryBook[]|null>(null),[selected,setSelected]=useState<string[]>([]),[conflicts,setConflicts]=useState<Array<LibrarySyncEntry & {parentDeleted?:boolean}>|null>(null),[busy,setBusy]=useState(false);
  const operate=async(work:()=>Promise<unknown>)=>{setBusy(true);setError(null);try{await work();}catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir.');}finally{setBusy(false);}};
  const pending=sync.engine.status.pending+sync.status.pendingFiles;
  return <View style={{gap:10}}>
    <Text style={{color:palette.text,fontWeight:'600'}}>Sincronização da biblioteca</Text>
    <Text style={{color:palette.secondaryText}}>{sync.status.running?'Sincronizando…':pending?`${pending} operações pendentes`:sync.engine.status.lastSync?'Sincronizada':'Ainda não sincronizada'}{sync.engine.status.conflicts?` · ${sync.engine.status.conflicts} conflitos`:''}</Text>
    <Text style={{color:palette.secondaryText,fontSize:12}}>Última sincronização: {sync.engine.status.lastSync?new Date(sync.engine.status.lastSync).toLocaleString('pt-BR'):'—'}</Text>
    <Text style={{color:palette.secondaryText,fontSize:12}}>Livros e dados de leitura são sincronizados privadamente com sua conta. Sem conexão, alterações ficam pendentes; arquivos de outro dispositivo são baixados ao abrir.</Text>
    {(error||sync.status.error||sync.engine.status.error||libraryMutationEvents.error)?<Text accessibilityRole="alert" style={{color:palette.accent}}>{error||sync.status.error||sync.engine.status.error||libraryMutationEvents.error}</Text>:null}
    {showQuotaSummary&&sync.engine.quota?<Text style={{color:palette.secondaryText,fontSize:12}}>
      {'Plano '+sync.engine.quota.effectivePlan+': '+sync.engine.quota.usage.syncedBooks+'/'+sync.engine.quota.limits.syncedBooks+' livros. '}
      {formatBytes(sync.engine.quota.usage.storageBytes)+' usados'}
      {'. '+formatBytes(sync.engine.quota.usage.reservedBytes)+' reservados em '+sync.engine.quota.usage.reservedUploads+' envios. '}
      {formatBytes(sync.engine.quota.remaining.storageBytes)+' disponíveis'}
      {sync.engine.quota.overLimit?'. Acima da franquia: dados preservados; novos envios ficam pendentes.':''}
    </Text>:null}
    <Action label="Sincronizar agora" disabled={busy||sync.status.running} onPress={()=>void operate(()=>sync.retryQuota())}/>
    {showPlanLink?<Action label="Meu Plano e armazenamento" onPress={()=>router.push('/plan' as never)}/>:null}
    <Action label="Adicionar livros locais à minha conta" disabled={busy} onPress={()=>void operate(async()=>{setSelected([]);setLegacy(await appDependencies.bookRepository.listLegacy());})}/>
    {sync.engine.status.conflicts?<Action label="Revisar conflitos" disabled={busy} onPress={()=>void operate(async()=>setConflicts(await sync.conflicts()))}/>:null}
    {legacy?<Dialog onClose={()=>{if(!busy)setLegacy(null);}}><Text style={{color:palette.text,fontWeight:'600'}}>Vincular livros antigos à conta atual</Text><Text style={{color:palette.secondaryText}}>Escolha os livros deste dispositivo que devem pertencer à sua conta. O vínculo preserva IDs, progresso e anotações e permite o envio privado. Nenhum livro é atribuído automaticamente.</Text>{legacy.length===0?<Text style={{color:palette.text}}>Não há livros locais sem conta.</Text>:legacy.map(book=><Action key={book.id} label={`${selected.includes(book.id)?'✓ ':''}${book.title} · ${book.author}`} disabled={busy} onPress={()=>setSelected(ids=>ids.includes(book.id)?ids.filter(id=>id!==book.id):[...ids,book.id])}/>)}<Action label={`Confirmar vínculo de ${selected.length} livros`} disabled={busy||!selected.length} onPress={()=>void operate(async()=>{await appDependencies.bookRepository.claimLegacy(selected);await useLibraryStore.getState().refresh();setLegacy(null);sync.schedule(0);})}/></Dialog>:null}
    {conflicts?<Dialog onClose={()=>setConflicts(null)}><Text style={{color:palette.text}}>Alterações concorrentes</Text>{conflicts.map(entry=><View key={entry.key} style={{gap:8}}><Text selectable style={{color:palette.text}}>{entityLabels[entry.kind]}</Text><Text style={{color:palette.secondaryText}}>Versão recebida: {describe(entry.payload,entry.deleted)}</Text><Text style={{color:palette.secondaryText}}>Alteração deste dispositivo: {describe(entry.conflict!.payload,entry.conflict!.deleted)}</Text>{!entry.shadow?.deleted_at && !entry.parentDeleted?<Action label="Aplicar alteração deste dispositivo" disabled={busy} onPress={()=>void operate(async()=>{await sync.resolve(entry.key,'local');setConflicts(await sync.conflicts());})}/>:<Text style={{color:palette.secondaryText}}>Livro removido da conta. Para adicioná-lo novamente, importe com uma nova identidade.</Text>}<Action label="Manter versão recebida e descartar conflito" disabled={busy} onPress={()=>void operate(async()=>{await sync.resolve(entry.key,'remote');setConflicts(await sync.conflicts());})}/></View>)}</Dialog>:null}
  </View>;
}

export function BookCloudControls({book}:{book:LibraryBook}){
  const sync=useLibrarySync(),{palette}=useAppTheme();const [visible,setVisible]=useState(false),[confirm,setConfirm]=useState<'device'|'library'|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const state=sync.availability(book),transfer=state==='DOWNLOADING'||state==='UPLOADING';
  useEffect(()=>{setVisible(false);setConfirm(null);setError(null);},[book.ownerUserId]);
  return <><View style={{flexDirection:'row',alignItems:'center',gap:6}}>
    <Text numberOfLines={2} style={{flex:1,color:palette.secondaryText,fontSize:11}}>{availabilityLabels[state]}</Text>
    {state==='QUOTA_BLOCKED'?<Pressable accessibilityRole="button" accessibilityLabel="Ver franquia em Meu Plano" onPress={()=>router.push('/plan' as never)} style={{minHeight:44,justifyContent:'center',padding:6}}><Text style={{color:palette.accent,fontSize:12}}>Meu Plano</Text></Pressable>:null}
    <Pressable accessibilityRole="button" accessibilityLabel={`Ações de ${book.title}`} accessibilityHint="Remover a cópia deste dispositivo ou o livro da conta" onPress={()=>setVisible(true)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}>
      <Ionicons name="ellipsis-horizontal" size={21} color={palette.secondaryText}/>
    </Pressable>
  </View>{visible?<Dialog onClose={()=>{if(!busy){setVisible(false);setConfirm(null);}}}><Text style={{color:palette.text,fontWeight:'600'}}>{book.title}</Text>{error?<Text accessibilityRole="alert" style={{color:palette.accent}}>{error}</Text>:null}<Action label="Remover deste dispositivo" disabled={busy||transfer||!book.filePath||!book.remotePath||!!book.bundledAssetId} onPress={()=>setConfirm('device')}/><Action label="Remover da minha biblioteca" disabled={busy||transfer} onPress={()=>setConfirm('library')}/>{confirm?<><Text style={{color:palette.text}}>{confirm==='device'?'Apagar a cópia local? O livro permanece na conta e pode ser baixado ao abrir novamente.':'Remover da sua biblioteca em todos os dispositivos? A exclusão ficará pendente se estiver offline. O arquivo remoto será excluído após confirmação da sincronização.'}</Text><Action label="Confirmar remoção" disabled={busy} onPress={()=>void(async()=>{setBusy(true);setError(null);try{if(confirm==='device')await sync.removeDeviceCopy(book.id);else{await appDependencies.bookRepository.softDelete(book.id);await useLibraryStore.getState().refresh();sync.schedule(0);}setVisible(false);setConfirm(null);}catch(e){setError(e instanceof Error?e.message:'Falha na remoção.');}finally{setBusy(false);}})()}/></>:null}</Dialog>:null}</>;
}
