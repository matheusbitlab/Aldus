const assert = require('node:assert/strict');
const { loader } = require('./library-test-utils.cjs');
const load = loader(), { LibraryAccountScope } = load('src/data/library/LibraryAccountScope.ts');
const { LibrarySyncService } = load('src/data/library/LibrarySyncService.ts');
const { LibrarySyncCoordinator } = load('src/data/library/LibrarySyncCoordinator.ts');
const { withAbort } = load('src/core/utils/cancellation.ts');
const baseline = process.argv.includes('--baseline'), tick = () => new Promise(setImmediate);
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
(async () => {
  const scope = new LibraryAccountScope(); scope.set('A');
  const gate = deferred(), state = { entries: {}, lastSync: null };
  const persistence = { read: async () => state, mutate: async (_owner, job) => job(state) };
  const engine = new LibrarySyncService(persistence, { pull: (_owner, signal) => withAbort(gate.promise, signal) }, async () => {}, scope);
  const pending = engine.sync(); pending.catch(() => {}); await tick(); assert.equal(engine.status.running, true);
  engine.cancel(); assert.equal(engine.status.running, baseline, 'Cancel must immediately clear running without clearing outbox');
  await assert.rejects(pending, /cancelad/);
  assert.deepEqual(state, { entries: {}, lastSync: null });

  function coordinatorFixture() {
    let calls = 0, seeds = 0; const prepared = deferred();
    const engine = { subscribe: () => () => {}, cancel() {}, sync: async () => { calls++; }, snapshot: async () => state, refreshStatus: async () => {} };
    const replica = { seed: async () => { if (++seeds === 1) await prepared.promise; } };
    const files = { subscribe: () => () => {}, cancel() {}, states: new Map() };
    const coordinator = new LibrarySyncCoordinator({ listOwned: async () => [] }, replica, engine, files, scope);
    return { coordinator, prepared, calls: () => calls };
  }
  const first = coordinatorFixture(); first.coordinator.start(); const cancelled = first.coordinator.syncNow();
  await tick(); first.coordinator.stop();
  assert.equal(first.coordinator.status.running, baseline);
  first.prepared.resolve(); await cancelled;
  assert.equal(first.calls(), baseline ? 2 : 0, 'Stopped preparation must never initiate network');
  if (baseline) { console.log('CONFIRMED baseline: cancelled engine stays running; stopped coordinator still begins two remote sync phases.'); return; }
  const restart = coordinatorFixture(); restart.coordinator.start(); const old = restart.coordinator.syncNow(); await tick();
  restart.coordinator.stop(); restart.coordinator.start(); const current = restart.coordinator.syncNow();
  assert.notEqual(old, current, 'Restart must not reuse the cancelled lifecycle promise');
  await current; assert.equal(restart.calls(), 2); restart.prepared.resolve(); await old;
  assert.equal(restart.calls(), 2, 'Late old preparation cannot start more network or change new status');
  assert.equal(restart.coordinator.status.running, false); restart.coordinator.stop();
  console.log('PASS Sync cancellation: terminal running=false, durable state preserved, no network after stop, fresh same-account restart and discarded old preparation. Controlled promise boundaries.');
})().catch(error => { console.error(error); process.exitCode = 1; });
