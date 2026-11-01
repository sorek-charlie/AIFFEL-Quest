import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {createInputs} from '../../apps/api/src/application/inputs.mjs';
test('owner event details and project progress: validation, preservation, imports, restart and isolation',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-details-')),path=resolve(dir,'test.db');let repo=createRepository(path,resolve('.'));let app=createScheduler(repo);app.initialize('A');app.initialize('B');
 try{
  let p=app.mutate('A','project','POST',null,{title:'프로젝트',startsOn:'2030-01-01',endsOn:'2030-02-01',progress:65,notes:'추가 내용'});
  assert.throws(()=>app.mutate('A','project','PATCH',p.id,{...p,expectedVersion:p.version,progress:101}));assert.throws(()=>app.mutate('A','project','PATCH',p.id,{...p,expectedVersion:p.version,progress:12.5}));
  p=app.mutate('A','project','PATCH',p.id,{title:p.title,startsOn:p.startsOn,endsOn:p.endsOn,expectedVersion:p.version});assert.equal(p.progress,65);assert.equal(p.notes,'추가 내용');
  const inputs=createInputs(repo,'A'),candidate={kind:'event',externalId:'test',title:'가져온 일정',startsAt:'2030-01-02T00:00:00Z',endsAt:'2030-01-02T01:00:00Z'};inputs.ingest('fixture',[candidate],{auto:true});let e=app.state('A').events[0];
  e=app.mutate('A','event','PATCH',e.id,{...e,details:'안건과 배포 일정',participants:'김민수, 이서연',location:'회의실 A',expectedVersion:e.version});
  inputs.ingest('fixture',[{...candidate,title:'수정된 외부 일정'}],{auto:true});e=app.state('A').events[0];assert.equal(e.details,'안건과 배포 일정');assert.equal(e.participants,'김민수, 이서연');assert.equal(e.location,'회의실 A');
  e=app.mutate('A','event','PATCH',e.id,{title:e.title,startsAt:e.startsAt,endsAt:e.endsAt,expectedVersion:e.version});assert.equal(e.location,'회의실 A');assert.throws(()=>app.mutate('A','event','PATCH',e.id,{...e,participants:'x'.repeat(501),expectedVersion:e.version}));assert.equal(app.state('B').events.length,0);
  repo.close();repo=createRepository(path,resolve('.'));app=createScheduler(repo);assert.equal(app.state('A').projects[0].progress,65);assert.equal(app.state('A').events[0].details,'안건과 배포 일정');
 }finally{repo.close();rmSync(dir,{recursive:true,force:true});}
});
