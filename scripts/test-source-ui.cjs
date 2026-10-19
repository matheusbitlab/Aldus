// Actual source UI + actual preparation/commit service. Auth, provider and disk are controlled fixtures.
const assert=require('node:assert/strict');
const React=require('../.expo/auth-test-tools/node_modules/react');
const {create,act}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
const makeLoader=require('./community-test-loader.cjs');
global.IS_REACT_ACT_ENVIRONMENT=true;
const base=makeLoader(),scopeModule=base('src/data/library/LibraryAccountScope.ts'),scope=scopeModule.libraryAccountScope;
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';scope.set(A);
const listeners=new Set(),grants=new Set(),calls={connect:[],prepare:[],save:[],cancel:[],remove:[],disconnect:[]};
let failCatalog=false,delayCatalog=false,releaseCatalog,searchFailure=false,view,closed=0,metadataRequests=0;
const updateState=patch=>{state={...state,...patch};for(const listener of listeners)listener();};
let service;
const api={
 load:async()=>{},add:async(source,signal,options)=>{calls.save.push({id:source.id,context:options?.context});updateState({sources:[...state.sources,{...source,ownerId:scope.userId}]});if(options?.prepared)await service.commitPrepared(source,options.prepared,signal,options.context);},
 update:async(id,patch,signal,options)=>{updateState({sources:state.sources.map(source=>source.id===id?{...source,...patch}:source)});const source=state.sources.find(source=>source.id===id);if(options?.prepared)await service.commitPrepared(source,options.prepared,signal,options.context);},
 remove:async id=>{calls.remove.push(id);await service.remove(id);updateState({sources:state.sources.filter(source=>source.id!==id)});},
 adoptLegacy:async id=>{const source=state.legacySources.find(source=>source.id===id&&!source.ownerId);if(!source)throw Error('Not legacy');updateState({sources:[...state.sources,{...source,ownerId:scope.userId}],legacySources:state.legacySources.filter(source=>source.id!==id)});},
};
let state={sources:[],legacySources:[],loadError:null,...api};
const store=()=>React.useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>state,()=>state);store.getState=()=>state;
const memory=new Map(),repo={get:async id=>memory.get(id)??null,save:async catalog=>memory.set(catalog.sourceId,structuredClone(catalog)),remove:async id=>memory.delete(id),links:async()=>[],link:async()=>{}};
const drive={authorization:{prepare:async()=>{},connected:id=>grants.has(id)},connect:async(source,signal,context)=>{calls.connect.push({id:source.id,context});context?.onProgress?.({operationId:context.operationId,phase:'authorizing'});grants.add(source.id);},describeRoot:async()=>({name:'Biblioteca sintética'}),disconnect:async id=>{calls.disconnect.push(id);grants.delete(id);return true;}};
const load=makeLoader({react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
 'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',TextInput:'TextInput',Modal:'Modal',ActivityIndicator:'ActivityIndicator',FlatList:props=>React.createElement('FlatList',props,props.ListHeaderComponent,...props.data.map(item=>props.renderItem({item})),props.data.length?null:props.ListEmptyComponent,props.ListFooterComponent),StyleSheet:{create:s=>s,hairlineWidth:1}},
 '@expo/vector-icons':{Ionicons:()=>null},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'expo-router':{router:{push:()=>{},back:()=>{},replace:()=>{}}},
 '@/src/data/library/LibraryAccountScope':scopeModule,
 '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette:{text:'#111',secondaryText:'#555',surface:'#fff',surfaceSecondary:'#eee',border:'#ccc',accent:'#a54',panel:'#fff',overlay:'#0008'}})},
 '@/src/presentation/stores/sourceStore':{useSourceStore:store},'@/src/data/drive/driveDependencies':{googleDrive:drive},
 '@/src/data/sources/sourceCatalogDependencies':{get sourceCatalogs(){return service;}},
 '@/src/data/scraping/catalogPlugins':{BUILTIN_CATALOG_NAMES:['Gutenberg'],configuredCatalog:source=>source},
 '@/src/presentation/services/dependencies':{appDependencies:{searchBooks:{executeDetailed:async()=>({sources:[searchFailure?{status:'error',error:'PRIVATE_CANARY https://private.invalid/?token=secret'}:{status:'success'}]})}}},
 '@/src/presentation/stores/searchStore':{useSearchStore:{getState:()=>({selectSource:()=>{}})}},
});
const {SourceCatalogService}=load('src/data/sources/SourceCatalogService.ts');
service=new SourceCatalogService(repo,{authorizationRequired:source=>source.kind==='google-drive'&&!grants.has(source.id),catalog:async(source,signal,context)=>{
 metadataRequests++;calls.prepare.push({id:source.id,context});context?.onProgress?.({operationId:context.operationId,phase:'indexing',booksFound:2,foldersScanned:1});
 if(delayCatalog)await new Promise(resolve=>releaseCatalog=resolve);
 if(failCatalog)throw Error('PRIVATE_CANARY provider error https://private.invalid/?token=secret');
 return{rootFolderId:source.folderId,folders:source.folderId?[{id:source.folderId,sourceId:source.id,remoteFolderId:source.folderId,parentFolderId:null,name:'Raiz sintética',relativePath:'',isShortcut:false}]:[],items:[{title:'Livro sintético.epub',format:'epub',estimatedSize:12,url:'https://fixture.invalid/book.epub',drive:source.kind==='google-drive'?{fileId:'file_synthetic_1'}:undefined,parentFolderId:source.folderId}]};
 },list:async()=>[]},async id=>state.sources.find(source=>source.id===id&&source.ownerId===scope.userId));
const cancel=service.cancel.bind(service);service.cancel=id=>{calls.cancel.push(id);cancel(id);};
const {SourceManagerModal}=load('src/presentation/components/SourceManagerModal.tsx');
const {SourceSummaryRow}=load('src/presentation/components/SourceSummaryRow.tsx');
const Sources=load('app/sources/index.tsx').default;
const text=()=>view.root.findAllByType('Text').map(node=>node.children.filter(value=>typeof value==='string').join('')).join('\n');
const render=async(element)=>act(async()=>{if(view)view.update(element);else view=create(element);});
const button=label=>view.root.findAllByType('Pressable').find(node=>node.props.accessibilityLabel===label||node.findAllByType('Text').some(t=>t.children.join('')===label));
const click=async label=>{const node=button(label);assert.ok(node,'Button '+label);assert.ok(!node.props.disabled,'Enabled '+label);await act(async()=>{node.props.onPress();await Promise.resolve();await Promise.resolve();});};
const input=async(label,value)=>act(async()=>view.root.findAllByType('TextInput').find(node=>node.props.accessibilityLabel===label).props.onChangeText(value));
const modal=(props={})=>React.createElement(SourceManagerModal,{visible:true,onClose:()=>closed++,...props});
async function fresh(props={}){if(view)await act(async()=>view.unmount());view=null;await render(modal(props));}
(async()=>{try{
 await fresh();assert.match(text(),/Sua pasta vira uma biblioteca/);assert.doesNotMatch(text(),/Endereço do catálogo|Nome da biblioteca/);assert.equal(memory.size,0);
 await click('Conectar Google Drive');assert.equal(calls.connect.length,1);assert.match(text(),/conectado nesta sessão/);assert.equal(state.sources.length,0,'OAuth does not persist a source');
 await input('Link da pasta do Google Drive','https://drive.google.com/drive/folders/folder_123456789');await click('Buscar livros');assert.match(text(),/1 livro encontrado/);assert.equal(memory.size,0,'Review is memory only');assert.equal(state.sources.length,0);const before=metadataRequests;
 await input('Nome da biblioteca','Minhas leituras sintéticas');await click('Salvar biblioteca');assert.match(text(),/Biblioteca salva/);assert.equal(metadataRequests,before,'Saving the prepared object does not crawl again');assert.equal(state.sources.length,1);assert.equal(memory.size,1);
 assert.equal(calls.connect[0].id,calls.prepare[0].id);assert.equal(calls.save[0].id,calls.prepare[0].id);assert.equal(calls.connect[0].context.operationId,calls.prepare[0].context.operationId);assert.equal(calls.save[0].context.operationId,calls.prepare[0].context.operationId,'Search and save share a trusted operation correlation');assert.equal(memory.get(state.sources[0].id).sourceName,'Minhas leituras sintéticas');
 const saved=state.sources[0];await fresh({sourceId:saved.id,action:'reconnect'});assert.match(text(),/Sua biblioteca/);assert.doesNotMatch(text(),/Sua pasta vira uma biblioteca|Conecte seu Google Drive/);assert.ok(!text().includes(saved.url),'Saved library URL stays out of the main management view');
 await fresh();await click('Conectar Google Drive');await input('Link da pasta do Google Drive','folder_222222222');await click('Buscar livros');const draftId=calls.prepare.at(-1).id;await input('Link da pasta do Google Drive','folder_333333333');assert.ok(calls.cancel.includes(draftId),'Editing a reviewed folder invalidates the prepared run');assert.doesNotMatch(text(),/Biblioteca encontrada/);
 await click('Buscar livros');await click('Fechar bibliotecas');assert.ok(calls.cancel.includes(draftId));assert.equal(state.sources.length,1,'Closing a draft never saves/removes a library');
 await fresh();await click('Conectar Google Drive');await input('Link da pasta do Google Drive','folder_444444444');delayCatalog=true;await click('Buscar livros');assert.match(text(),/Buscando livros/);await click('Cancelar operação da biblioteca');assert.match(text(),/Operação cancelada/);delayCatalog=false;await act(async()=>{releaseCatalog();await Promise.resolve();});assert.doesNotMatch(text(),/Biblioteca encontrada/);assert.equal(state.sources.length,1,'Late listing cannot resurrect a cancelled draft');
 await fresh();await click('Adicionar biblioteca por link');assert.match(text(),/Link da biblioteca/);assert.equal(view.root.findAllByType('Pressable').find(node=>node.props.accessibilityLabel==='Configuração avançada').props.accessibilityState.expanded,false);await input('Nome da biblioteca','Pesquisa sintética');await input('Link da biblioteca','https://fixture.invalid/search?q={query}');searchFailure=true;await click('Salvar biblioteca por link');assert.match(text(),/O catálogo não respondeu/);assert.doesNotMatch(text(),/PRIVATE_CANARY|token=secret/);searchFailure=false;
 await fresh();await click('Conectar Google Drive');await input('Link da pasta do Google Drive','folder_555555555');failCatalog=true;await click('Buscar livros');assert.doesNotMatch(text(),/PRIVATE_CANARY|token=secret/);assert.match(text(),/Seus dados foram preservados/);failCatalog=false;
 await fresh();await click('Conectar Google Drive');await input('Link da pasta do Google Drive','folder_666666666');await click('Buscar livros');await input('Nome da biblioteca','PRIVATE_DRAFT_A');await act(async()=>{scope.set(B);scope.set(A);});assert.doesNotMatch(text(),/PRIVATE_DRAFT_A|Biblioteca encontrada/,'A to B to A clears the draft even in one React batch');
 await render(React.createElement(SourceSummaryRow,{source:{...saved,ownerId:B,name:'PRIVATE_OTHER_ACCOUNT'},onManage:()=>{}}));assert.doesNotMatch(text(),/PRIVATE_OTHER_ACCOUNT/);
 await act(async()=>updateState({legacySources:[{...saved,id:'legacy-synthetic',ownerId:undefined,name:'LEGACY_PRIVATE_NAME'},{...saved,id:'other-owner',ownerId:B,name:'PRIVATE_OTHER_OWNER'}]}));await render(React.createElement(Sources));assert.match(text(),/Bibliotecas deste dispositivo/);assert.doesNotMatch(text(),/LEGACY_PRIVATE_NAME|PRIVATE_OTHER_OWNER/);await click('Revisar bibliotecas deste dispositivo');assert.match(text(),/LEGACY_PRIVATE_NAME/);assert.doesNotMatch(text(),/PRIVATE_OTHER_OWNER/);await click('Usar nesta conta: LEGACY_PRIVATE_NAME');assert.equal(state.legacySources[0].ownerId,undefined);await click('Confirmar uso da biblioteca nesta conta');assert.equal(state.sources.find(source=>source.id==='legacy-synthetic').ownerId,A);
 console.log('PASS real Sources UI + preparation/commit: guided OAuth/folder/review/save with stable ID/context and one crawl, in-memory preview, focused reconnect, secondary simple link, raw errors redacted, cancellation/late return, prepared cleanup, A-B-A epoch reset, private-owner hiding and explicit legacy review/adoption. Provider/Auth/disk controlled; no real Google or device proof.');
 }finally{if(view)await act(async()=>view.unmount());scope.set(null);}
})().catch(error=>{console.error(error);process.exitCode=1;});
