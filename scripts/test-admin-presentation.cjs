// Actual RN components with controlled primitives. Browser and Redmi are separate.
const assert=require('node:assert/strict');
const React=require('../.expo/auth-test-tools/node_modules/react');
const {create,act}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
const makeLoader=require('./community-test-loader.cjs');
global.IS_REACT_ACT_ENVIRONMENT=true;
const load=makeLoader({react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
 'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',Pressable:'Pressable',TextInput:'TextInput',Modal:'Modal',StyleSheet:{create:s=>s},useWindowDimensions:()=>({width:1440})},
 '@expo/vector-icons/Ionicons':()=>null,
 '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette:{text:'#111',secondaryText:'#555',surface:'#fff',surfaceSecondary:'#eee',border:'#ccc',accent:'#a54'}})},
 '../data/AdminRepository':{adminRepository:{}},
});
const {AdminMetrics}=load('src/admin/presentation/AdminMetrics.tsx'),{AdminUsers}=load('src/admin/presentation/AdminUsers.tsx');
const data={registeredUsers:0,newUsers:0,recentSignIns:0,freeAccounts:0,proAccounts:0,activeSubscriptions:0,expiredSubscriptions:0,manualProGrants:0,syncOperations:0,usage:{books:0,storageBytes:null,objects:0,unknownSizeObjects:1},averageStorageBytes:null,registrationsByDay:[],observedAt:'2026-10-16T12:00:00Z'};
(async()=>{let view;const text=()=>view.root.findAllByType('Text').map(n=>n.children.filter(v=>typeof v==='string').join('')).join('\n');
 const render=async(el)=>act(async()=>{if(view)view.update(el);else view=create(el);});
 try{
  await render(React.createElement(AdminMetrics,{data,kind:'overview'}));
  assert.match(text(),/Aguardando integração de pagamentos/);assert.doesNotMatch(text(),/R\$|MRR|ARR|Churn|Contas Free/);
  assert.match(text(),/Em verificação/);assert.match(text(),/Nenhum cadastro no período/);assert.match(text(),/Nenhuma conta com plano contabilizado/);
  await render(React.createElement(AdminMetrics,{data:{...data,registrationsByDay:[{day:'2026-10-16',count:0}]},kind:'metrics'}));
  assert.match(text(),/maior valor diário: 0/);assert.match(text(),/16\/10\/2026/);
  const filters=[];
  await render(React.createElement(AdminUsers,{rows:[{id:'synthetic-id',display_name:'Conta sintética',username:'synthetic',email:'qa@example.invalid',account_status:'active',effective_plan:'free',created_at:'2026-10-16T12:00:00Z',last_sign_in_at:null}],page:0,filters:{},onFilters:f=>filters.push(f),session:{role:'OWNER',permissions:[],recentMfa:false},ask:()=>{},reload:0,onDenied:()=>{},selected:null,setSelected:()=>{}}));
  assert.match(text(),/Gratuito/);assert.match(text(),/Ativa/);assert.doesNotMatch(text(),/active|disabled|Free/);
  const click=label=>act(async()=>view.root.findAllByType('Pressable').find(n=>n.props.accessibilityLabel===label).props.onPress());
  await click('Gratuito');await click('Ativas');await click('Pesquisar usuários');
  assert.equal(filters.at(-1).plan,'free');assert.equal(filters.at(-1).status,'active');
  assert.equal(view.root.findAllByType('Pressable').find(n=>n.props.accessibilityLabel==='Usuários: página anterior').props.disabled,true);
  console.log('PASS Admin presentation: financial unavailable without false revenue; empty/unknown/zero series; pt-BR dates/plans/status; filters preserve server IDs and pagination. Controlled primitives only.');
 }finally{if(view)await act(async()=>view.unmount());}
})().catch(e=>{console.error(e);process.exitCode=1;});
