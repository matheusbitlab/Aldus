// Real panel with controlled platform boundaries; not physical Android proof.
const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const React=require('../.expo/auth-test-tools/node_modules/react');
const {act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
const palette={text:'#222',secondaryText:'#555',accent:'#174',separator:'#ddd',panel:'#fff'};
const changes=[];const settings={palette,hideReadingCounts:false,theme:'paper',font:'serif',fontSize:20,lineHeight:1.5,paragraphSpacing:.8,marginSize:24,maxWidth:900,brightness:80,useSystemBrightness:true};
for(const key of ['HideReadingCounts','Theme','Font','FontSize','LineHeight','ParagraphSpacing','Margin','MaxWidth','Brightness','UseSystemBrightness'])settings['set'+key]=value=>changes.push([key,value]);
const output={};new Function('require','exports',ts.transpileModule(fs.readFileSync('src/presentation/components/ReaderSettingsPanel.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
 if(name==='react')return React;if(name==='react/jsx-runtime')return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');
 if(name==='react-native')return {Modal:'Modal',View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Switch:'Switch',TextInput:'TextInput',Platform:{OS:'android'},StyleSheet:{create:x=>x,absoluteFill:{}}};
 if(name.includes('ReaderSettingsContext'))return{useReaderSettings:()=>settings};
 if(name.includes('safe-area'))return{useSafeAreaInsets:()=>({top:24,bottom:24})};
 if(name.includes('ReaderSettingsSlider'))return{ReaderSettingsSlider:'Slider'};
 if(name.includes('MotionCuesControl'))return{MotionCuesControl:'Motion'};
 if(name.includes('readerUiDiagnostics'))return{readerUiDiagnostic(){}};
 if(name.includes('/tokens'))return{pdfReaderThemes:{paper:palette}};
 return{};
},output);
(async()=>{let tree,closed=0,focused=0;await act(async()=>{tree=create(React.createElement(output.ReaderSettingsPanel,{visible:true,panelMode:'appearance',onClose:()=>closed++,onReadInFocus:()=>focused++}));});
 const scroll=tree.root.findByType('ScrollView'),slider=tree.root.findAllByType('Slider').find(x=>x.props.accessibilityLabel==='Tamanho da fonte');
 for(const label of ['Tipografia','Página e layout','Concentração e conforto','Aparência']){
  const category=tree.root.findAllByType('Pressable').find(x=>x.findAllByType('Text').some(t=>t.children.includes(label)));assert(category,label);
  await act(async()=>category.props.onPress());assert.equal(category.props.accessibilityState.selected,true);
  assert.strictEqual(tree.root.findByType('ScrollView'),scroll);assert.strictEqual(tree.root.findAllByType('Slider').find(x=>x.props.accessibilityLabel==='Tamanho da fonte'),slider);
 }
 assert.deepEqual(changes,[],'Category navigation never writes reader preferences');
 await act(async()=>slider.props.onValueChange(24));assert.deepEqual(changes,[['FontSize',24]]);
 const hide=tree.root.findAllByType('Switch').find(x=>x.props.accessibilityLabel==='Ocultar porcentagem e contagem de páginas');await act(async()=>hide.props.onValueChange(true));assert.deepEqual(changes.at(-1),['HideReadingCounts',true]);
 const close=tree.root.findAllByType('Pressable').find(x=>x.props.accessibilityLabel==='Fechar ajustes de leitura');assert(!close.parent.findAllByType('ScrollView').length,'Close remains outside scroll content');await act(async()=>close.props.onPress());assert.equal(closed,1);
 await act(async()=>tree.unmount());console.log('PASS real settings categories: stable controls, no preference writes on navigation, slider/switch handlers and fixed close. Controlled platform, not device proof.');
})().catch(e=>{console.error(e);process.exitCode=1;});
