const assert=require('node:assert/strict');
const {NativeAuthCallbacks}=require('./community-test-loader.cjs')()('src/data/remote/nativeAuthCallback.ts');
(async()=>{
 const callbacks=new NativeAuthCallbacks();let initial,listener,removed=0;
 const stop=callbacks.start({getInitialURL:()=>new Promise(r=>initial=r),addEventListener:(_,fn)=>{listener=fn;return{remove:()=>removed++}}});
 const current='aldus://auth/callback?error=server_error&error_description=Unable+to+exchange+external+code';
 listener({url:current});initial('exp+aldus-reader://expo-development-client/?url=fixture');await Promise.resolve();
 assert.equal(callbacks.snapshot().url,current,'late launcher URL cannot overwrite a live callback');
 const stable=callbacks.snapshot();assert.equal(callbacks.snapshot(),stable);
 callbacks.reset();assert.equal(callbacks.snapshot().url,null);
 for(const raw of ['http://localhost/auth/callback?code=fixture','aldus://auth/other?code=fixture','aldus://attacker/callback?code=fixture','aldus://person:password@auth/callback?code=fixture'])assert.equal(callbacks.capture(raw),false);
 assert.equal(callbacks.snapshot().url,null,'foreign URLs cannot authorize route parameters');
 assert.equal(callbacks.capture('aldus://auth/callback?code=fixture'),true);
 stop();assert.equal(removed,1);
 const next=new NativeAuthCallbacks();let resolveOld;
 next.start({getInitialURL:()=>new Promise(r=>resolveOld=r),addEventListener:()=>({remove(){}})});
 next.reset();resolveOld('aldus://auth/callback?code=stale');await Promise.resolve();assert.equal(next.snapshot().url,null,'a new operation invalidates an old initial URL');
 console.log('PASS Native callback: live event before screen mount, late initial launcher ignored, stable snapshot, operation reset, foreign scheme/host/path/credentials denied; no real Google exchange.');
})().catch(e=>{console.error(e);process.exitCode=1});
