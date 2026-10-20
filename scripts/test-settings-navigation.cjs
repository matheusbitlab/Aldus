const assert=require('node:assert/strict'),React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
let section='appearance',adminSession=null;const routes=[],modes=[];
const load=require('./community-test-loader.cjs')({react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
 'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',StyleSheet:{create:v=>v}},
 '@expo/vector-icons':{Ionicons:()=>null},'@expo/vector-icons/Ionicons':()=>null,
 'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
 'expo-router':{router:{push:p=>routes.push(p),replace:p=>routes.push(p),canGoBack:()=>false},useLocalSearchParams:()=>({section}),useFocusEffect:()=>{}},
 '@/src/presentation/contexts/AuthContext':{useAuth:()=>({user:{id:'synthetic'},profile:{display_name:'Leitor de teste',username:'sintetico'}})},
 '../contexts/AuthContext':{useAuth:()=>({user:{id:'synthetic'},profile:{display_name:'Leitor de teste',username:'sintetico'}})},
 '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette:{text:'#111',secondaryText:'#555',surface:'#fff',background:'#eee',accent:'#934'},mode:'system',setMode:async m=>modes.push(m)})},
 '../contexts/AppThemeContext':{useAppTheme:()=>({palette:{text:'#111',secondaryText:'#555',surface:'#fff',background:'#eee',accent:'#934'},mode:'system',setMode:async m=>modes.push(m)})},
 '@/src/domain/entities/libraryId':{newLibraryId:()=> 'synthetic-request'},
 '@/src/legal/appMetadata':{getAppMetadata:()=>({version:'1',build:'test'})},
 '../components/ReaderSettingsPanel':{ReaderSettingsPanel:({visible})=>visible?React.createElement('Text',null,'Preferências abertas'):null},
 '@/src/presentation/components/MotionCuesControl':{MotionCuesControl:()=>React.createElement('Text',null,'Conforto existente')},
 '@/src/presentation/components/LibrarySyncControls':{LibrarySyncControls:()=>React.createElement('Text',null,'Controles de sincronização existentes')},
 './useAdminAccess':{useAdminAccess:()=>({session:adminSession})},'../data/AdminRepository':{adminRepository:{appNotice:async()=>''}},
});
(async()=>{let view;const render=async Component=>act(async()=>{if(view)view.unmount();view=create(React.createElement(Component));});
 const text=()=>view.root.findAllByType('Text').map(n=>n.children.filter(x=>typeof x==='string').join('')).join('\n');
 const click=label=>act(async()=>{const node=view.root.findAllByType('Pressable').find(n=>n.props.accessibilityLabel===label);assert(node,label);node.props.onPress();});
 try{
  const Settings=load('src/presentation/screens/SettingsScreen.tsx').default;
  await render(Settings);assert.match(text(),/Legal e informações/);assert.doesNotMatch(text(),/Política de Privacidade|Licenças de terceiros|Aldus Admin/);
  for(const [label,route]of [['Minha conta','/account'],['Meu Plano','/plan'],['Sincronização','/preferences?section=sync'],['Tema do aplicativo','/preferences?section=appearance'],['Conforto durante a leitura','/preferences?section=comfort'],['Minhas bibliotecas','/sources'],['Serviços de leitura','/preferences?section=services'],['Comunidade literária','/community'],['Privacidade e Dados','/legal/data'],['Legal e informações','/legal']]){await click(label);assert.equal(routes.at(-1),route);}
  await click('Preferências do leitor');assert.match(text(),/Preferências abertas/);
  await click('Ajuda e feedback');assert.equal(routes.at(-1),'/support');
  adminSession={role:'OWNER'};await render(Settings);await click('Aldus Admin');assert.equal(routes.at(-1),'/admin');adminSession=null;
  const Legal=load('app/legal/index.tsx').default;await render(Legal);
  for(const [name,path]of [['Sobre o Aldus Reader','about'],['Política de Privacidade','privacy'],['Termos de Uso','terms'],['Direitos Autorais e Conteúdo','copyright'],['Licenças de terceiros','licenses']]){await click(name);assert.equal(routes.at(-1),'/legal/'+path);}
  const Preferences=load('app/preferences.tsx').default;await render(Preferences);await click('Escuro');assert.equal(modes.at(-1),'dark');
  for(const [next,expected]of [['comfort','Conforto existente'],['sync','Controles de sincronização existentes'],['services','MEC Livros']]){section=next;await render(Preferences);assert(text().includes(expected));}
 }finally{if(view)await act(async()=>view.unmount());}
 console.log('PASS compact Settings: all prior destinations/Reader/theme/sync/comfort/services, public Legal subpage, server-verified Admin entry only. Controlled UI; physical and persistence results separate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
