import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {handle} from '../../sites/orbit-booking/app/cloud-api.ts';
test('hosted API: private paths blocked, slot allowlist, metadata, capability, retry and decision acknowledgement',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('sites/orbit-booking/drizzle/0000_ambitious_tarot.sql','utf8'));
 const adapter={
  prepare(sql){const stmt=db.prepare(sql);return {bind(...args){return {
   first:async()=>stmt.get(...args),
   all:async()=>({results:stmt.all(...args)}),
   run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})
  };}};},
  async batch(queries){const result=[];for(const q of queries)result.push(await q.run());return result;}
 };
 const origin='https://example.invalid',env={DB:adapter,CLOUD_SYNC_KEY:'synthetic-secret-for-tests'},start=new Date(Date.now()+3*86400000).toISOString(),end=new Date(Date.parse(start)+3600000).toISOString(),date=new Date(Date.parse(start)+9*3600000).toISOString().slice(0,10);
 const call=(path,body,headers={})=>handle(new Request(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),env);
 try{
 assert.equal((await call('/api/v1/owner/state')).status,401);assert.equal((await call('/api/v1/bridge/sync',{profile:{}})).status,401);
 const profile={enabled:true,displayName:'테스트 공개 이름',days:{[date]:{60:[{startsAt:start,endsAt:end,timeZone:'Asia/Seoul'}],30:[]}}};assert.equal((await call('/api/v1/bridge/sync',{profile},{Authorization:'Bearer '+env.CLOUD_SYNC_KEY})).status,200);
 const publicProfile=await (await call('/api/v1/public/local')).json();assert.deepEqual(Object.keys(publicProfile).sort(),['displayName','duration','durations','timeZone']);
 const b={startsAt:start,durationMinutes:60,guestName:'Test',guestContact:'test@example.invalid',purpose:'설계 상담',venue:'other',venueDetails:'고객 사무실'},key=randomUUID(),headers={'Idempotency-Key':key};const receipt=await (await call('/api/v1/public/local/requests',b,headers)).json();assert.equal(receipt.status,'pending');assert.equal((await call('/api/v1/public/local/requests',{...b,purpose:'변경'},headers)).status,409);const retried=await (await call('/api/v1/public/local/requests',b,headers)).json();assert.equal(retried.statusCapability,receipt.statusCapability);
 const bridge=await (await call('/api/v1/bridge/sync',{profile},{Authorization:'Bearer '+env.CLOUD_SYNC_KEY})).json();assert.equal(bridge.requests[0].purpose,b.purpose);assert.equal(bridge.requests[0].venueDetails,b.venueDetails);
 assert.equal((await call('/api/v1/public/request-status',{id:receipt.id,statusCapability:'invalid'})).status,404);
 await call('/api/v1/bridge/sync',{profile,decisions:[{id:receipt.id,status:'confirmed',version:2}]},{Authorization:'Bearer '+env.CLOUD_SYNC_KEY});assert.equal((await (await call('/api/v1/public/request-status',{id:receipt.id,statusCapability:receipt.statusCapability})).json()).status,'confirmed');
 await call('/api/v1/bridge/sync',{profile,decisions:[{id:receipt.id,status:'pending',version:1}]},{Authorization:'Bearer '+env.CLOUD_SYNC_KEY});assert.equal((await (await call('/api/v1/public/request-status',{id:receipt.id,statusCapability:receipt.statusCapability})).json()).status,'confirmed');
 }finally{db.close();}
});
