// Explicit, pinned development tools. Nothing is added to the application bundle.
const {spawnSync}=require('node:child_process');
const sets=[
 ['auth-test-tools','react@19.2.3','react-test-renderer@19.2.3'],
 ['library-db-test','@electric-sql/pglite@0.5.8'],
 ['flashcard-db-test','@electric-sql/pglite@0.5.8','fake-indexeddb@6.2.5'],
 ['layout-test','yoga-layout@3.2.1'],
 ['reader-matrix-tools','esbuild@0.28.2'],
];
for(const [folder,...packages] of sets){
 const args=['install','--prefix','.expo/'+folder,'--no-save','--package-lock=false','--ignore-scripts',...packages];
 const result=process.env.npm_execpath?spawnSync(process.execPath,[process.env.npm_execpath,...args],{stdio:'inherit'}):spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',shell:process.platform==='win32'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
