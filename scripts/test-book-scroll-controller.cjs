// Actual ScrollBookStory effect with controlled DOM, module boundary and RAF.
// No browser, GPU, remote service, user account or timing sleeps are involved.
const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
const React = require('../.expo/auth-test-tools/node_modules/react');
const { act, create } = require('../.expo/auth-test-tools/node_modules/react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const compilerOptions = { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: false };
const motion = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/marketing/bookMotion.ts', 'utf8'), { compilerOptions }).outputText)(motion);
const source = ts.transpileModule(fs.readFileSync('src/marketing/ScrollBookStory.tsx', 'utf8'), { compilerOptions }).outputText;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function events(target = {}) {
  const listeners = new Map(), options = new Map();
  return Object.assign(target, {
    listeners, options,
    addEventListener(name, handler, option) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(handler); options.set(name, option); },
    removeEventListener(name, handler) { listeners.get(name)?.delete(handler); },
    emit(name) { for (const handler of [...listeners.get(name) ?? []]) handler(); },
  });
}
async function harness({ delayImport = false } = {}) {
  const imports = deferred(), frames = new Map(), renders = [], resizes = [], instances = [];
  let now = 1000, frameId = 0, observer, resizeObserver, importsCount = 0, mounts = 0, disposed = 0, budgetFrames = 0;
  const media = events({ matches: false }), resolution = events({ matches: true });
  const window = events({ matchMedia: query => query.includes('prefers-reduced-motion') ? media : resolution });
  const document = events({ hidden: false, fonts: { ready: Promise.resolve() } });
  const styleWrites = [];
  const scroller = events({ clientHeight: 900, scrollTop: 0,
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 80 }) }),
    getBoundingClientRect: () => ({ top: 0 }),
    scrollTo({ top }) { this.scrollTop = top; this.emit('scroll'); },
  });
  const track = { dataset: {}, style: { setProperty: (...args) => styleWrites.push(args) }, closest: () => scroller,
    getBoundingClientRect: () => ({ top: 80 - scroller.scrollTop }), offsetHeight: 5400 };
  const pinned = { offsetHeight: 820 };
  const visual = { dataset: {}, clientWidth: 1440, clientHeight: 700 };
  class IntersectionObserver { constructor(callback) { observer = this; this.callback = callback; } observe(node) { this.node = node; } disconnect() { this.disconnected = true; } }
  class ResizeObserver { constructor(callback) { resizeObserver = this; this.callback = callback; } observe() {} disconnect() { this.disconnected = true; } }
  const mountBookScene = (host, failure) => { mounts++; assert.strictEqual(host, visual); const item = {
    failure, render(pose) { renders.push(pose); if (budgetFrames) budgetFrames--; },
    resize(w, h) { resizes.push([w, h]); }, needsBudgetFrame: () => budgetFrames > 0,
    dispose() { disposed++; },
  }; instances.push(item); return item; };
  if (!delayImport) imports.resolve({ mountBookScene });
  const exports = {};
  new Function('require', 'exports', 'window', 'document', 'navigator', 'IntersectionObserver', 'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', source)(name => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return require('../.expo/auth-test-tools/node_modules/react/jsx-runtime');
    if (name === './bookMotion') return motion;
    if (name === './bookStyles') return { bookCss: '' };
    if (name === './cinematic/BookScene.web') { importsCount++; return imports.promise; }
    throw Error('Uncontrolled dependency: ' + name);
  }, exports, window, document, { deviceMemory: 8, hardwareConcurrency: 8 }, IntersectionObserver, ResizeObserver,
  callback => { frames.set(++frameId, callback); return frameId; }, id => frames.delete(id), { now: () => now });
  let tree;
  await act(async () => { tree = create(React.createElement(exports.ScrollBookStory, { plans: [] }, 'Hero'), {
    createNodeMock: element => element.type === 'section' ? track : element.props.className === 'al-book-sticky' ? pinned : element.props['data-book-scene'] !== undefined ? visual : {},
  }); });
  const enter = async value => act(async () => observer.callback([{ isIntersecting: value }]));
  const tick = async (ms=1000/60) => act(async () => { const pending = [...frames.values()]; frames.clear(); now += ms; pending.forEach(callback => callback(now)); });
  const drain = async () => { let count = 0; while (frames.size && count < 80) { await tick(); count++; } assert.equal(frames.size, 0, 'Controller must sleep after converging'); return count; };
  const scroll = async progress => act(async () => { scroller.scrollTop = progress * (track.offsetHeight - pinned.offsetHeight); scroller.emit('scroll'); });
  return { frames, renders, resizes, instances, scroller, track, pinned, visual, media, resolution, document, window, styleWrites,
    enter, tick, drain, scroll, tree, elapse: ms => { now += ms; }, resolveImport: async () => act(async () => imports.resolve({ mountBookScene })),
    get mounts() { return mounts; }, get disposed() { return disposed; }, get importsCount() { return importsCount; },
    set budgetFrames(n) { budgetFrames = n; }, resize: async () => act(async () => resizeObserver.callback([])),
    unmount: async () => act(async () => tree.unmount()),
    get intersectionDisconnected() { return observer.disconnected; }, get resizeDisconnected() { return resizeObserver.disconnected; },
  };
}
(async () => {
  const h = await harness();
  assert.equal(h.mounts, 0, 'Module is not mounted before intersection');
  await h.enter(true); await h.drain();
  assert.equal(h.mounts, 1, JSON.stringify({ imports: h.importsCount, track: h.track.dataset, visual: h.visual.dataset })); assert.equal(h.renders.at(-1).progress, 0);
  assert.deepEqual(h.scroller.options.get('scroll'), { passive: true });
  assert.deepEqual(h.resizes, [[1440, 700]]);
  const before = h.renders.length;
  for (let i = 0; i < 20; i++) await h.scroll(.4);
  assert.equal(h.frames.size, 1, 'Scroll burst coalesces into one animation frame');
  await h.tick(); assert.ok(h.renders.at(-1).progress > 0 && h.renders.at(-1).progress < .4);
  const settled = await h.drain(); assert.ok(settled < 50); assert.equal(h.renders.at(-1).progress, .4);
  const trajectory = h.renders.slice(before).map(p => p.progress);
  assert.ok(trajectory.every((p, i) => !i || p >= trajectory[i - 1]));
  const stopped = h.renders.length; await h.tick(); assert.equal(h.renders.length, stopped, 'No autonomous rendering during idle');
  await h.scroll(.32); await h.drain();
  const fixed = h.renders.at(-1), holdWrites = h.styleWrites.length;
  for(const p of [.36,.4,.33]){
    await h.scroll(p); await h.drain();
    const {progress,...view}=h.renders.at(-1),{progress:initialScroll,...initialView}=fixed;
    assert.deepEqual(view,initialView,'Continued and reversed scrolling inside a reading interval keep the entire visual pose fixed');
    assert.equal(progress,p); assert.equal(h.visual.dataset.bookVisualProgress,'0.37000');
    assert.equal(h.styleWrites.length,holdWrites,'Reading intervals do not fade the caption or rewrite its CSS');
  }
  await h.scroll(.8); await h.tick(); const turning = h.renders.at(-1).progress;
  await h.scroll(.1); await h.tick(); assert.ok(h.renders.at(-1).progress < turning, 'Reverse scroll reverses movement on the next frame');
  await h.drain(); assert.equal(h.renders.at(-1).progress, .1);
  const cachedPose = h.renders.at(-1), writesBeforeProbe = h.styleWrites.length, rendersBeforeProbe = h.renders.length;
  h.budgetFrames = 3; await h.scroll(.1); await h.drain();
  assert.equal(h.renders.length - rendersBeforeProbe, 3, 'Only requested quality frames are rendered');
  assert.ok(h.renders.slice(rendersBeforeProbe).every(pose => pose === cachedPose), 'Quality probes reuse immutable scroll pose');
  assert.equal(h.styleWrites.length, writesBeforeProbe, 'Stationary quality probes do not rewrite CSS properties');
  const priorResizeCount = h.resizes.length;
  await h.resize(); await h.drain(); assert.equal(h.resizes.length, priorResizeCount, 'Same dimensions do not resize renderer');
  h.window.devicePixelRatio = 1.5; await act(async () => h.resolution.emit('change')); await h.drain();
  assert.equal(h.resizes.length, priorResizeCount + 1, 'A DPR-only change still reaches the renderer');
  h.visual.clientWidth = 390; h.visual.clientHeight = 500; await h.resize(); await h.drain();
  assert.deepEqual(h.resizes.at(-1), [390, 500]); assert.equal(h.renders.at(-1).progress, .1);
  const buttons = h.tree.root.findAllByType('button');
  await act(async () => buttons[1].props.onClick()); await h.drain(); assert.equal(h.renders.at(-1).progress, motion.bookStops[2], 'Explicit chapter navigation reaches exact stop');
  await h.scroll(.7); assert.equal(h.frames.size, 1);
  h.document.hidden = true; await act(async () => h.document.emit('visibilitychange')); assert.equal(h.frames.size, 0);
  const hiddenRenderCount = h.renders.length; await h.scroll(.2); await h.tick(); assert.equal(h.renders.length, hiddenRenderCount);
  h.document.hidden = false; await act(async () => h.document.emit('visibilitychange')); await h.drain(); assert.equal(h.renders.at(-1).progress, .2, 'Resuming snaps to actual scroll');
  h.media.matches = true; await act(async () => h.media.emit('change')); assert.equal(h.disposed, 1); assert.equal(h.frames.size, 0);
  assert.equal(h.track.dataset.motion, 'reduce');
  h.media.matches = false; await act(async () => h.media.emit('change')); await h.drain(); assert.equal(h.mounts, 2);
  await h.unmount(); assert.equal(h.disposed, 2); assert.equal(h.frames.size, 0);
  assert.equal(h.intersectionDisconnected, true); assert.equal(h.resizeDisconnected, true);
  for (const target of [h.document, h.window, h.scroller, h.media, h.resolution]) assert.ok([...target.listeners.values()].every(set => set.size === 0));
  const timing=await harness();await timing.enter(true);await timing.drain();
  for(const idle of [65,90,300]){
    await timing.scroll(.425);await timing.drain();timing.elapse(idle);
    await timing.scroll(.445);await timing.tick();
    const first=timing.renders.at(-1).progress;
    assert(Math.abs(first-motion.followBookScroll(.425,.445,1000/60))<1e-12,'First wheel frame does not consume the idle interval '+idle);
    await timing.tick(120);
    assert(Math.abs(timing.renders.at(-1).progress-motion.followBookScroll(first,.445,120))<1e-12,'An active slow frame still follows its real bounded elapsed time');
    await timing.drain();
  }
  await timing.unmount();
  const late = await harness({ delayImport: true });
  await late.enter(true); await late.enter(false); await late.resolveImport(); assert.equal(late.mounts, 0, 'Late import cannot mount out of sight');
  await late.enter(true); await late.drain(); assert.equal(late.mounts, 1); await late.unmount();
  const hidden = await harness({ delayImport: true });
  await hidden.enter(true); hidden.document.hidden = true; await act(async () => hidden.document.emit('visibilitychange'));
  await hidden.resolveImport(); assert.equal(hidden.mounts, 0, 'Late import cannot mount in hidden tab');
  hidden.document.hidden = false; await act(async () => hidden.document.emit('visibilitychange')); await hidden.drain(); assert.equal(hidden.mounts, 1); await hidden.unmount();
  const removed = await harness({ delayImport: true });
  await removed.enter(true); await removed.unmount(); await removed.resolveImport(); assert.equal(removed.mounts, 0, 'Late import cannot mount after unmount');
  console.log('PASS actual book controller: lazy mount, passive/coalesced scroll, bounded reversible catch-up, idle sleep, cached resize, exact chapter navigation, hidden/resume, reduced motion, late import and cleanup. Controlled DOM/renderer; no GPU/browser claim.');
})().catch(error => { console.error(error); process.exitCode = 1; });
