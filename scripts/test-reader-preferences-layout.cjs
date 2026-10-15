// Actual Native component hierarchy + Yoga layout engine, not touch dispatch on Android.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
const settings={palette:{panel:'#eee',text:'#222',secondaryText:'#777',accent:'#a54'},brightness:100,useSystemBrightness:true,theme:'paper',font:'serif',fontSize:18,lineHeight:1.6,marginSize:20,paragraphSpacing:1};
const exportsForPanel={},code=ts.transpileModule(fs.readFileSync('src/presentation/components/ReaderSettingsPanel.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function('require','exports',code)(name=>{
 if(name==='react')return React;if(name==='react/jsx-runtime')return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');
 if(name==='react-native')return {Modal:'Modal',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',Switch:'Switch',Text:'Text',TextInput:'TextInput',Platform:{OS:'android'},StyleSheet:{create:x=>x,absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}}};
 if(name.includes('ReaderSettingsContext'))return {useReaderSettings:()=>settings};
 if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:24,bottom:24})};
 if(name.endsWith('MotionCuesControl'))return {MotionCuesControl:()=>React.createElement('MotionCues')};
 if(name.endsWith('ReaderSettingsSlider'))return {ReaderSettingsSlider:()=>React.createElement('Slider')};
 if(name.includes('readerUiDiagnostics'))return {readerUiDiagnostic(){}};
 if(name.includes('tokens'))return {pdfReaderThemes:{}};
 return {};
},exportsForPanel);
(async()=>{
 let closed=0,renderer;await act(async()=>{renderer=create(React.createElement(exportsForPanel.ReaderSettingsPanel,{visible:true,panelMode:'appearance',onClose:()=>closed++}))});
 const scroll=renderer.root.findByType('ScrollView'),panel=scroll.parent,backdrop=panel.parent;
 assert.equal(panel.type,'View');assert.equal(backdrop.type,'View');
 for(let parent=scroll.parent;parent;parent=parent.parent)assert.notEqual(parent.type,'Pressable','No ancestor press responder may compete with scroll');
 const dismiss=backdrop.findAllByType('Pressable').find(n=>n.props.accessibilityLabel==='Fechar preferências');assert.equal(dismiss.parent,backdrop);
 await act(async()=>dismiss.props.onPress());assert.equal(closed,1);
 assert.equal(scroll.props.keyboardShouldPersistTaps,'handled');
 const yoga=(await import('../.expo/layout-test/node_modules/yoga-layout/dist/src/index.js')).default;
 const flatten=style=>Object.assign({},...[style].flat(Infinity).filter(Boolean));
 const panelStyle=flatten(panel.props.style),scrollStyle=flatten(scroll.props.style);
 for(const [width,height] of [[320,480],[480,320],[390,844],[844,390]])for(const contentHeight of [150,1600,3200]){
   const root=yoga.Node.create();root.setWidth(width);root.setHeight(height);root.setFlexDirection(yoga.FLEX_DIRECTION_COLUMN);root.setJustifyContent(yoga.JUSTIFY_FLEX_END);root.setPadding(yoga.EDGE_TOP,24);root.setPadding(yoga.EDGE_BOTTOM,24);
   const p=yoga.Node.create();p.setWidthPercent(100);p.setMaxWidth(panelStyle.maxWidth);p.setMaxHeightPercent(parseFloat(panelStyle.maxHeight));
   const s=yoga.Node.create();s.setFlexGrow(1);s.setFlexShrink(1);s.setOverflow(yoga.OVERFLOW_SCROLL);s.setMaxHeightPercent(parseFloat(scrollStyle.maxHeight));
   const content=yoga.Node.create();content.setHeight(contentHeight);s.insertChild(content,0);p.insertChild(s,0);root.insertChild(p,0);root.calculateLayout();
   const viewport=s.getComputedHeight();assert.ok(viewport>0&&viewport<=height-48);assert.ok(contentHeight<=viewport||content.getComputedHeight()>viewport,'Overflow remains in bounded scroll viewport');assert.ok(p.getComputedTop()>=24);assert.ok(p.getComputedTop()+p.getComputedHeight()<=height-24);
   root.freeRecursive();
 }
 await act(async()=>renderer.unmount());console.log('PASS preferences Native hierarchy/backdrop/keyboard and 12 Yoga bounded-layout cases: portrait/landscape, short/long/large-font-equivalent content. No Android touch proof or claim of a new fix.');
})().catch(e=>{console.error(e);process.exitCode=1});
