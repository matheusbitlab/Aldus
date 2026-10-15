const assert=require('node:assert/strict');const {loader}=require('./library-test-utils.cjs');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',token='00000000-0000-4000-8000-000000000001';
(async()=>{
 const old=global.fetch;let mode='quota',stored=false,requests=[],hold,release,user=A;
 process.env.EXPO_PUBLIC_SUPABASE_URL='https://quota.example.invalid';process.env.EXPO_PUBLIC_SUPABASE_KEY='fixture-public';
 global.fetch=async(url,options)=>{
  requests.push({url,body:options.body,auth:options.headers.Authorization});
  if(url.endsWith('/saas_reserve_upload')){
   if(mode==='quota')return Response.json({code:'PQL02'},{status:400});
   if(mode==='missing')return Response.json({code:'PGRST202'},{status:404});
   if(mode==='exists')return Response.json({state:'exists',bytes:4});
   return Response.json({state:'reserved',token,bytes:4});
  }
  if(url.endsWith('/saas_finish_upload')){const body=JSON.parse(options.body);return Response.json(stored?{state:'committed',bytes:4}:{state:body.p_cancel?'cancelled':'reserved'});}
  assert.ok(url.includes('/storage/v1/object/'));if(hold)await hold;
  if(mode==='storage-quota')return new Response(JSON.stringify({message:'private storage quota exceeded'}),{status:400});
  stored=true;if(mode==='lost')throw Error('lost response');return new Response('',{status:200});
 };
 const load=loader({'react-native':{Platform:{OS:'web'}},'expo-file-system/legacy':{},'expo-file-system':{},'@/src/data/remote/supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:user},access_token:'jwt-'+user}}})}}},'@/src/presentation/services/PdfThumbnailGenerator':{pdfThumbnailGenerator:{generate:async()=>null}}});
 const Driver=load('src/data/library/SupabaseBookFileDriver.ts').SupabaseBookFileDriver,driver=new Driver({});const p=A+'/book/'+'a'.repeat(64)+'.pdf';
 const upload=(signal=new AbortController().signal)=>driver.upload(A,p,{uri:'',size:4,blob:new Blob(['data'])},'application/pdf',signal);
 await assert.rejects(upload(),e=>e.code==='quota');assert.equal(requests.length,1,'quota rejection sends no bytes');
 mode='missing';requests=[];await assert.rejects(upload(),/servidor/);assert.equal(requests.length,1,'missing backend never uploads without reservation');
 mode='exists';requests=[];assert.equal(await upload(),'exists');assert.equal(requests.length,1,'same immutable object has no repeated transfer or charge');
 mode='success';requests=[];assert.equal(await upload(),'created');assert.equal(requests.length,3);assert.equal(JSON.parse(requests[2].body).p_cancel,false);
 mode='lost';requests=[];await assert.rejects(upload(),/lost response/);assert.equal(JSON.parse(requests.at(-1).body).p_cancel,true);assert.ok(stored,'lost response cleanup does not delete uploaded bytes');
 mode='storage-quota';stored=false;await assert.rejects(upload(),e=>e.code==='quota');
 mode='success';requests=[];hold=new Promise(r=>release=r);const abort=new AbortController(),job=upload(abort.signal);job.catch(()=>{});await new Promise(setImmediate);abort.abort();user=B;release();await assert.rejects(job);assert.ok(requests.every(r=>r.auth==='Bearer jwt-'+A),'cleanup keeps frozen A JWT after account switch');assert.equal(JSON.parse(requests.at(-1).body).p_cancel,true);
 assert.ok(requests.every(r=>!String(r.url).includes('/DELETE')));global.fetch=old;
 console.log('PASS actual Web upload driver with HTTP fixtures: reserve before bytes, quota/missing contract fail closed, existing object retry, actual finish, lost response, server quota error, cancellation/account switch and non-destructive reconciliation.');
})().catch(e=>{console.error(e);process.exitCode=1});
