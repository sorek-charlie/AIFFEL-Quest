import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
test('projects: ownership, linked item validation, conflict boundary, persistence and deletion guard',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-project-')),path=resolve(dir,'test.sqlite');let repo=createRepository(path,resolve('.'));let app=createScheduler(repo);app.initialize('A');app.initialize('B');
 try{
 const p=app.mutate('A','project','POST',null,{title:'테스트 프로젝트',startsOn:'2030-01-01',endsOn:'2030-01-31',status:'active'});
 assert.equal(app.state('B').projects.length,0);assert.throws(()=>app.mutate('B','project','PATCH',p.id,{title:'다른 사용자',expectedVersion:1}),e=>e.status===404);
 assert.throws(()=>app.mutate('A','project','POST',null,{title:'오류',startsOn:'2030-02-30',endsOn:'2030-03-01'}),e=>e.status===400);
 assert.throws(()=>app.mutate('A','project','POST',null,{title:'역순',startsOn:'2030-03-01',endsOn:'2030-02-01'}),e=>e.status===400);
 const task=app.mutate('A','task','POST',null,{title:'오늘 일',dueDate:'2030-01-02',projectId:p.id});
 app.mutate('A','task','PATCH',task.id,{title:task.title,completed:true,expectedVersion:1});assert.equal(app.state('A').tasks[0].dueDate,'2030-01-02');assert.equal(app.state('A').tasks[0].projectId,p.id);
 assert.throws(()=>app.mutate('B','task','POST',null,{title:'외부 연결',projectId:p.id}),e=>e.status===404);
 const e=app.mutate('A','event','POST',null,{title:'연결 일정',projectId:p.id,startsAt:'2030-01-02T00:00:00Z',endsAt:'2030-01-02T01:00:00Z'});
 assert.throws(()=>app.mutate('A','event','POST',null,{title:'충돌',startsAt:e.startsAt,endsAt:e.endsAt,projectId:p.id}),e=>e.code==='SLOT_CONFLICT');
 assert.throws(()=>app.mutate('A','project','DELETE',p.id,{expectedVersion:1}),e=>e.code==='PROJECT_IN_USE');
 repo.close();repo=createRepository(path,resolve('.'));app=createScheduler(repo);assert.equal(app.state('A').projects[0].title,p.title);assert.equal(app.state('A').tasks[0].dueDate,'2030-01-02');
 app.mutate('A','task','PATCH',task.id,{title:task.title,projectId:null,dueDate:null,expectedVersion:2});app.mutate('A','event','DELETE',e.id,{expectedVersion:1});app.mutate('A','project','DELETE',p.id,{expectedVersion:1});assert.equal(app.state('A').projects.length,0);
 }finally{repo.close();rmSync(dir,{recursive:true,force:true});}
});
