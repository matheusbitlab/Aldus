const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),cp=require('node:child_process');
const React=require('../.expo/auth-test-tools/node_modules/react'),{act,create}=require('../.expo/auth-test-tools/node_modules/react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
const baseline=process.argv.includes('--baseline'),cache=new Map(),listeners=new Set(),appListeners=new Set(),storeListeners=new Set();
const timers=new Map();let timerId=0;
let sensors=0,available=true;
const sensor={isAvailableAsync:async()=>available,getPermissionsAsync:async()=>({granted:true}),requestPermissionsAsync:async()=>({granted:true}),setUpdateInterval:()=>{},addListener:fn=>{listeners.add(fn);sensors++;let removed=false;return {remove:()=>{if(removed)return;removed=true;listeners.delete(fn);sensors--;}};}};
let state={enabled:true,hydrated:true,status:'available',message:'',setStatus:(status,message)=>update({status,message}),setEnabled:enabled=>update({enabled})};
function update(next){state={...state,...next};storeListeners.forEach(fn=>fn());}
const store=selector=>{const value=React.useSyncExternalStore(fn=>{storeListeners.add(fn);return()=>storeListeners.delete(fn);},()=>state);return selector?selector(value):value;};store.getState=()=>state;
const AppState={currentState:'active',addEventListener:(_,fn)=>{appListeners.add(fn);return {remove:()=>appListeners.delete(fn)};}};
function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const original=baseline&&['session.ts','useMotionCues.ts','MotionCuesControl.tsx'].some(n=>file.endsWith(n))?cp.execFileSync('git',['show','77c490c:'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');const code=ts.transpileModule(original,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
new Function('require','exports','setTimeout','clearTimeout',code)(name=>{if(name==='react')return React;if(name==='react/jsx-runtime')return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');if(name==='react-native')return {AppState,Platform:{OS:'android'},View:'View',Text:'Text',Switch:'Switch',StyleSheet:{create:x=>x,absoluteFill:{}}};if(name==='expo-router')return {useFocusEffect:callback=>React.useEffect(callback,[callback])};if(name==='expo-sensors')return {DeviceMotion:sensor,Accelerometer:{isAvailableAsync:async()=>true}};if(name==='react-native-reanimated')return {__esModule:true,default:{View:'AnimatedView'},useSharedValue:initial=>React.useRef({value:initial}).current,withTiming:x=>x,cancelAnimation:()=>{},useAnimatedStyle:fn=>fn()};if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>({top:30,bottom:20,left:0,right:0})};if(name.includes('motionCuesStore'))return {useMotionCuesStore:store};if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.posix.join(path.posix.dirname(file),name);return load(['.ts','.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(p)));}return require(name);},exports,fn=>{timers.set(++timerId,fn);return timerId;},id=>timers.delete(id));return exports;}
(async()=>{
 const processing=load('src/presentation/motion/processing.ts');processing.MOTION.staleMs=20;
 const {useMotionCues}=load('src/presentation/motion/useMotionCues.ts');
 let cues;function Probe(){cues=useMotionCues();return React.createElement('Probe');}
 let renderer;await act(async()=>{renderer=create(React.createElement(Probe));});assert.equal(sensors,1);
 const emit=timestamp=>listeners.forEach(fn=>fn({acceleration:{x:1,y:0,z:0,timestamp},orientation:0,accelerationIncludingGravity:{x:1,y:0,z:9.8},rotation:{}}));
 await act(async()=>emit(1));assert.ok(cues.x.value>0);assert.equal(cues.opacity.value,.6);
 await act(async()=>{const due=[...timers.values()];timers.clear();due.forEach(fn=>fn());});assert.equal(state.status,'unavailable');assert.equal(cues.opacity.value,0);
 assert.equal(sensors,baseline?0:1);await act(async()=>emit(2));assert.equal(cues.opacity.value,baseline?0:.6);
 if(baseline){console.log('REPRODUCED watchdog removes listener and ignores real late sample');await act(async()=>renderer.unmount());return;}
 const app=async active=>act(async()=>{AppState.currentState=active?'active':'background';appListeners.forEach(fn=>fn(AppState.currentState));});
 for(let n=0;n<3;n++){await app(false);assert.equal(sensors,0);assert.equal(cues.opacity.value,0);await app(true);assert.equal(sensors,1);await act(async()=>emit(10+n));assert.equal(cues.opacity.value,.6);}
 await act(async()=>update({enabled:false}));assert.equal(sensors,0);
 await act(async()=>update({enabled:true}));assert.equal(sensors,1);
 await act(async()=>renderer.unmount());assert.equal(sensors,0);assert.equal(appListeners.size,0);
 // Explicit toggle rechecks availability even after a stale/unavailable state.
 const {MotionCuesControl}=load('src/presentation/components/MotionCuesControl.tsx');
 await act(async()=>{renderer=create(React.createElement(MotionCuesControl,{color:'#000'}));});
 await act(async()=>update({enabled:false,status:'unavailable'}));assert.equal(renderer.root.findByType('Switch').props.disabled,false);
 available=false;await act(async()=>renderer.root.findByType('Switch').props.onValueChange(true));assert.equal(state.enabled,false);
 available=true;await act(async()=>renderer.root.findByType('Switch').props.onValueChange(true));assert.equal(state.enabled,true);
 await act(async()=>renderer.unmount());
 const {MotionCuesOverlay}=load('src/presentation/components/MotionCuesOverlay.tsx');
 await act(async()=>{renderer=create(React.createElement(MotionCuesOverlay,{color:'#000'}));});
 assert.equal(renderer.root.findAllByType('View')[0].props.pointerEvents,'none');assert.equal(renderer.root.findAllByType('AnimatedView').length,8);
 assert.equal(renderer.root.findAllByType('View')[0].props.style[1].zIndex,30);
 await act(async()=>renderer.unmount());assert.equal(sensors,0);
 console.log('PASS actual hook: late-sample recovery, 3 background/foreground cycles, toggle/unmount cleanup, one listener, availability recheck, overlay pointerEvents none; synthetic sensor boundary');
})().catch(e=>{console.error(e);process.exitCode=1;});
