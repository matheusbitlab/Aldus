const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file) {
 const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
 const module = { exports: {} }; new Function('module', 'exports', code)(module, module.exports); return module.exports;
}
const { MOTION, screenAcceleration, displacement, smooth } = load('src/presentation/motion/processing.ts');
const { startMotionSession } = load('src/presentation/motion/session.ts');
assert.deepEqual(screenAcceleration({x:2,y:3},0), {x:2,y:-3});
assert.deepEqual(screenAcceleration({x:2,y:3},90), {x:3,y:2});
assert.deepEqual(screenAcceleration({x:2,y:3},-90), {x:-3,y:-2});
assert.deepEqual(screenAcceleration({x:2,y:3},180), {x:-2,y:3});
for (const a of [null, undefined, {x:NaN,y:0}, {x:0,y:Infinity}]) assert.equal(screenAcceleration(a,0),null);
assert.equal(screenAcceleration({x:0,y:0},42),null);
assert.deepEqual(displacement({x:0.1,y:-0.1}),{x:0,y:0});
assert.deepEqual(displacement({x:100,y:-100}),{x:MOTION.maxX,y:-MOTION.maxY});
assert.equal(displacement({x:1,y:0}).x,-displacement({x:-1,y:0}).x);
const zero={x:0,y:0}, target={x:4,y:8};
assert.deepEqual(smooth(zero,zero,33),zero);
const two=smooth(smooth(zero,target,20),target,20), one=smooth(zero,target,40);
assert.ok(Math.abs(two.x-one.x)<1e-10);
let neutral=target; for(let i=0;i<100;i++) neutral=smooth(neutral,zero,33); assert.ok(Math.abs(neutral.y)<1e-6);
(async () => {
 let count=0, receive, resets=0, status;
 const options={available:async()=>true, subscribe:fn=>{count++;receive=fn;return {remove:()=>count--};}, valid:s=>s===1, receive:()=>{}, status:s=>status=s, reset:()=>resets++, staleMs:25};
 let resolve; const cancel=startMotionSession({...options,available:()=>new Promise(r=>resolve=r)});
 cancel(); resolve(true); await new Promise(r=>setImmediate(r)); assert.equal(count,0);
 for(const reason of ['disable','blur','background']) {
  const stop=startMotionSession(options); await new Promise(r=>setImmediate(r)); assert.equal(count,1,reason);
  receive(1); assert.equal(status,true); stop(); stop(); assert.equal(count,0,reason);
 }
 const stop=startMotionSession(options); await new Promise(r=>setImmediate(r)); receive(0);
 await new Promise(r=>setTimeout(r,40)); assert.equal(count,1); assert.equal(status,false);
 receive(1); assert.equal(status,true); assert.equal(count,1); stop(); assert.equal(count,0);
 assert.ok(resets>0);
 const reader=fs.readFileSync('src/presentation/screens/ReaderScreen.tsx','utf8');
 assert.equal((reader.match(/<MotionCuesOverlay/g)||[]).length,1);
 assert.ok(!reader.includes('useMotionCuesStore'));
 for(const file of ['src/presentation/components/EpubPageViewer.native.tsx','src/presentation/components/EpubPageViewer.web.tsx','src/presentation/components/reader/DocumentReaderAdapter.tsx']) assert.ok(!fs.readFileSync(file,'utf8').includes('motionCues'));
 console.log('PASS: synthetic signals, axes, smoothing, async cancellation, cleanup, watchdog, isolated reader integration');
})().catch(error=>{console.error(error);process.exitCode=1;});
