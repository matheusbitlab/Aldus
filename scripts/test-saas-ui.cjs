// React Native component rendering with controlled primitives; not physical Android QA.
const assert=require('node:assert/strict'),fs=require('node:fs');
const React=require('../.expo/auth-test-tools/node_modules/react');
const {create,act}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
const makeLoader=require('./community-test-loader.cjs'),{fixture}=require('./admin-test-fixture.cjs');
global.IS_REACT_ACT_ENVIRONMENT=true;
(async()=>{
 const f=await fixture({quota:true});await f.as('owner');
 const account=(await f.db.query('select public.saas_account_snapshot() as r')).rows[0].r;
 const quota=(await f.db.query('select public.saas_quota_snapshot() as r')).rows[0].r;
 const rows=(await f.db.query('select * from public.saas_plans')).rows,features=(await f.db.query('select * from public.saas_plan_features')).rows;
 let state={data:{account,quota},loading:false,error:null,updatedAt:Date.now(),refresh:async()=>{}},renderer;const routes=[];
 const load=makeLoader({react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
  'react-native':{View:'View',Text:'Text',ScrollView:'ScrollView',ActivityIndicator:'ActivityIndicator',Pressable:'Pressable',StyleSheet:{create:s=>s}},
  'expo-router':{router:{push:p=>routes.push(p)}},'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:24,bottom:30})},
  '@/src/presentation/components/AuthGuard':{AuthGuard:({children})=>children},
  '@/src/presentation/components/LibrarySyncControls':{LibrarySyncControls:()=>React.createElement('View')},
  '@/src/presentation/services/dependencies':{accountPlanRepository:{}},
  '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette:{text:'#111',secondaryText:'#555',border:'#ccc',surface:'#fff',surfaceSecondary:'#eee',background:'#fafafa',accent:'#a54'}})},
  './useSaasRead':{useSaasRead:()=>state},
  '@/src/presentation/saas/useSaasRead':{useSaasRead:()=>state},
 });
 const screens=load('src/presentation/saas/PlanScreens.tsx'),{parsePlanCatalog}=load('src/domain/saas/accountPlan.ts');
 const text=()=>renderer.root.findAllByType('Text').map(e=>e.children.filter(v=>typeof v==='string').join('')).join('\n');
 const render=async C=>{await act(async()=>{if(renderer)renderer.update(React.createElement(C));else renderer=create(React.createElement(C));})};
 try{
  await render(screens.MyPlanScreen);assert.match(text(),/500 MiB/);assert.match(text(),/Gratuito|gratuito/);
  for(const [used,remaining,over] of [[0,524288000,false],[524288000,0,false],[524288001,0,true],[null,null,false]]){
   const v={...quota,usage:{...quota.usage,storageBytes:used,reservedBytes:0},remaining:{...quota.remaining,storageBytes:remaining},overLimit:over};state={...state,data:{account,quota:v}};await render(screens.MyPlanScreen);
   const meter=renderer.root.findAllByType('View').find(e=>e.props.accessibilityLabel==='Armazenamento utilizado');assert.ok(meter);
   assert.equal(meter.props.accessibilityValue.text.includes('Em verificação'),used===null);assert.equal(meter.props['aria-valuenow'],used===null?undefined:used===0?0:100);
   assert.equal(meter.props['aria-valuetext'],meter.props.accessibilityValue.text);if(over){assert.match(text(),/Consumo acima da franquia/);assert.match(text(),/Excesso de armazenamento: 1 byte/);}
  }
  state={...state,data:null,error:'network'};await render(screens.MyPlanScreen);assert.match(text(),/Verifique sua conexão/);assert.doesNotMatch(text(),/Plano efetivo/);
  state={...state,data:null,loading:true};await render(screens.MyPlanScreen);assert.match(text(),/Consultando plano e consumo/);assert.doesNotMatch(text(),/Consulta indisponível/);
  state={...state,data:parsePlanCatalog(rows,features),loading:false,error:null};await render(screens.ComparePlansScreen);assert.match(text(),/Preço ainda não disponível/);
  const purchase=renderer.root.findAllByType('Pressable').find(e=>e.props.accessibilityLabel==='Contratação ainda indisponível');assert.equal(purchase.props.disabled,true);assert.equal(purchase.props.onPress,undefined);
  const own=renderer.root.findAllByType('Pressable').find(e=>e.props.accessibilityLabel==='Meu Plano');await act(async()=>own.props.onPress());assert.equal(routes.at(-1),'/plan');
  assert.ok(renderer.root.findAllByType('ScrollView').length);assert.ok(renderer.root.findAllByType('Text').every(e=>e.props.allowFontScaling!==false));
  await act(async()=>renderer.unmount());renderer=null;
  // Actual hook lifecycle: batched A-B-A must requery even when the final user ID is unchanged.
  let identity={user:{id:'A'},profile:{id:'A',account_status:'active'}},view;const jobs=[],net=new Set();
  const hookLoad=makeLoader({react:React,
   'expo-router':{useFocusEffect:fn=>React.useEffect(fn,[fn])},
   'react-native':{AppState:{addEventListener:()=>({remove(){}})}},
   'expo-network':{addNetworkStateListener:fn=>{net.add(fn);return {remove:()=>net.delete(fn)}}},
   '@/src/presentation/contexts/AuthContext':{useAuth:()=>identity},
  });
  const scope=hookLoad('src/data/library/LibraryAccountScope.ts').libraryAccountScope;
  const useRead=hookLoad('src/presentation/saas/useSaasRead.ts').useSaasRead;
  const query=signal=>new Promise(resolve=>jobs.push({owner:scope.userId,signal,resolve}));
  function Probe(){view=useRead(query);return React.createElement('Text',null,view.data?.id??'empty')}
  scope.set('A');await act(async()=>{renderer=create(React.createElement(Probe))});assert.equal(view.loading,true);
  const old=jobs.at(-1);await act(async()=>{scope.set('B');scope.set('A')});const fresh=jobs.at(-1);assert.notEqual(old,fresh);assert.equal(old.signal.aborted,true);
  await act(async()=>{old.resolve({id:'SECRET_OLD_A'});fresh.resolve({id:'FRESH_A'})});assert.equal(view.data.id,'FRESH_A');
  await act(async()=>{identity={user:{id:'B'},profile:{id:'B',account_status:'active'}};scope.set('B');renderer.update(React.createElement(Probe))});assert.equal(view.data,null);await act(async()=>jobs.at(-1).resolve({id:'FRESH_B'}));assert.equal(view.data.id,'FRESH_B');
  await act(async()=>{for(const fn of net)fn({isConnected:false})});assert.equal(view.data,null);assert.equal(view.error,'network');
  await act(async()=>{for(const fn of net)fn({isConnected:true,isInternetReachable:true})});await act(async()=>jobs.at(-1).resolve({id:'RECONNECTED_B'}));assert.equal(view.data.id,'RECONNECTED_B');
  await act(async()=>{identity={user:null,profile:null};scope.set(null);renderer.update(React.createElement(Probe))});assert.equal(view.data,null);
  await act(async()=>renderer.unmount());renderer=null;assert.equal(net.size,0);
  console.log('PASS actual SaaS hook: initial loading, batched A-B-A generation refresh, late response abortion, A/B separation, automatic offline/reconnect, logout and listener cleanup.');
  console.log('PASS native SaaS components: original SQL snapshots, zero/exact/over/unknown progress, matching native/Web accessibility values, loading/error recovery, disabled purchase, navigation, scrolling and font scaling enabled. Controlled primitives; physical Android pending.');
 }finally{if(renderer)await act(async()=>renderer.unmount());await f.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
