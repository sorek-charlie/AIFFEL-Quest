import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {createApp} from '../../apps/api/src/bootstrap/server.mjs';
import {overlaps,slots} from '../../packages/domain/src/index.mjs';
const root=resolve('.');
test('SQLite CRUD, owner isolation, atomic approvals, expiry, idempotency, persistence',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-test-')),path=resolve(dir,'test.db');let repo;
 try {
 repo=createRepository(path,root);const now=Date.parse('2030-05-06T00:00:00Z'),app=createScheduler(repo,()=>now);
 app.initialize('A');app.initialize('B');
 assert.equal(app.state('A').settings.senderPhone,'010-9228-6269');
 const task=app.mutate('A','task','POST',null,{title:'가상 테스트'});
 assert.equal(app.state('B').tasks.length,0);
 assert.throws(()=>app.mutate('B','task','DELETE',task.id,{expectedVersion:1}),e=>e.status===404);
 app.mutate('A','task','PATCH',task.id,{title:'수정',completed:true,expectedVersion:1});
 assert.throws(()=>app.mutate('A','task','PATCH',task.id,{title:'오래된 수정',expectedVersion:1}),e=>e.code==='VERSION_CONFLICT');
 const s={...app.state('A').settings,enabled:true};app.updateSettings('A',s);
 const slot=app.slots('A','2030-05-07')[0],body={startsAt:slot.startsAt,guestName:'가상 고객',guestContact:'test@example.invalid'},key=randomUUID();
 const one=app.request('A',body,key),two=app.request('A',body,randomUUID());
 assert.deepEqual(app.request('A',body,key),one);
 assert.throws(()=>app.request('A',{...body,guestName:'다른 이름'},key),e=>e.code==='IDEMPOTENCY_MISMATCH');
 assert.throws(()=>app.status('B',{id:one.id,statusCapability:one.statusCapability}),e=>e.status===404);
 assert.throws(()=>app.status('A',{id:one.id,statusCapability:'wrong'}),e=>e.status===404);
 const approvalKey=randomUUID();app.decide('A',one.id,'approve',{expectedVersion:1},approvalKey);
 app.decide('A',one.id,'approve',{expectedVersion:1},approvalKey);
 assert.equal(app.state('A').events.length,1);
 assert.throws(()=>app.decide('A',two.id,'approve',{expectedVersion:1},randomUUID()),e=>e.code==='SLOT_UNAVAILABLE');
 assert.equal(app.state('A').bookings.find(b=>b.id===two.id).status,'pending');
 assert.throws(()=>app.mutate('A','event','POST',null,{title:'충돌',...slot}),e=>e.code==='SLOT_CONFLICT');
 assert.throws(()=>app.mutate('A','event','DELETE',one.id,{expectedVersion:1}),e=>e.code==='BOOKING_EVENT');
 app.decide('A',one.id,'cancel',{expectedVersion:2},randomUUID());assert.equal(app.state('A').events.length,0);
 const late=createScheduler(repo,()=>now+2*86400000);
 assert.throws(()=>late.decide('A',two.id,'approve',{expectedVersion:1},randomUUID()),e=>e.code==='REQUEST_EXPIRED');
 repo.close();repo=createRepository(path,root);const restored=createScheduler(repo,()=>now);
 assert.equal(restored.state('A').tasks[0].completed,true);assert.deepEqual(restored.request('A',body,key),one);
 const contents=readFileSync(path);assert.equal(contents.includes(Buffer.from(one.statusCapability)),false);
 assert.equal(overlaps({start:0,end:10},{start:10,end:20}),false);
 assert.throws(()=>slots(s,[],'2030-02-31',now));
 } finally {repo?.close();rmSync(dir,{recursive:true,force:true});}
});
test('HTTP auth, CSRF, privacy, concurrent requests, two owners and restart',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-http-'));const path=resolve(dir,'test.db');const first=createApp({dbPath:path,ownerId:'A'}),second=createApp({dbPath:path,ownerId:'B'});
 await Promise.all([new Promise(r=>first.server.listen(0,'127.0.0.1',r)),new Promise(r=>second.server.listen(0,'127.0.0.1',r))]);
 const base=`http://127.0.0.1:${first.server.address().port}`,other=`http://127.0.0.1:${second.server.address().port}`;
 async function login(base,token){const r=await fetch(base+'/api/v1/auth/setup',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({launchToken:token,password:'Synthetic-Password-123!'})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
 const cookie=await login(base,first.launchToken),cookieB=await login(other,second.launchToken);
 const call=(p,method='GET',b,c=cookie,host=base,key=randomUUID())=>fetch(host+'/api/v1/'+p,{method,headers:{Cookie:c,Origin:host,'Content-Type':'application/json','Idempotency-Key':key},...(b?{body:JSON.stringify(b)}:{})});
 try {
 assert.equal((await call('owner/state','GET',null,'')).status,401);
 assert.equal((await call('owner/state','GET',null,cookie,other)).status,401);
 const csrf=await fetch(base+'/api/v1/owner/tasks',{method:'POST',headers:{Cookie:cookie,Origin:'http://evil.invalid','Content-Type':'application/json'},body:'{"title":"x"}'});assert.equal(csrf.status,403);
 const task=await (await call('owner/tasks','POST',{title:'private'})).json();
 assert.equal((await call('owner/tasks/'+task.id,'DELETE',{expectedVersion:1},cookieB,other)).status,404);
 const s=(await (await call('owner/state')).json()).settings;
 await call('owner/settings','PUT',{...s,enabled:true,weekdays:[0,1,2,3,4,5,6]});
 const date=new Date(Date.now()+2*86400000+9*3600000).toISOString().slice(0,10);
 const available=await (await call('public/local/slots?date='+date)).json();assert.ok(available.length);
 const body={startsAt:available[0].startsAt,guestName:'Synthetic',guestContact:'test@example.invalid'};
 const receipts=await Promise.all([call('public/local/requests','POST',body),call('public/local/requests','POST',body)]);assert.ok(receipts.every(r=>r.status===202));
 const requests=await Promise.all(receipts.map(r=>r.json()));
 const approvals=await Promise.all(requests.map(r=>call('owner/bookings/'+r.id+'/approve','POST',{expectedVersion:1})));assert.deepEqual(approvals.map(r=>r.status).sort(),[200,409]);
 const publicData=JSON.stringify(await (await call('public/local')).json());assert.equal(publicData.includes('senderPhone'),false);assert.equal(publicData.includes('private'),false);
 const state=await (await call('owner/state')).json();assert.equal(state.events.length,1);
 const competingSlot=available[2];
 const clash=await Promise.all([call('owner/events','POST',{title:'First',...competingSlot}),call('owner/events','POST',{title:'Second',...competingSlot})]);assert.deepEqual(clash.map(r=>r.status).sort(),[200,409]);
 }finally{await Promise.all([new Promise(r=>first.server.close(r)),new Promise(r=>second.server.close(r))]);rmSync(dir,{recursive:true,force:true});}
});
