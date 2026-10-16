// RFC 6238 helper for SYNTHETIC Auth harness only; never used for app authorization.
const crypto=require('node:crypto');
const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // Public RFC test vector, not a credential.
function decode(value){let bits='';for(const c of value.replace(/=+$/,'').toUpperCase()){const n='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);if(n<0)throw Error('Invalid base32');bits+=n.toString(2).padStart(5,'0');}return Buffer.from((bits.match(/.{8}/g)??[]).map(b=>parseInt(b,2)));}
function totp(value=secret,time=Date.now(),digits=6){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(time/30000)));const h=crypto.createHmac('sha1',decode(value)).update(counter).digest(),o=h[19]&15;return String((h.readUInt32BE(o)&0x7fffffff)%10**digits).padStart(digits,'0');}
function verify(code,value=secret,time=Date.now()){return /^\d{6}$/.test(code)&&[-1,0,1].some(step=>crypto.timingSafeEqual(Buffer.from(code),Buffer.from(totp(value,time+step*30000))));}
if(require.main===module){const assert=require('node:assert/strict');for(const [seconds,expected] of [[59,'94287082'],[1111111109,'07081804'],[1234567890,'89005924'],[2000000000,'69279037']])assert.equal(totp(secret,seconds*1000,8),expected);assert.equal(verify(totp(secret,59000),secret,59000),true);assert.equal(verify(totp(secret,59000),secret,180000),false);console.log('PASS RFC 6238 vectors, accepted synthetic TOTP and expired code rejection. Not Supabase Auth proof.');}
module.exports={secret,totp,verify};
