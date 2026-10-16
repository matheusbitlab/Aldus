// Read-only preparation manifest. No connection, export, migration or OWNER grant.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {pending,historical,digest,source}=require('./saas-homologation-fixture.cjs');
function plan(){
 const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
 if(git('branch','--show-current')!=='main')throw Error('Preparation must start from main');
 const migrations=pending.map(file=>({file,sourceSha256:digest(source(file)),name:file.replace(/^\d+_|\.sql$/g,''),dependencies:file===pending[0]?['existing profiles','mapped private library/recovery']:file===pending[1]?[pending[0]]:file===pending[2]?[pending[1],'Auth sessions + verified TOTP']:[pending[0],pending[1]]}));
 const resultFile=path.resolve('.expo/saas-homologation/result.json');
 const evidence=fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile,'utf8')):null;
 return {mode:'PREPARATION_ONLY',head:git('rev-parse','HEAD'),targetProject:'cmivracxuihtmsbmtuec',remoteWritesAuthorized:false,
  historicalDoNotReapply:historical.map(([remoteVersion,file])=>({remoteVersion,file,sourceSha256:digest(source(file))})),migrations,
  commercialLimits:{free:{books:100,bytes:524288000},pro:{books:2000,bytes:10737418240,commercialActivation:false}},
  managedFreeConstraints:{providerMaxFileBytesCeiling:50000000,includedOrganizationStorageGB:1,globalSettingMustBeRechecked:true},
  proposedRemotePilotBudget:{maxSingleFixtureBytes:262144,maxTotalFixtureBytes:5242880,maxDisposableUsers:6,realAccountsAsFixtures:false,requiresSeparateAuthorization:true},
  localEvidenceMatchesSources:!!evidence&&evidence.testSourceHash===digest(fs.readFileSync(path.resolve('scripts/test-saas-postgres.cjs'),'utf8'))&&migrations.every(m=>evidence.migrationSources?.[m.file]===m.sourceSha256),
  evidence,productionRecovery:'NOT_VERIFIED',
  gates:['Explicit authorization for every remote write','Verified recoverable database/Auth backup, ledger/config inventory, and physical-object strategy','Fresh minimal inventory and unchanged historical definitions','Authorized disposable test accounts/sessions; no service_role substitution','Managed Storage probe/commit/actual-size/concurrency pilot','Client supports reserve/finish upload protocol before rollout','OWNER bootstrap separately approved with freshly verified UUID; owner performs login/TOTP','Web deployment separately approved; current public /admin was unavailable'],
  onFailure:'Stop. Inspect committed schema and ledger read-only. No blind replay, policy relaxation, destructive rollback or restore without specific approval.'};
}
if(require.main===module)console.log(JSON.stringify(plan(),null,2));
module.exports={plan};
