// Offline physical snapshot drill for OUR synthetic portable cluster only.
// This is NOT a production Supabase export or proof of its recovery path.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {within,root,startCluster}=require('./saas-local-postgres.cjs');
function files(directory){const result=[];for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('No symlinks in backup');const p=path.join(directory,entry.name);if(entry.isDirectory())result.push(...files(p));else result.push(p);}return result;}
function hashes(directory){return Object.fromEntries(files(directory).filter(p=>!p.endsWith(path.sep+'server.log')).sort().map(p=>[path.relative(directory,p).replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));}
async function backup(cluster,objects){
 const marker=JSON.parse(fs.readFileSync(path.join(cluster.run,'synthetic-only.json'),'utf8'));
 if(marker.purpose!=='ALDUS_SYNTHETIC_ONLY'||!fs.realpathSync(cluster.directory).startsWith(fs.realpathSync(root)+path.sep))throw Error('Synthetic local cluster required');
 await cluster.stop(); // Must finish before copying PostgreSQL/WAL/configuration.
 if(fs.existsSync(path.join(cluster.directory,'postmaster.pid')))throw Error('Cluster still running');
 const directory=within(fs.mkdtempSync(path.join(root,'backup-')));
 fs.cpSync(cluster.directory,path.join(directory,'postgres'),{recursive:true,errorOnExist:true,force:false});
 fs.mkdirSync(path.join(directory,'objects'));
 for(const [name,data] of Object.entries(objects)){if(!/^[a-z0-9_.-]+$/.test(name))throw Error('Controlled object name required');fs.writeFileSync(path.join(directory,'objects',name),data);}
 const manifest={purpose:'ALDUS_SYNTHETIC_ONLY',postgres:'17.6',scope:['database','synthetic_auth_profiles','metadata','migrations','operational_configuration','fixture_physical_objects'],files:hashes(directory),productionRecovery:'UNVERIFIED'};
 fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));return directory;
}
async function restore(directory,password){
 directory=within(directory);const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
 if(manifest.purpose!=='ALDUS_SYNTHETIC_ONLY')throw Error('Not a synthetic backup');
 const actual=hashes(directory);delete actual['manifest.json'];
 if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('Backup checksum mismatch');
 const run=within(fs.mkdtempSync(path.join(root,'restored-'))),target=path.join(run,'cluster');
 fs.cpSync(path.join(directory,'postgres'),target,{recursive:true,errorOnExist:true,force:false});
 return {...await startCluster(target,password),run};
}
module.exports={backup,restore,hashes};
