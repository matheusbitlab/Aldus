const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
const React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
const baseline=process.argv.includes('--baseline'),cache=new Map(),injections=[];
const WebView=React.forwardRef((props,ref)=>{React.useImperativeHandle(ref,()=>({injectJavaScript:x=>injections.push(x)}));return React.createElement('WebView',props);});
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);
const input=baseline&&file.endsWith('EpubPageViewer.native.tsx')?cp.execFileSync('git',['show','77c490c:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
const source=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','exports',source)(name=>{if(name==='react')return React;if(name==='react/jsx-runtime')return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');if(name==='react-native')return {View:'View',Text:'Text',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x,absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}}};if(name==='react-native-webview')return {WebView};return name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name);},exports);return exports;}
(async()=>{
 const {EpubPageViewer}=load('src/presentation/components/EpubPageViewer.native.tsx');
 const chapters=[{id:'chapter',title:'Teste',html:'<p>Texto local.</p>'}],reports=[];
 const props={chapters,pageNumber:1,initialRestorePending:true,restoreTargetReady:false,fontSize:16,fontFamily:'Georgia',marginSize:24,textColor:'#222222',backgroundColor:'#ffffff',onPageInfo:x=>reports.push(x)};
 let renderer;await act(async()=>{renderer=create(React.createElement(EpubPageViewer,props));});
 let view=renderer.root.findByType('WebView');const source=view.props.source;
 if(baseline){assert.match(source.html,/var restorationPending = false/);assert.ok(injections.some(x=>/goToPage/.test(x)));console.log('REPRODUCED Native ignores restore protocol and injects page before load');await act(async()=>renderer.unmount());return;}
 assert.match(source.html,/var restorationPending = true/);assert.equal(injections.length,0);
 await act(async()=>view.props.onLoadEnd());
 assert.ok(injections.some(x=>/beginInitialRestore/.test(x)));assert.equal(injections.some(x=>/goToPage/.test(x)),false);
 const emit=(page,ready)=>renderer.root.findByType('WebView').props.onMessage({nativeEvent:{data:JSON.stringify({type:'page',pageNumber:page,totalPages:100,layoutReady:ready})}});
 await act(async()=>emit(1,false));assert.equal(injections.some(x=>/goToPage/.test(x)),false);
 await act(async()=>emit(1,true));assert.equal(injections.some(x=>/goToPage/.test(x)),false);
 await act(async()=>renderer.update(React.createElement(EpubPageViewer,{...props,pageNumber:37,restoreTargetReady:true})));
 assert.ok(injections.some(x=>/restoreReadingPosition/.test(x)&&/"pageNumber":37/.test(x)));
 await act(async()=>emit(37,true));
 await act(async()=>renderer.update(React.createElement(EpubPageViewer,{...props,pageNumber:37,initialRestorePending:false,fontSize:22,textColor:'#eeeeee',backgroundColor:'#111111'})));
 assert.strictEqual(renderer.root.findByType('WebView').props.source,source);assert.ok(injections.some(x=>/completeInitialRestore/.test(x)));
 const count=injections.length;
 await act(async()=>renderer.update(React.createElement(EpubPageViewer,{...props,pageNumber:37,initialRestorePending:false,fontSize:22,textColor:'#eeeeee',backgroundColor:'#111111',onPageInfo:()=>{}})));
 assert.equal(injections.length,count);assert.strictEqual(renderer.root.findByType('WebView').props.source,source);
 // Confirmations update pageNumber but must never become another navigation command.
 const beforeConfirmation=injections.length;
 await act(async()=>renderer.update(React.createElement(EpubPageViewer,{...props,pageNumber:24,initialRestorePending:false,fontSize:22,textColor:'#eeeeee',backgroundColor:'#111111'})));
 assert.equal(injections.length,beforeConfirmation);
 const request={id:7,pageNumber:61,origin:'SLIDER_COMMIT'};
 await act(async()=>renderer.update(React.createElement(EpubPageViewer,{...props,pageNumber:24,initialRestorePending:false,fontSize:22,textColor:'#eeeeee',backgroundColor:'#111111',navigationRequest:request})));
 assert.equal(injections.length,beforeConfirmation+1);
 assert.match(injections.at(-1),/"operationId":7/);
 await act(async()=>renderer.update(React.createElement(EpubPageViewer,{...props,pageNumber:61,initialRestorePending:false,fontSize:22,textColor:'#eeeeee',backgroundColor:'#111111',navigationRequest:request})));
 assert.equal(injections.length,beforeConfirmation+1,'ACK must not echo navigation');
 await act(async()=>renderer.unmount());
 const {documentSafeInsets,readerFeedbackTop}=load('src/presentation/components/reader/ReaderGeometry.ts');
 const insets={top:32,bottom:24,left:5,right:7};assert.deepEqual(documentSafeInsets('android',insets),insets);assert.deepEqual(documentSafeInsets('web',insets),{top:0,bottom:0,left:0,right:0});
 assert.equal(readerFeedbackTop(32,true,86),98);assert.equal(readerFeedbackTop(32,false,86),44);
 console.log('PASS Native load/layout/restore acknowledgement, stable WebView/source for callback/theme/font updates, safe geometry, feedback below header');
})().catch(e=>{console.error(e);process.exitCode=1;});
