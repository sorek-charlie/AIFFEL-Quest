import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {gmailCandidates} from '../../apps/api/src/infrastructure/calendar-providers/google.mjs';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createInputs} from '../../apps/api/src/application/inputs.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {sourceLink} from '../../apps/web/src/platform/api/index.mjs';
test('Gmail body classifies three kinds; confirmation, ownership, edits and restart preserve origin',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'gmail-classify-')),path=resolve(dir,'db.sqlite');let repo=createRepository(path,resolve('.'));
 const source={threadId:'thread123',payload:{headers:[{name:'Subject',value:'Synthetic planning mail'},{name:'To',value:'charlie.sungjin@gmail.com'}],mimeType:'text/plain',body:{data:Buffer.from('2030-01-02 09:00~10:00 회의\n제안서 작성\n프로젝트 리뉴얼 2030-01-01 ~ 2030-01-31').toString('base64url')}}};
 try{
  const candidates=gmailCandidates(source,'message123');assert.deepEqual(candidates.map(c=>c.kind),['event','task','project']);
  const app=createScheduler(repo);app.initialize('A');app.initialize('B');const input=createInputs(repo,'A');input.ingest('gmail',candidates);assert.equal(app.state('A').tasks.length,0);
  for(const p of input.list())input.confirm(p.id,{...p});
  const state=app.state('A');for(const kind of ['tasks','events','projects']){assert.equal(state[kind].length,1);assert.equal(state[kind][0].sourceEmail.messageId,'message123');assert.match(sourceLink(state[kind][0]),/mail.google.com/);}
  const task=state.tasks[0];const updated=app.mutate('A','task','PATCH',task.id,{title:'編集後',expectedVersion:task.version});assert.equal(updated.sourceEmail.messageId,'message123');
  assert.equal(app.state('B').tasks.length,0);assert.equal(input.ingest('gmail',candidates).skipped,3);
  repo.close();repo=createRepository(path,resolve('.'));assert.equal(repo.list('A','project')[0].sourceEmail.account,'charlie.sungjin@gmail.com');
  repo.saveConfig('A','google',{clientSecret:'SYNTHETIC-PRIVATE-TEST'});assert.equal(readFileSync(path).includes(Buffer.from('SYNTHETIC-PRIVATE-TEST')),false);
  assert.doesNotMatch(sourceLink({title:'x',sourceEmail:{messageId:'javascript:alert(1)'}}),/<a/);
 }finally{repo.close();rmSync(dir,{recursive:true,force:true});}
});
