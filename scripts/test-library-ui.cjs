const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('../.expo/auth-test-tools/node_modules/react');
const {act,create} = require('../.expo/auth-test-tools/node_modules/react-test-renderer');
const makeLoader = require('./community-test-loader.cjs');
global.IS_REACT_ACT_ENVIRONMENT = true;
const palette={text:'#111111',secondaryText:'#555555',accent:'#ab6543',surface:'#ffffff',panel:'#ffffff',border:'#dddddd',separator:'#dddddd'};
let auth={user:{id:'A'},profile:{id:'A',username:'reader',account_status:'active'}}, availability='LOCAL_AND_CLOUD';
const removed=[],deleted=[],shares=[],merged=[],routes=[];
const record=id=>({bookId:id,favorite:true,collections:['Literatura'],tags:['Leitura'],series:'',volume:null,readingStatus:'reading',updatedAt:1,revision:1});
let records={book:record('book')}, list=async()=>records;
const sync={subscribe:()=>()=>{},version:0,availability:()=>availability,removeDeviceCopy:async id=>removed.push(id),schedule:()=>{}};
const mocks={
  'expo-router':{router:{push:route=>routes.push(route)}},
  react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
  'react-native':{View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Modal:'Modal',TextInput:'TextInput',Platform:{OS:'android'},Share:{share:async value=>shares.push(value)},StyleSheet:{create:x=>x}},
  '@expo/vector-icons':{Ionicons:'Ionicons'},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:24,bottom:16})},
  '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette})},
  '@/src/presentation/contexts/AuthContext':{useAuth:()=>auth},
  '@/src/presentation/services/dependencies':{appDependencies:{librarySync:sync,bookRepository:{softDelete:async id=>deleted.push(id),listActive:async()=>[{id:'book'}]}},libraryOrganization:{list:()=>list(),merge:async(...args)=>{merged.push(args);return {imported:1,conflicts:0};}}},
  '@/src/presentation/stores/libraryStore':{useLibraryStore:{getState:()=>({refresh:async()=>{}})}},
  '@/src/data/library/LibrarySyncCoordinator':{availabilityLabels:{LOCAL_AND_CLOUD:'Neste dispositivo e na nuvem',UPLOADING:'Enviando',CLOUD_ONLY:'Na nuvem',QUOTA_BLOCKED:'Envio aguardando franquia'}},
  '@/src/data/library/LibrarySyncPayload':{libraryMutationEvents:{}},
  '@/src/presentation/components/legal/LegalDocumentScreen':{LegalDocumentScreen:({footer})=>React.createElement('View',null,footer)},
};
const load=makeLoader(mocks),{BookCloudControls}=load('src/presentation/components/LibrarySyncControls.tsx'),DataScreen=load('app/legal/data.tsx').default;
let renderer;
const text=()=>renderer.root.findAllByType('Text').map(n=>n.children.filter(x=>typeof x==='string').join('')).join('\n');
const button=label=>renderer.root.findAllByType('Pressable').find(n=>n.props.accessibilityLabel===label||n.findAllByType('Text').some(t=>t.children.join('')===label));
const press=async label=>{const b=button(label);assert.ok(b,label);assert.ok(!b.props.disabled,label);await act(async()=>{await b.props.onPress();});};
async function render(component,props){if(renderer)await act(async()=>renderer.unmount());await act(async()=>{renderer=create(React.createElement(component,props));});}
(async()=>{
  const book={id:'book',ownerUserId:'A',title:'A very long book title '.repeat(20),filePath:'file://book',remotePath:'private/book.epub'};
  await render(BookCloudControls,{book});assert.ok(!text().includes(book.title),'title must not be repeated in a visible options button');
  const menu=button(`Ações de ${book.title}`);assert.equal(menu.props.style.width,44);assert.equal(menu.props.style.height,44);
  await press(`Ações de ${book.title}`);await press('Remover deste dispositivo');await press('Confirmar remoção');assert.deepEqual(removed,['book']);
  await press(`Ações de ${book.title}`);await press('Remover da minha biblioteca');await press('Confirmar remoção');assert.deepEqual(deleted,['book']);
  await render(BookCloudControls,{book:{...book,bundledAssetId:'bundled'}});await press(`Ações de ${book.title}`);assert.equal(button('Remover deste dispositivo').props.disabled,true);
  availability='UPLOADING';await render(BookCloudControls,{book});await press(`Ações de ${book.title}`);assert.equal(button('Remover da minha biblioteca').props.disabled,true);
  availability='LOCAL_AND_CLOUD';
  availability='QUOTA_BLOCKED';await render(BookCloudControls,{book});await press('Ver franquia em Meu Plano');assert.equal(routes.at(-1),'/plan');availability='LOCAL_AND_CLOUD';

  auth={user:null,profile:null};await render(DataScreen);assert.ok(!button('Exportar meus dados'),'public legal route does not export account data');
  auth={user:{id:'A'},profile:{id:'A',username:'reader',account_status:'active'}};await render(DataScreen);await press('Exportar meus dados');await press('Exportar organização');
  assert.equal(shares.length,1);assert.equal(JSON.parse(shares[0].message).records[0].bookId,'book');assert.match(text(),/opcional/);assert.doesNotMatch(text(),/Backup da organização/);
  const input=renderer.root.findByType('TextInput');
  await act(async()=>input.props.onChangeText(JSON.stringify({format:'kindle-library-organization',version:1,records:[record('foreign')]})));
  await press('Conferir dados');assert.match(text(),/não estão disponíveis nesta conta/);assert.equal(merged.length,0);
  await act(async()=>input.props.onChangeText(JSON.stringify({format:'kindle-library-organization',version:1,records:[record('book')]})));
  await press('Conferir dados');await press('Importar mantendo os dados locais');assert.equal(merged[0][1],'keep-local');

  let release;list=()=>new Promise(resolve=>release=resolve);await render(DataScreen);
  await act(async()=>button('Exportar meus dados').props.onPress());
  auth={user:{id:'B'},profile:{id:'B',username:'readerB',account_status:'active'}};
  await act(async()=>renderer.update(React.createElement(DataScreen)));
  await act(async()=>release({secretA:record('secretA')}));
  assert.equal(renderer.root.findAllByType('Modal').length,0,'late export of account A is not displayed to B');
  const library=fs.readFileSync('app/(tabs)/library.tsx','utf8');assert.doesNotMatch(library,/Backup da organização|OrganizationBackupModal|backupVisible/);
  await act(async()=>renderer.unmount());
  console.log('PASS library React UI: compact long-title menu, both removals/confirmations, bundled/transfer guards; authenticated optional export, Share, foreign import rejection, merge policy and late-account isolation. Native primitives controlled; Android pending.');
})().catch(error=>{console.error(error);process.exitCode=1;});
