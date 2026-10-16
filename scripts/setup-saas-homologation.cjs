// Installs test-only portable binaries under ignored .expo; never changes app dependencies.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
if(process.platform!=='win32'||process.arch!=='x64')throw Error('This portable setup supports Windows x64; use an equivalent isolated PostgreSQL 17 runtime elsewhere.');
const prefix=path.resolve('.expo/saas-tools');
const packages=['@embedded-postgres/windows-x64@17.6.0-beta.15','pg@8.23.1'];
const result=cp.spawnSync('npm.cmd',['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=false','--prefix',prefix,...packages],{stdio:'inherit',shell:true,windowsHide:true});
if(result.status!==0)process.exit(result.status??1);
// Windows package has no symlinks to hydrate; do not run unneeded package lifecycle scripts.
const links=path.join(prefix,'node_modules/@embedded-postgres/windows-x64/native/pg-symlinks.json');
if(JSON.parse(fs.readFileSync(links,'utf8')).length)throw Error('Unexpected symlink hydration requirement; inspect before executing scripts.');
console.log('PASS test-only PostgreSQL 17.6 + pg installed, no service/Docker/payment/remote connection.');
