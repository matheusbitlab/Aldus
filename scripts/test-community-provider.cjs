const assert=require('node:assert/strict');
const React=require('../.expo/auth-test-tools/node_modules/react');
const {act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
const pure=require('./community-test-loader.cjs')();
const {CommunityService}=pure('src/community/application/CommunityService');
const {LocalCommunityRepository}=pure('src/community/data/LocalCommunityRepository');
const map=new Map(),storage={getItem:async k=>map.get(k)??null,setItem:async(k,v)=>map.set(k,v)};
const account=id=>({user:{id},profile:{id,username:id==='a'?'alice':'bob',display_name:id==='a'?'Alice':'Bob',avatar_url:null,account_status:'active'}});
let auth=account('a'),context,delayed=false,pending=[];
const snapshot={scope:'device',userId:null,books:[],history:[],readingDays:null};
const load=require('./community-test-loader.cjs')({
  react:React,'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
  'expo-router':{useFocusEffect:cb=>React.useEffect(cb,[cb])},
  '@/src/presentation/contexts/AuthContext':{useAuth:()=>auth},
  '../adapters/runtime':{createCommunityService:(id,identity)=>new CommunityService(identity,new LocalCommunityRepository(storage,id),{
    getSnapshot:()=>delayed?new Promise(resolve=>pending.push(resolve)):Promise.resolve(snapshot),
  },()=>100)},
});
const {CommunityProvider,useCommunity,useCommunityFocus}=load('src/community/presentation/CommunityProvider');
function Probe(){context=useCommunity();useCommunityFocus();return React.createElement('Text',null,context.view?.state.profile?.displayName??'loading');}
const tree=()=>React.createElement(CommunityProvider,null,React.createElement(Probe));
(async()=>{
  let renderer;await act(async()=>{renderer=create(tree());});
  assert.equal(context.view.state.userId,'a');assert.equal(context.view.state.profile.displayName,'Alice');
  await act(async()=>{await context.service.saveProfile({...context.view.state.profile,bio:'Somente Alice' },context.view.state.revision);await context.refresh();});
  assert.equal(context.view.state.profile.bio,'Somente Alice');
  delayed=true;let oldRefresh;
  await act(async()=>{oldRefresh=context.refresh();});
  auth=account('b');await act(async()=>renderer.update(tree()));
  assert.equal(context.view,null,'Old account data must be hidden while new account resolves');
  assert.equal(pending.length,2);
  await act(async()=>{for(const resolve of pending)resolve(snapshot);await oldRefresh;});
  assert.equal(context.view.state.userId,'b');assert.equal(context.view.state.profile.bio,'');
  assert.equal(context.error,null);
  delayed=false;auth={user:null,profile:null};await act(async()=>renderer.update(tree()));assert.equal(context.view,null);assert.match(context.error,/Entre na sua conta/);
  auth=account('a');await act(async()=>renderer.update(tree()));assert.equal(context.view.state.profile.bio,'Somente Alice');
  await act(async()=>renderer.unmount());
  console.log('PASS actual CommunityProvider with local service: load/edit, pending request plus account switch, immediate hiding, no cross-account overwrite, logout, durable return. Controlled React/storage only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
