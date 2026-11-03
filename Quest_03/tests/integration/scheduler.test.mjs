import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {createApp} from '../../apps/api/src/bootstrap/server.mjs';
test('personal CRUD, legacy data preservation, versions, conflicts and restart',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'personal-crud-')),path=resolve(dir,'test.db');let repo=createRepository(path,resolve('.'));let app=createScheduler(repo);app.initialize('A');app.initialize('B');
 try{repo.saveOwner('A',{displayName:'기존 이름',senderPhone:'retired',enabled:true});repo.save('A','booking',{id:'legacy',status:'pending'});
 assert.deepEqual(app.state('A').settings,{displayName:'기존 이름',timeZone:'Asia/Seoul'});assert.equal('bookings' in app.state('A'),false);assert.ok(repo.get('A','booking','legacy'));
 const task=app.mutate('A','task','POST',null,{title:'직접 입력'});assert.equal(app.state('B').tasks.length,0);assert.throws(()=>app.mutate('B','task','DELETE',task.id,{expectedVersion:1}));
 app.mutate('A','task','PATCH',task.id,{title:'수정',completed:true,expectedVersion:1});assert.throws(()=>app.mutate('A','task','PATCH',task.id,{title:'오래된 변경',expectedVersion:1}),e=>e.code==='VERSION_CONFLICT');
 const event=app.mutate('A','event','POST',null,{title:'직접 일정',startsAt:'2030-05-07T00:00:00Z',endsAt:'2030-05-07T01:00:00Z'});assert.throws(()=>app.mutate('A','event','POST',null,{...event,title:'충돌'}),e=>e.code==='SLOT_CONFLICT');
 // A previously confirmed event remains editable after the approval workflow is removed.
 repo.save('A','event',{...event,requestId:'retired'});app.mutate('A','event','PATCH',event.id,{...event,title:'기존 일정 편집',expectedVersion:1});
 repo.close();repo=createRepository(path,resolve('.'));app=createScheduler(repo);assert.equal(app.state('A').tasks[0].completed,true);assert.equal(app.state('A').events[0].title,'기존 일정 편집');
 app.mutate('A','task','DELETE',task.id,{expectedVersion:2});assert.equal(app.state('A').tasks.length,0);
 }finally{repo.close();rmSync(dir,{recursive:true,force:true});}
});
test('removed endpoints return 404; personal API keeps auth, CSRF and concurrent conflict boundary',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'personal-http-')),app=createApp({dbPath:resolve(dir,'test.db')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;
 let cookie='';const call=(path,method='GET',body)=>fetch(base+'/api/v1/'+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});
 try{assert.equal((await call('owner/state')).status,401);const setup=await call('auth/setup','POST',{launchToken:app.launchToken,password:'Synthetic-Only-123!'});cookie=setup.headers.get('set-cookie').split(';')[0];
 for(const [p,m]of [['public/local','GET'],['public/local/slots','GET'],['public/local/requests','POST'],['public/request-status','POST'],['owner/bookings/x/approve','POST'],['owner/public-link','GET'],['owner/public-link/sync','POST']])assert.equal((await call(p,m, m==='POST'?{}:undefined)).status,404,p);
 const csrf=await fetch(base+'/api/v1/owner/tasks',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{"title":"x"}'});assert.equal(csrf.status,403);
 const event={title:'동시 입력',startsAt:'2030-05-07T00:00:00Z',endsAt:'2030-05-07T01:00:00Z'};assert.deepEqual((await Promise.all([call('owner/events','POST',event),call('owner/events','POST',event)])).map(r=>r.status).sort(),[200,409]);
 assert.equal('bookings' in await (await call('owner/state')).json(),false);
 }finally{await new Promise(r=>app.server.close(r));rmSync(dir,{recursive:true,force:true});}
});
