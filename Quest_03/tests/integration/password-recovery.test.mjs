import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPasswordRecovery} from '../../apps/api/src/bootstrap/password-recovery.mjs';
test('loopback recovery page uses public config, rejects foreign origins and never accepts password POSTs',async()=>{
 const app=createPasswordRecovery(()=>({url:'https://syntheticproject.supabase.co',key:'sb_publishable_synthetic_key_only'}),process.cwd());
 await new Promise(r=>app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.address().port;
 try{const page=await fetch(base+'/reset-password');assert.equal(page.status,200);assert.equal(page.headers.get('referrer-policy'),'no-referrer');assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"));assert.ok((await page.text()).includes('새 비밀번호 확인'));
 const config=await (await fetch(base+'/recovery-config')).json();assert.deepEqual(Object.keys(config).sort(),['key','url']);
 assert.equal((await fetch(base+'/recovery-config',{headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await fetch(base+'/reset-password',{method:'POST',body:'synthetic-password'})).status,403);
 assert.equal((await fetch(base+'/unknown')).status,404);
 const js=await (await fetch(base+'/recovery.mjs')).text();assert.ok(js.includes("history.replaceState(null,'','/reset-password')"));assert.ok(!js.includes('localStorage'));assert.ok(!js.includes('sessionStorage'));
 }finally{await new Promise(r=>app.close(r));}
});
