const assert = require('node:assert/strict'), fs = require('node:fs');
const React = require('../.expo/auth-test-tools/node_modules/react');
const { act, create } = require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const navigations = [], saves = [], include = [];
let section = 'clubs', mode = 'light', refreshes = 0;
const palette = { background:'#f5f5f3', surface:'#fff', surfaceSecondary:'#f0f1f0', text:'#171a1d', secondaryText:'#5f6a70', border:'#d9ded9', accent:'#d97757', input:'#f8f9f8' };
const domain = require('./community-test-loader.cjs')();
const { createProfile } = domain('src/community/domain/profile');
const { calculateStats } = domain('src/community/domain/metrics');
const { progression } = domain('src/community/domain/progression');
const { emptyState } = domain('src/community/data/serialization');
const profile = { ...createProfile({ userId:'owner', username:'leitor', displayName:'Leitor Real', avatar:null },1), bio:'Minha bio' };
const snapshot = { scope:'device', userId:null, books:[], history:[], readingDays:null };
let context = { loading:false, error:null, refresh:async()=>{refreshes++;}, service:{
  setIncludeDeviceLibrary:async v=>include.push(v), saveProfile:async(p,r)=>saves.push({p,r}),
}, view:{ state:{...emptyState('owner'),profile}, snapshot, stats:calculateStats(snapshot,'2026-10-13'), progression:progression(0) } };
const load = require('./community-test-loader.cjs')({
  react:React, 'react/jsx-runtime':require('../.expo/auth-test-tools/node_modules/react/jsx-runtime'),
  'react-native':{View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Image:'Image',TextInput:'TextInput',ActivityIndicator:'ActivityIndicator',StyleSheet:{create:x=>x}},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:28,bottom:24})},
  '@expo/vector-icons':{Ionicons:'Ionicons'},
  'expo-router':{router:{push:p=>navigations.push(p),replace:p=>navigations.push(p),back:()=>navigations.push('back'),canGoBack:()=>true},useLocalSearchParams:()=>({section})},
  '@/src/presentation/contexts/AppThemeContext':{useAppTheme:()=>({palette:mode==='dark'?{...palette,text:'#eef2f4',background:'#12171a'}:palette})},
  './CommunityProvider':{useCommunity:()=>context,useCommunityFocus:()=>{}},
});
const text = root => root.findAllByType('Text').map(n=>n.children.filter(v=>typeof v==='string').join('')).join('\n');
let renderer;
async function render(Component) { if(renderer)await act(async()=>renderer.unmount()); await act(async()=>{renderer=create(React.createElement(Component));}); return renderer.root; }
function press(label) { const button=renderer.root.findAllByType('Pressable').find(n=>n.props.accessibilityLabel===label);assert(button,`Button ${label}`);return act(async()=>button.props.onPress()); }
(async()=>{
  const {CommunityHomeScreen:Home}=load('src/community/presentation/CommunityHomeScreen');
  let root=await render(Home); assert.match(text(root),/Nenhuma atividade ainda/);assert.match(text(root),/Sua biblioteca está vazia/);
  assert(!text(root).includes('seguidores: 0'));
  await press('Meu perfil literário');assert.equal(navigations.at(-1),'/community/profile');
  await press('Incluir estas leituras na minha jornada local');assert.deepEqual(include,[true]);
  await press('Atualizar leituras');assert.equal(refreshes,2);
  for(const [label,path] of [['Conhecer clubes','clubs'],['Conhecer fóruns','forums'],['Conhecer pessoas','people']]){await press(label);assert.equal(navigations.at(-1),'/community/'+path);}
  const {CommunityFoundationScreen:Foundation}=load('src/community/presentation/CommunityFoundationScreen');
  for(section of ['clubs','forums','people']) {root=await render(Foundation);assert.match(text(root),/Em construção/);await press('Voltar à comunidade');assert.equal(navigations.at(-1),'/community');}
  section='bad';root=await render(Foundation);assert.match(text(root),/Página não encontrada/);
  const {CommunityProfileScreen:Profile}=load('src/community/presentation/CommunityProfileScreen');
  root=await render(Profile);assert.match(text(root),/Leitor Real/);await press('Prévia para outros leitores');assert.match(text(renderer.root),/Perfil privado/);assert(!text(renderer.root).includes('Minha bio'));
  context.view.state.profile={...profile,privacy:'PUBLIC'};
  context.view.state.activities=[{id:'private',userId:'owner',type:'finished_book',bookId:'one',bookTitle:'Segredo privado',label:null,occurredAt:null,recordedAt:1,privacy:'PRIVATE'},
    {id:'public',userId:'owner',type:'finished_book',bookId:'two',bookTitle:'Obra pública',label:null,occurredAt:null,recordedAt:1,privacy:'PUBLIC'}];
  root=await render(Profile);await press('Prévia para outros leitores');assert.match(text(renderer.root),/Obra pública/);assert(!text(renderer.root).includes('Segredo privado'));
  context.view.state.profile={...profile,privacy:'FOLLOWERS'};root=await render(Profile);await press('Prévia para outros leitores');assert.match(text(renderer.root),/Perfil para seguidores/);
  const {CommunityEditProfileScreen:Edit}=load('src/community/presentation/CommunityEditProfileScreen');
  context.view.state.profile=profile;context.view.state.revision=8;
  root=await render(Edit);
  const change=async(label,value)=>act(async()=>renderer.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel===label).props.onChangeText(value));
  await change('Bio','Ideias e livros');await change('Gêneros favoritos (separados por vírgula)','Filosofia, História');
  await change('Livros na meta (vazio para remover)','12');await change('Ano da meta','2026');await press('Salvar perfil');
  assert.equal(saves[0].p.bio,'Ideias e livros');assert.deepEqual(saves[0].p.favoriteGenres,['Filosofia','História']);assert.deepEqual(saves[0].p.readingGoal,{year:2026,books:12});assert.equal(saves[0].r,8);
  root=await render(Edit);await change('Livros na meta (vazio para remover)','0');await press('Salvar perfil');assert.match(text(renderer.root),/meta deve ser/);assert.equal(saves.length,1);
  root=await render(Edit);context.service.saveProfile=async()=>{throw Error('disk full');};await press('Salvar perfil');assert.match(text(renderer.root),/disk full/);
  mode='dark';root=await render(Home);const page=root.findAllByType('View')[0];assert.equal(page.props.style.backgroundColor,'#12171a');
  for(const p of root.findAllByType('Pressable'))assert.equal(p.props.accessibilityRole,'button');
  context={...context,view:null,loading:true};root=await render(Home);assert.equal(root.findAllByType('ActivityIndicator').length,1);
  context={...context,error:'Dados corrompidos',loading:false};root=await render(Home);assert.match(text(root),/Dados corrompidos/);await press('Tentar novamente');
  for(const file of ['index','profile','edit-profile','[section]'])assert.equal(typeof load('app/community/'+file).default,'function');
  await act(async()=>renderer.unmount());
  console.log('PASS community controlled React UI: routes/actions, empty/error/loading states, privacy preview, profile/goal edits, validation/storage failures, dark theme, safe area and button labels. Not a device or authenticated-browser test.');
})().catch(e=>{console.error(e);process.exitCode=1;});
