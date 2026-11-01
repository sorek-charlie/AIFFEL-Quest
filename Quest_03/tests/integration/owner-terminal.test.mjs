import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {ownerRelay} from '../../sites/orbit-booking/app/owner-relay.ts';
import {seal,open} from '../../apps/api/src/infrastructure/calendar-providers/relay-crypto.mjs';
test('owner terminal: encrypted queue, bridge authentication, cookie forwarding, CSRF and no anonymous private state',async()=>{
 const db=new DatabaseSync(':memory:');for(const name of ['0000_ambitious_tarot.sql','0001_brown_metal_master.sql'])db.exec(readFileSync('sites/orbit-booking/drizzle/'+name,'utf8'));
 const adapter={prepare(sql){const s=db.prepare(sql);return {bind(...args){return {first:async()=>s.get(...args),all:async()=>({results:s.all(...args)}),run:async()=>({meta:{changes:Number(s.run(...args).changes)}})};}};},async batch(q){return Promise.all(q.map(x=>x.run()));}};
 const env={DB:adapter,CLOUD_SYNC_KEY:'synthetic-relay-secret'},origin='https://example.invalid';
 const call=(path,body,headers={})=>ownerRelay(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),env);
 const instanceId=crypto.randomUUID(),bridge=body=>call('/api/v1/bridge/owner',{...body,instanceId},{Authorization:'Bearer '+env.CLOUD_SYNC_KEY});
 try{
  assert.equal((await call('/api/v1/owner/state')).status,401);
  assert.equal((await call('/api/v1/bridge/owner',{completed:[]})).status,401);
  assert.equal((await call('/api/v1/auth/login',{password:'Synthetic123!'},{Origin:'https://attacker.invalid'})).status,403);
  assert.equal(await call('/api/v1/auth/setup',{password:'never'}),null);
  assert.equal((await call('/api/v1/auth/session')).status,503);
  await bridge({completed:[]});
  assert.equal((await call('/api/v1/bridge/owner',{completed:[],instanceId:crypto.randomUUID()},{Authorization:'Bearer '+env.CLOUD_SYNC_KEY})).status,409,'another PC process cannot steal a live owner session');
  assert.equal((await call('/api/v1/bridge/owner',{completed:[]},{Authorization:'Bearer '+env.CLOUD_SYNC_KEY})).status,409,'old PC bridge must upgrade');
  const pending=call('/api/v1/auth/login',{password:'Synthetic123!'});await new Promise(r=>setTimeout(r,50));
  const jobs=await (await bridge({completed:[]})).json();assert.equal(jobs.requests.length,1);const job=jobs.requests[0];
  assert.equal(db.prepare('SELECT payload FROM owner_relay WHERE id=?').get(job.id).payload.includes('Synthetic'),false);
  const payload=await open(env.CLOUD_SYNC_KEY,job.id+':request',job.payload);assert.equal(payload.body.password,'Synthetic123!');
  await assert.rejects(open(env.CLOUD_SYNC_KEY,job.id+':response',job.payload));
  assert.equal((await (await bridge({completed:[]})).json()).requests.length,0,'claimed mutations are not replayed');
  const cookie='orbit='+ 'a'.repeat(64)+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200';
  await bridge({completed:[{id:job.id,payload:await seal(env.CLOUD_SYNC_KEY,job.id+':response',{status:200,body:'{"ok":true}',cookie})}]});
  const result=await pending;assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/HttpOnly.*Secure/);assert.deepEqual(await result.json(),{ok:true});
  assert.equal(db.prepare('SELECT count(*) AS n FROM owner_relay').get().n,0);
 }finally{db.close();}
});
