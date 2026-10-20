import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync, copyFileSync, appendFileSync, openSync, closeSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('../', import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const git = (...args) => { const r=spawnSync('git',args,{cwd:root,encoding:'utf8'}); if(r.status!==0) throw new Error(r.stderr); return r.stdout.trim(); };
const commit=git('rev-parse','HEAD'), short=git('rev-parse','--short','HEAD');
const contextOnly = process.argv.includes('--allow-context-only-dirty');
const initialStatus = git('status','--porcelain','--untracked-files=no');
const contextPaths = new Set(['.gitignore','PROJECT_CONTEXT.md','BUGS_ATUAIS.md']);
function safeStatus() {
  if (!git('status','--porcelain','--untracked-files=no')) return true;
  return contextOnly && !git('diff','--cached','--name-only') && git('diff','--name-only').split('\n').every(file => contextPaths.has(file));
}
if(!safeStatus()) throw new Error('Runtime sources/staging must match the commit. Only explicitly acknowledged context-only differences are allowed.');
const directory=path.join(root,'artifacts/apk'); mkdirSync(directory,{recursive:true});
const target=path.join(directory,`Aldus-${short}.apk`), log=path.join(directory,`build-${short}-${new Date().toISOString().replace(/\D/g,'')}.log`);
git('check-ignore',target); if(git('ls-files','--',target)) throw new Error('APK is tracked.');
const env={...process.env};
env.GRADLE_OPTS ??= '-Dorg.gradle.workers.max=2';
console.log(`Official APK build log: ${log}`);
if(!env.JAVA_HOME && existsSync('C:/Program Files/Java/jdk-17')) env.JAVA_HOME='C:/Program Files/Java/jdk-17';
if(!env.ANDROID_HOME && existsSync('C:/Android/sdk')) env.ANDROID_HOME='C:/Android/sdk';
if(env.JAVA_HOME) env.Path=`${env.JAVA_HOME}/bin;${env.Path??env.PATH??''}`;
const fd=openSync(log,'w'); const started=new Date().toISOString();
const result=spawnSync(process.execPath,['scripts/build-apk-local.mjs'],{cwd:root,env,stdio:['ignore',fd,fd]}); closeSync(fd);
if(git('rev-parse','HEAD')!==commit || !safeStatus() || git('status','--porcelain','--untracked-files=no')!==initialStatus) throw new Error('Repository changed during build. Do not attribute APK to this commit.');
let size=0; const status=result.status===0?'PASS':'FAIL';
if(status==='PASS') { const source=path.join(root,'android/app/build/outputs/apk/release/app-release.apk'); if(!existsSync(source)||statSync(source).size===0) throw new Error('Missing/empty APK'); copyFileSync(source,target); size=statSync(target).size; }
const record={commit,contextOnlyDirty:!!initialStatus,architectures:env.ORG_GRADLE_PROJECT_reactNativeArchitectures??'project-default',apk:status==='PASS'?path.basename(target):null,path:status==='PASS'?target:null,size,status,started,log,command:'npm run build:apk:local (official script)',exitCode:result.status};
appendFileSync(path.join(directory,'checkpoint.jsonl'),JSON.stringify(record)+'\n'); console.log(JSON.stringify(record));
process.exitCode=result.status||0;
