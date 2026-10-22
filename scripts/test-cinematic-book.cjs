const assert=require('node:assert/strict'),fs=require('node:fs');
const load=require('./community-test-loader.cjs')();
const {resolveBookPose,bookScrollProgress,bookStops,bookBeats,bookVisualProgress,bookTransitionEase,followBookScroll,chooseBookQuality,assessBookPerformance,initialBookPerformance}=load('src/marketing/bookMotion.ts');
const {createParticleTargets,communityNodes,communityEdges}=load('src/marketing/cinematic/particleTargets.ts');
const finite=x=>typeof x==='number'?Number.isFinite(x):Array.isArray(x)?x.every(finite):x&&typeof x==='object'?Object.values(x).every(finite):true;
const closed=resolveBookPose(0),end=resolveBookPose(1);
assert(Math.abs(closed.coverAngle)<1e-8);assert(Math.abs(end.coverAngle)<1e-8);assert.equal(closed.open,0);assert.equal(end.open,0);
assert.equal(closed.chapter,0);assert.equal(end.chapter,6);assert.equal(end.to,0);
assert(closed.leaves.every(x=>x.angle===0&&x.curl===0));assert(end.leaves.every(x=>x.angle===0&&Math.abs(x.curl)<1e-8));
for(let i=0;i<=1000;i++){
 const p=i/1000,pose=resolveBookPose(p);assert(finite(pose));assert.deepEqual(resolveBookPose(p),pose,'Same progress in either direction must give exactly the same pose');
 assert(pose.morph>=0&&pose.morph<=1&&pose.open>=0&&pose.open<=1);assert(pose.leaves.every(x=>x.angle<=0&&x.angle>=-171&&x.curl>=0&&x.curl<=.6));
 assert(pose.from>=0&&pose.from<=6&&pose.to>=0&&pose.to<=6);
}
for(const [i,p]of bookStops.entries())assert.equal(resolveBookPose(p).chapter,i);
assert(resolveBookPose(.12).open>0&&resolveBookPose(.12).open<1,'Partial opening, not a trigger');
assert(resolveBookPose(.94).open>0&&resolveBookPose(.94).open<1,'Physical closing in final reconstruction');
assert(closed.leaves.every(leaf=>leaf.z>.085&&leaf.z<.1475),'Printed leaves stay above the paper block and below the closed cover');
for(const [p,key]of [[.36,'library'],[.52,'reader'],[.69,'study'],[.85,'community']])assert(resolveBookPose(p)[key]>.99,'A complete readable scene: '+key);
assert(resolveBookPose(0).particleOpacity>0,'Closed-book introduction retains a little atmosphere');
for(let i=0;i<=1000;i++){const pose=resolveBookPose(i/1000);if(pose.visualProgress>=.065)assert.equal(pose.particleOpacity,0,'Opening, every page turn and closing stay free of particles');}
for(const [index,beat]of bookBeats.entries()){
 const samples=[beat.start,(beat.start+beat.end)/2,beat.end];
 const view=p=>{const {progress,...visual}=resolveBookPose(p);return visual;};
 for(const p of samples){assert.deepEqual(view(p),view(samples[0]),'Camera, paper, content and caption stay exactly fixed throughout reading interval '+index);assert.equal(resolveBookPose(p).captionOpacity,1);assert.equal(resolveBookPose(p).chapter,index);}
 assert.equal(bookVisualProgress(bookStops[index]),beat.pose,'Navigation lands on a completed readable pose');
 if(index>=2&&index<=5){const pose=resolveBookPose(bookStops[index]);assert.equal(pose.leaves[index-2].angle,-171,'A reading interval starts after its page has fully turned');assert(beat.end-beat.start>=.1,'Feature scenes have substantial scroll dwell');}
 for(const edge of [beat.start,beat.end])assert(Math.abs(bookVisualProgress(edge-1e-7)-bookVisualProgress(edge+1e-7))<.00001,'Reading intervals join continuously');
}
for(let i=1;i<=1000;i++)assert(bookVisualProgress(i/1000)>=bookVisualProgress((i-1)/1000),'Scroll mapping never reverses direction or jumps stages');
for(let index=0;index<4;index++){
 const start=bookBeats[index+1].end,end=bookBeats[index+2].start;
 assert((end-start)*12>.095*5.1,'Each full turn uses more physical scroll than the previous 610svh sequence');
 for(const t of [0,.25,.5,.75,1])assert(Math.abs(resolveBookPose(start+(end-start)*t).leaves[index].angle+171*bookTransitionEase(t))<1e-8,'A turn uses the whole transition with one easing curve');
}
assert.equal(bookTransitionEase(0),0);assert.equal(bookTransitionEase(.5),.5);assert.equal(bookTransitionEase(1),1);
for(let i=1;i<=1000;i++){
 const p=i/1000,previous=bookTransitionEase(p-.001),next=bookTransitionEase(p);
 assert(next>=previous&&next<=1);assert((next-previous)/.001<1.32,'Cruising turns avoid a central speed burst');
 assert(Math.abs(next+bookTransitionEase(1-p)-1)<1e-12,'Forward and reverse use the same motion curve');
}
for(const edge of [0,1]){
 const h=.0001,velocity=(bookTransitionEase(edge+h)-bookTransitionEase(edge-h))/(2*h);
 const acceleration=(bookTransitionEase(edge+h)-2*bookTransitionEase(edge)+bookTransitionEase(edge-h))/(h*h);
 assert(Math.abs(velocity)<1e-7&&Math.abs(acceleration)<.001,'A stationary hold meets the turn with zero speed and acceleration');
}
for(const [index,beat]of bookBeats.entries())if(index){const boundary=(bookBeats[index-1].end+beat.start)/2;assert(resolveBookPose(boundary).captionOpacity<1e-8,'Only the chapter handover fades the caption');}
assert.notEqual(resolveBookPose(.12).cameraY,resolveBookPose(.7).cameraY);
for(const value of [NaN,Infinity,-2])assert.deepEqual(resolveBookPose(value),closed);assert.deepEqual(resolveBookPose(2),end);
assert.equal(bookScrollProgress(100,100,1200,200),0);assert.equal(bookScrollProgress(600,100,1200,200),.5);assert.equal(bookScrollProgress(1100,100,1200,200),1);
for(const values of [[0,0,0,0],[10,0,100,200],[NaN,0,1000,200],[0,NaN,1000,200],[0,0,Infinity,200]])assert.equal(bookScrollProgress(...values),0);
// A discrete wheel sample is spread across frames without an autonomous clock,
// overshoot or asymptotic work forever. Refresh rate must not alter its timing.
const resting=progress=>({progress,velocity:0});
const after=(ms,step)=>{let state=resting(0);for(let t=0;t<ms;t+=step)state=followBookScroll(state,1,Math.min(step,ms-t));return state;};
assert(followBookScroll(resting(0),1,16).progress>0&&followBookScroll(resting(0),1,16).progress<1);
assert(Math.abs(after(120,1000/60).progress-after(120,1000/120).progress)<1e-8);
assert(Math.abs(after(120,1000/60).velocity-after(120,1000/120).velocity)<1e-10);
assert.deepEqual(after(800,1000/60),resting(1),'Idle settles exactly and can stop scheduling');
assert(after(96,16).progress>.79,'Gradual acceleration does not add a long input delay');
for(const [from,to]of [[.1,.9],[.9,.1],[.5,.5]]){let state=resting(from);for(let i=0;i<60;i++){const next=followBookScroll(state,to,16.7);assert(next.progress>=Math.min(state.progress,to)&&next.progress<=Math.max(state.progress,to));state=next;}assert.deepEqual(state,resting(to));}
const moving=followBookScroll(resting(.42),.44,16.7),retargeted=followBookScroll(moving,.46,0);
assert.equal(retargeted.velocity,moving.velocity,'Continuing the wheel gesture preserves velocity instead of restarting it');
const tiny=followBookScroll(moving,.46,.001);
assert(Math.abs((tiny.progress-moving.progress)/.001-moving.velocity)<1e-6,'Position derivative matches retained velocity when the target changes');
const gesture=step=>{let state=resting(.4);for(const target of [.42,.445,.46,.475,.45,.42])for(let elapsed=0;elapsed<40;elapsed+=step)state=followBookScroll(state,target,Math.min(step,40-elapsed));return state;};
assert(Math.abs(gesture(1000/60).progress-gesture(1000/120).progress)<1e-10,'Retargeting and reversal remain frame-rate independent');
for(const velocity of [-999,-.001,0,.001,999,NaN])for(const target of [.39,.400001,.41]){const next=followBookScroll({progress:.4,velocity},target,64);assert(finite(next));assert(next.progress>=Math.min(.4,target)&&next.progress<=Math.max(.4,target),'Braking prevents adversarial momentum from crossing the target');}
assert(followBookScroll(moving,.41,16.7).progress<moving.progress,'Reverse scroll responds on the next frame');
const almost=.44-.00014;
assert(followBookScroll(resting(almost),.44,16.7).progress<.44,'A small final gap is eased rather than snapped');
assert(Math.abs(resolveBookPose(followBookScroll(resting(almost),.44,16.7).progress).leaves[1].angle-resolveBookPose(almost).leaves[1].angle)<.17,'Terminal correction cannot jump a visible fraction of a page turn');
assert.equal(followBookScroll(resting(.5),.9,0).progress,.5);assert.equal(followBookScroll(resting(.5),.9,-10).progress,.5);
assert.deepEqual(followBookScroll(resting(NaN),.4,16),resting(.4));assert(finite(followBookScroll(resting(.5),Infinity,NaN)));
assert.equal(chooseBookQuality(1440).particles,4096);assert.equal(chooseBookQuality(390).particles,1600);assert.equal(chooseBookQuality(1440,2).particles,900);assert.equal(chooseBookQuality(1440,8,8,true).shadows,false);
for(const [gap,expected]of [[16,false],[45,false],[55,true],[120,true],[400,true]]){
 let state={...initialBookPerformance};
 for(let i=0;i<28;i++)state=assessBookPerformance(state,i*.005,1000+i*gap);
 assert.equal(state.fallback,expected,'Sustained slow software frames must reach static fallback even above 240ms');
 if(expected)assert(state.reduced);
}
let alternating={...initialBookPerformance},observedAt=1000;
for(let i=0;i<80;i++){observedAt+=i%2?33:80;alternating=assessBookPerformance(alternating,i*.005,observedAt);}
assert(alternating.fallback,'Alternating fast/slow frames must not reset a sustained insufficient average');
let warm={...initialBookPerformance};warm=assessBookPerformance(warm,0,1000);warm=assessBookPerformance(warm,.005,1500);
for(let i=1;i<=80;i++)warm=assessBookPerformance(warm,.005+i*.005,1500+i*16.7);
assert.equal(warm.reduced,false,'One cold initialization gap cannot downgrade a sustained 60 FPS GPU');
assert.equal(warm.fallback,false);
for(const [gap,step]of [[2000,.005],[120,.15],[120,0]]){
 let state={...initialBookPerformance};for(let i=0;i<28;i++)state=assessBookPerformance(state,(i*step)%1,1000+i*gap);
 assert.equal(state.reduced,false,'Idle, stationary and explicit chapter jumps are not slow rendering');
}
const count=1600,a=createParticleTargets(count),b=createParticleTargets(count);assert.equal(a.targets.length,7);
assert.deepEqual(a,b,'Reopening the landing cannot reshuffle identities or targets');
for(const target of a.targets){assert.equal(target.length,count*3);assert([...target].every(Number.isFinite));assert([...target].every(x=>Math.abs(x)<4));}
for(let i=0;i<a.targets.length;i++)for(let j=i+1;j<a.targets.length;j++)assert.notDeepEqual(a.targets[i],a.targets[j],'Particles must form different structures, not a shared decorative cloud');
assert.equal(a.targets.reduce((n,t)=>n+t.byteLength,0)+a.seeds.byteLength,140800,'Known mobile buffer budget');
assert(communityEdges.every(([x,y])=>x!==y&&communityNodes[x]&&communityNodes[y]));
for(const count of [0,-1,NaN,8193,1.2])assert.throws(()=>createParticleTargets(count));
// Cross-scene endpoint continuity includes the actual target positions used by the GPU.
const position=p=>{const pose=resolveBookPose(p);return Array.from({length:3},(_,i)=>a.targets[pose.from][i]*(1-pose.morph)+a.targets[pose.to][i]*pose.morph)};
for(const p of [.075,.19,.36,.52,.69,.85]){const before=position(p-1e-6),after=position(p+1e-6);assert(before.every((v,i)=>Math.abs(v-after[i])<.001),'Morph endpoints do not jump');}
const scene=fs.readFileSync('src/marketing/cinematic/BookScene.web.ts','utf8');
assert.match(scene,/new Points\(/);assert.match(scene,/new BufferAttribute\(target, 3\)/);assert.match(scene,/uMorph/);assert.match(scene,/uDissolve/);
assert.doesNotMatch(scene,/fetch\(|TextureLoader|setInterval|Date\.now|requestAnimationFrame/,'Renderer has no autonomous clock or remote model dependency');
assert.match(scene,/key\.shadow\.dispose\(\)/);assert.match(scene,/renderer\.forceContextLoss\(\)/);
assert.match(scene,/qualitySamples < 24/,'Rendering budget probes are strictly bounded');
assert.match(scene,/qualitySamples \* \.005/,'Quality samples cannot mistake slow human scroll for slow rendering');
assert.doesNotMatch(fs.readFileSync('app/index.tsx','utf8'),/marketing|three|BookScene/,'Native entry cannot load the 3D scene');
// Browser evaluate strings are another JavaScript program; checking the Node file
// alone cannot catch a broken selector quote inside that program.
const ts=require('typescript'),vm=require('node:vm');
const browser=ts.createSourceFile('browser.cjs',fs.readFileSync('scripts/test-marketing-web.cjs','utf8'),ts.ScriptTarget.Latest,true);
let browserPrograms=0;
function inspect(node){
 if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='evaluate'){
  const first=node.arguments[0];if(first&&(ts.isStringLiteral(first)||ts.isNoSubstitutionTemplateLiteral(first))){new vm.Script(first.text);browserPrograms++;}
 }
 ts.forEachChild(node,inspect);
}
inspect(browser);assert(browserPrograms>25,'Validate embedded browser programs as well as the harness');
console.log('PASS cinematic contracts: one closed/reconstructed book, continuous reversible poses and page curvature, finite nested-scroll math, real distinct particle targets, bounded buffers, quality budgets, explicit resource release and no Native entry dependency. GPU/visual proof requires Chromium.');
