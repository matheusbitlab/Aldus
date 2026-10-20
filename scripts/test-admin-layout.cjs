const assert=require('node:assert/strict'),React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
let width=1440,session={userId:'synthetic-owner',role:'OWNER',permissions:[],recentMfa:true};const changes=[];const refresh=async()=>{};
const load=require('./community-test-loader.cjs')({react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
 'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',TextInput:'TextInput',ActivityIndicator:'ActivityIndicator',Modal:'Modal',StyleSheet:{create:v=>v},useWindowDimensions:()=>({width})},
 '@expo/vector-icons/Ionicons':()=>null,'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'expo-router':{router:{replace:()=>{}}},
 '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({resolvedTheme:'light',palette:{text:'#111',secondaryText:'#555',surface:'#fff',surfaceSecondary:'#eee',border:'#ccc',accent:'#934'}})},
 '@/src/domain/entities/libraryId':{newLibraryId:()=> 'synthetic-request'},
 './useAdminAccess':{useAdminAccess:()=>({session,refresh,loading:false})},
 '../data/AdminRepository':{AdminError:class extends Error{},adminRepository:{read:async()=>({rows:[]})}},
 './AdminMfa':{AdminMfa:()=>null},'./AdminWebStyles':{AdminWebStyles:()=>null},'./AdminMetrics':{AdminMetrics:()=>null},
});
(async()=>{let view;const text=()=>view.root.findAllByType('Text').map(n=>n.children.filter(v=>typeof v==='string').join('')).join('\n');
 const render=async el=>act(async()=>{if(view)view.unmount();view=create(el);});
 const button=label=>view.root.findAllByType('Pressable').find(n=>n.props.accessibilityLabel===label);
 const click=label=>act(async()=>{const b=button(label);assert(b,label);assert(!b.props.disabled,label+' disabled');b.props.onPress();});
 try{
  const {AdminConfiguration}=load('src/admin/presentation/AdminConfiguration.tsx');
  const data={rows:[{key:'app.notice',value:'Aviso sintético',revision:2,requires_deploy:false},{key:'features.community_enabled',value:true,revision:1,requires_deploy:true}],history:[{id:1,key:'app.notice',revision:0,created_at:'2026-10-20T12:00:00Z',value:''}]};
  await render(React.createElement(AdminConfiguration,{data,enabled:true,ask:c=>changes.push(c)}));
  assert.equal(view.root.findAllByType('TextInput').length,0);assert.doesNotMatch(text(),/Identificador:|Restaurar revisão/);
  await click('Aviso do aplicativo · Aviso sintético');assert.match(text(),/Editar: Aviso do aplicativo/);assert(button('Revisar alteração').props.disabled);
  await act(async()=>view.root.findByType('TextInput').props.onChangeText('Novo aviso sintético'));
  await click('Revisar alteração');assert.deepEqual(changes.at(-1).command,{action:'setting',payload:{value:'Novo aviso sintético'}});assert.equal(changes.at(-1).target,'app.notice');assert.equal(changes.at(-1).revision,2);
  await click('Histórico de revisões');await click('Restaurar revisão 0');assert.equal(changes.at(-1).command.action,'setting_rollback');assert.equal(changes.at(-1).revision,2);
  await click('Detalhes avançados');assert.match(text(),/Identificador: app.notice/);
  await render(React.createElement(AdminConfiguration,{data,enabled:false,ask:()=>assert.fail('MFA bypass')}));await click('Aviso do aplicativo · Aviso sintético');await act(async()=>view.root.findByType('TextInput').props.onChangeText('Blocked'));assert(button('Revisar alteração').props.disabled);
  const Admin=load('src/admin/presentation/AdminScreen.tsx').default;await render(React.createElement(Admin));
  for(const label of ['Visão Geral','Métricas','Usuários','Assinaturas','Planos e Preços','Armazenamento','Saúde do Sistema','Configurações','Administradores','Auditoria'])assert(button(label),label);
  await click('Recolher menu');assert(button('Usuários'));await click('Expandir menu');
  width=390;await render(React.createElement(Admin));assert(!button('Usuários'));await click('Abrir navegação');assert(button('Usuários'));await click('Configurações');assert(!button('Usuários'));
  session={userId:'synthetic-admin',role:'ADMIN',permissions:['metrics.read'],recentMfa:false};width=1440;await render(React.createElement(Admin));assert(button('Métricas'));assert(!button('Configurações'));assert(!button('Administradores'));
 }finally{if(view)await act(async()=>view.unmount());}
 console.log('PASS Admin grouped desktop/mobile navigation, all ten sections, delegated access, selected-only settings editor, collapsed history/details, unchanged revision commands and MFA-disabled save. Controlled UI; remote authorization not inferred.');
})().catch(e=>{console.error(e);process.exitCode=1;});
