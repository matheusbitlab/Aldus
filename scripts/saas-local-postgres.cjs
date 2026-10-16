// Portable PostgreSQL test runtime. No remote URLs, services or production credentials.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),net=require('node:net'),crypto=require('node:crypto');
const root=path.resolve('.expo/saas-homologation');
const tools=path.resolve('.expo/saas-tools/node_modules');
const {Client}=require(path.join(tools,'pg'));
const bin=path.join(tools,'@embedded-postgres/windows-x64/native/bin');
const pinned={'@embedded-postgres/windows-x64':'17.6.0-beta.15',pg:'8.23.1'};
function within(file){const resolved=path.resolve(file);if(!resolved.startsWith(root+path.sep))throw Error('Local homologation path required');return resolved;}
function command(name,args){const r=cp.spawnSync(path.join(bin,name+'.exe'),args,{encoding:'utf8',windowsHide:true,timeout:60000});if(r.error||r.status!==0)throw Error(`${name} failed: ${(r.stderr??r.error?.message??'').slice(-1500)}`);return r.stdout;}
async function freePort(){const s=net.createServer();await new Promise((r,j)=>{s.once('error',j);s.listen(0,'127.0.0.1',r);});const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function startCluster(directory,password){
 const port=await freePort(),log=fs.openSync(within(path.join(directory,'server.log')),'a');
 const process=cp.spawn(path.join(bin,'postgres.exe'),['-D',directory,'-h','127.0.0.1','-p',String(port),'-c','max_connections=20'],{windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
 let stopped=false;const clients=new Set();
 async function connect(database='postgres'){
  if(!/^aldus_[a-z0-9_]+$/.test(database)&&database!=='postgres')throw Error('Synthetic database name required');
  const client=new Client({host:'127.0.0.1',port,user:'postgres',password,database,connectionTimeoutMillis:1000});await client.connect();clients.add(client);client.once('end',()=>clients.delete(client));return client;
 }
 try{let ready=false;for(let i=0;i<100;i++){if(process.exitCode!==null)throw Error('Local PostgreSQL exited; inspect ignored server.log');try{const c=await connect();await c.end();ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}if(!ready)throw Error('Local PostgreSQL startup timeout');}
 catch(error){process.kill();throw error;}
 return {directory,password,port,connect,async stop(){if(stopped)return;for(const c of clients)await c.end().catch(()=>{});command('pg_ctl',['-D',directory,'-m','fast','-w','stop']);stopped=true;}};
}
async function cluster(){
 for(const [name,version] of Object.entries(pinned)){const p=JSON.parse(fs.readFileSync(path.join(tools,name,'package.json'),'utf8'));if(p.version!==version)throw Error('Pinned local test tools required; run test:saas:setup');}
 fs.mkdirSync(root,{recursive:true});const run=fs.mkdtempSync(path.join(root,'run-')),directory=within(path.join(run,'cluster')),password=crypto.randomBytes(32).toString('hex'),pw=within(path.join(run,'init-password'));
 fs.writeFileSync(pw,password,{mode:0o600});
 try{command('initdb',['-D',directory,'-U','postgres','--encoding=UTF8','--locale=C','--auth=scram-sha-256','--pwfile='+pw]);}finally{fs.unlinkSync(pw);}
 fs.writeFileSync(path.join(run,'synthetic-only.json'),JSON.stringify({purpose:'ALDUS_SYNTHETIC_ONLY',postgres:'17.6'}));
 return {...await startCluster(directory,password),run};
}
module.exports={cluster,startCluster,root,within,pinned,bin,Client};
