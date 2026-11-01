import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createApp} from '../../apps/api/src/bootstrap/server.mjs';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createInputs} from '../../apps/api/src/application/inputs.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {textCandidates,parseIcs} from '../../packages/domain/src/tasks/extraction.mjs';
import {createSyncManager} from '../../apps/api/src/infrastructure/calendar-providers/sync-manager.mjs';
import {DatabaseSync} from 'node:sqlite';
import {request as httpRequest} from 'node:http';
// Each restart assertion needs a new TCP connection, not the previous server's pooled socket.
function freshFetch(url,options){return new Promise((resolve,reject)=>{const req=httpRequest(url,{method:options.method,headers:options.headers,agent:false},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).map(([k,v])=>[k,Array.isArray(v)?v.join('; '):String(v)]))})));});req.on('error',reject);req.end(options.body);});}
test('version 1 database migrates forward without losing saved tasks',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-migration-')),path=resolve(dir,'old.sqlite');let db=new DatabaseSync(path);db.exec(readFileSync(resolve('database/sqlite/migrations/0001_initial.sql'),'utf8'));db.prepare('INSERT INTO owners VALUES(?,?)').run('A','{}');db.prepare('INSERT INTO entities VALUES(?,?,?,?)').run('A','task','old-task',JSON.stringify({id:'old-task',title:'이전 버전 할 일',version:1,completed:false}));db.exec('PRAGMA user_version=1');db.close();let repo;
 try{repo=createRepository(path,resolve('.'));assert.equal(repo.list('A','task')[0].title,'이전 버전 할 일');repo.saveConfig('A','test',{secret:'Synthetic-Secret'});assert.equal(repo.config('A','test').secret,'Synthetic-Secret');assert.equal(repo.password('A'),undefined);}finally{repo?.close();rmSync(dir,{recursive:true,force:true});}
});
test('password setup, password-only login, change revokes all sessions, restart persists hash',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-auth-'));let app=createApp({dbPath:resolve(dir,'db.sqlite')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${app.server.address().port}`;
 const post=(p,b,cookie='')=>freshFetch(base+'/api/v1/'+p,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(b)});
 try{
 assert.equal((await (await freshFetch(base+'/api/v1/auth/session',{method:'GET',headers:{}})).json()).configured,false);
 assert.equal((await post('auth/setup',{password:'Original-Password-123',launchToken:'bad'})).status,403);
 const setup=await post('auth/setup',{password:'Original-Password-123',launchToken:app.launchToken});assert.equal(setup.status,200);const cookie=setup.headers.get('set-cookie').split(';')[0];
 assert.equal((await post('auth/login',{token:app.launchToken})).status,401);
 assert.equal((await post('auth/setup',{password:'Other-Password-123',launchToken:app.launchToken})).status,409);
 assert.equal((await post('auth/login',{password:'wrong-password'})).status,401);
 assert.equal((await post('auth/login',{password:'Original-Password-123'})).status,200);
 assert.equal((await post('auth/change-password',{currentPassword:'Original-Password-123',newPassword:'Changed-Password-456'},cookie)).status,200);
 assert.equal((await freshFetch(base+'/api/v1/owner/state',{method:'GET',headers:{Cookie:cookie}})).status,401);
 assert.equal((await post('auth/login',{password:'Original-Password-123'})).status,401);
 await new Promise(r=>app.server.close(r));app=createApp({dbPath:resolve(dir,'db.sqlite')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.server.address().port}`;
 assert.equal((await post('auth/login',{password:'Changed-Password-456'})).status,200);
 assert.equal(readFileSync(resolve(dir,'db.sqlite')).includes(Buffer.from('Changed-Password-456')),false);
 }finally{await new Promise(r=>app.server.close(r));rmSync(dir,{recursive:true,force:true});}
});
test('text extraction, review, source deduplication, updates, conflict protection and cancellations',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-inputs-')),repo=createRepository(resolve(dir,'db.sqlite'),resolve('.')),scheduler=createScheduler(repo);scheduler.initialize('A');scheduler.initialize('B');const inputs=createInputs(repo,'A');
 try{
 const candidates=textCandidates('2026-11-02 14:00~15:00 디자인 미팅\n제안서 초안 작성');assert.equal(candidates[0].kind,'event');assert.equal(candidates[1].kind,'task');assert.equal(candidates[0].startsAt,'2026-11-02T05:00:00.000Z');
 inputs.ingest('document',candidates);assert.equal(inputs.list().length,2);assert.equal(scheduler.state('A').events.length,0);
 const proposal=inputs.list().find(p=>p.kind==='event');inputs.confirm(proposal.id,{...proposal,title:'검토한 미팅'});assert.equal(scheduler.state('A').events.length,1);assert.equal(scheduler.state('B').events.length,0);
 inputs.ingest('document',candidates);assert.equal(inputs.list().length,1);
 const google={...candidates[0],externalId:'google-1'};assert.equal(inputs.ingest('google-calendar',[google],{auto:true}).pending,1);
 inputs.ingest('gmail',[{kind:'task',title:'[메일] 요청',externalId:'mail-1'}],{auto:true});inputs.ingest('gmail',[{kind:'task',title:'[메일] 요청',externalId:'mail-1'}],{auto:true});assert.equal(scheduler.state('A').tasks.length,1);
 const linkedProject=scheduler.mutate('A','project','POST',null,{title:'연동 프로젝트',startsOn:'2026-11-01',endsOn:'2026-11-30'});
 const importedTask=scheduler.state('A').tasks[0];scheduler.mutate('A','task','PATCH',importedTask.id,{title:importedTask.title,projectId:linkedProject.id,dueDate:'2026-11-03',expectedVersion:importedTask.version});inputs.ingest('gmail',[{kind:'task',title:'[메일] 수정 요청',externalId:'mail-1'}],{auto:true});assert.equal(scheduler.state('A').tasks[0].projectId,linkedProject.id);assert.equal(scheduler.state('A').tasks[0].dueDate,'2026-11-03');
 const remote={kind:'event',title:'원격 일정',externalId:'remote-2',startsAt:'2026-11-03T01:00:00.000Z',endsAt:'2026-11-03T02:00:00.000Z'};inputs.ingest('google-calendar',[remote],{auto:true});const importedEvent=scheduler.state('A').events.find(e=>e.sourceKey==='google-calendar:remote-2');scheduler.mutate('A','event','PATCH',importedEvent.id,{title:importedEvent.title,startsAt:importedEvent.startsAt,endsAt:importedEvent.endsAt,projectId:linkedProject.id,expectedVersion:importedEvent.version});inputs.ingest('google-calendar',[{...remote,title:'원격 일정 수정'}],{auto:true});assert.equal(scheduler.state('A').events.length,2);assert.equal(scheduler.state('A').events.find(e=>e.id===importedEvent.id).projectId,linkedProject.id);
 inputs.ingest('google-calendar',[{externalId:'remote-2',kind:'event',title:'취소',status:'cancelled'}],{auto:true});assert.equal(scheduler.state('A').events.length,1);
 const ics='BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:demo\nDTSTART;TZID=Asia/Seoul:20261104T090000\nDTEND;TZID=Asia/Seoul:20261104T100000\nSUMMARY:테스트 일정\nEND:VEVENT\nEND:VCALENDAR';assert.equal(parseIcs(ics)[0].startsAt,'2026-11-04T00:00:00.000Z');assert.throws(()=>parseIcs(ics.replace('SUMMARY:','RRULE:FREQ=DAILY\nSUMMARY:')));
 }finally{repo.close();rmSync(dir,{recursive:true,force:true});}
});
test('force sync truthfully reports unconnected services and imports configured ICS only once',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-sync-')),repo=createRepository(resolve(dir,'db.sqlite'),resolve('.')),s=createScheduler(repo);s.initialize('A');const inputs=createInputs(repo,'A'),google={status:()=>({connected:false})},sync=createSyncManager(repo,'A',google,inputs);
 try{const result=await sync.run();assert.ok(Object.values(result).every(r=>r.state==='not_connected'));const path=resolve(dir,'phone.ics');writeFileSync(path,'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:phone-test\nDTSTART:20261105T000000Z\nDTEND:20261105T010000Z\nSUMMARY:Phone test\nEND:VEVENT\nEND:VCALENDAR');sync.configure({gmail:true,calendar:true,kakaoFile:'',phoneFile:path});await sync.run('phone');await sync.run('phone');assert.equal(s.state('A').events.length,1);}finally{sync.close();repo.close();rmSync(dir,{recursive:true,force:true});}
});
