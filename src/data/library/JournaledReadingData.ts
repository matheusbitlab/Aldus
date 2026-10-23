import { LibraryEntityKind } from '@/src/domain/types/librarySync';
import { LibraryOrganizationRepository, parseOrganizationRecord } from '@/src/domain/types/libraryOrganization';
import { LibrarySyncService } from './LibrarySyncService';
import { libraryMutationEvents, organizationSyncPayload, pdfPositionPayload, progressSyncPayload } from './LibrarySyncPayload';
import { LibraryAccountScope, libraryAccountScope } from './LibraryAccountScope';

/** Account guards wrap this adapter, so ownership is checked before journaling. */
export function journalReadingData<T extends object>(repository: T, kind: LibraryEntityKind, sync: LibrarySyncService, scope: LibraryAccountScope = libraryAccountScope): T {
  return new Proxy(repository,{get(target,property){
    const member=Reflect.get(target,property);if(typeof member!=='function')return member;
    return async(...args:any[])=>{
      const run=scope.capture();
      let result;
      if(property==='save') {
        const bookId=typeof args[0]==='string'?args[0]:args[0].bookId;
        const data=kind==='pdf_position'?pdfPositionPayload(args[1]):kind==='progress'?progressSyncPayload(args[0]):args[0];
        const id=kind==='progress'||kind==='pdf_position'?bookId:data.id;
        await sync.change(kind,id,bookId,data,false,async()=>{result=await member.apply(target,args);});
      } else if(property==='remove' && (kind==='bookmark'||kind==='highlight')) {
        const item=await (target as any).findById(args[0]);run.check();if(!item)return;
        await sync.change(kind,item.id,item.bookId,item,true,async()=>{result=await member.apply(target,args);});
      } else { result=await member.apply(target,args); }
      run.check();if(['save','remove','importPreservingExisting'].includes(String(property)))libraryMutationEvents.notify();
      return result;
    };
  }});
}
export function journalOrganization(repository: LibraryOrganizationRepository, sync: LibrarySyncService, scope: LibraryAccountScope = libraryAccountScope): LibraryOrganizationRepository {
  return { list:()=>repository.list(), save:async record=>{
    const validated=parseOrganizationRecord(record);
    await sync.change('organization',record.bookId,record.bookId,organizationSyncPayload(validated),false,()=>repository.save(validated));
    libraryMutationEvents.notify();
  },saveMany:async(records,beforeCommit)=>{
    const run=scope.capture();
    const validated=records.map(parseOrganizationRecord);
    const check=(current?: import('@/src/domain/types/libraryOrganization').OrganizationRecords)=>{
      try {run.check();}
      catch {throw Object.assign(new Error('A conta mudou. Reabra a organização.'),{code:'LOCAL_MUTATION_CANCELLED'});}
      if(current)beforeCommit?.(current);
    };
    await sync.batch('organization',async()=>{
      check();return validated.map(record=>({id:record.bookId,bookId:record.bookId,payload:organizationSyncPayload(record)}));
    },()=>repository.saveMany(validated,check));
    run.check();libraryMutationEvents.notify();
  },merge:async(records,choice)=>{
    const run=scope.capture();
    const validated=Object.fromEntries(Object.entries(records).map(([id,record])=>[id,parseOrganizationRecord(record)]));
    const result=await sync.batch('organization',async()=>{
      const current=await repository.list();run.check();
      return Object.entries(validated).filter(([id])=>choice!=='keep-local'||!current[id]).map(([id,record])=>({id,bookId:id,payload:organizationSyncPayload(record)}));
    },()=>repository.merge(validated,choice));run.check();
    libraryMutationEvents.notify();return result;
  }};
}
