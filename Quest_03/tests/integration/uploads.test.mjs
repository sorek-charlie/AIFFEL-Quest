import {freshFetch} from './http-fixture.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractUpload} from '../../apps/api/src/infrastructure/documents/uploads.mjs';
import {createApp} from '../../apps/api/src/bootstrap/server.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
test('document upload requires authentication and explicit review before saving',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'schedule-upload-test-')),app=createApp({dbPath:resolve(dir,'test.db')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;let cookie='';
 const call=(path,method='GET',body)=>freshFetch(base+'/api/v1/'+path,{method,headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const body={name:'schedule.txt',data:Buffer.from('2030-01-02 09:00~10:00 Meeting\nSubmit report').toString('base64')};
 try{assert.equal((await call('owner/inputs/upload','POST',body)).status,401);const login=await call('auth/setup','POST',{launchToken:app.launchToken,password:'Synthetic-Upload-123!'});cookie=login.headers.get('set-cookie').split(';')[0];
 const uploaded=await call('owner/inputs/upload','POST',body);assert.equal(uploaded.status,200);const preview=await uploaded.json();assert.equal(preview.proposalIds.length,2);const repeated=await (await call('owner/inputs/upload','POST',body)).json();assert.deepEqual(repeated.proposalIds,preview.proposalIds);const candidates=await (await call('owner/inputs')).json();assert.equal(candidates.length,2);assert.equal((await (await call('owner/state')).json()).events.length,0);
 const event=candidates.find(x=>x.kind==='event');assert.equal((await call(`owner/inputs/${event.id}/confirm`,'POST',{...event,location:'회의실',participants:'가상 참석자',details:'검토 후 수정한 주요내용'})).status,200);assert.equal((await (await call('owner/state')).json()).events.length,1);const stored=(await (await call('owner/state')).json()).events[0];assert.equal(stored.location,'회의실');assert.equal(stored.participants,'가상 참석자');assert.equal(stored.details,'검토 후 수정한 주요내용');
 for(const kind of ['event','task','project']){const data=Buffer.from('2030-02-03 10:00 '+kind+' attachment').toString('base64');assert.equal((await call('owner/inputs/upload','POST',{name:'kind.txt',data,kind})).status,200);const pending=await (await call('owner/inputs')).json();assert.ok(pending.some(p=>p.kind===kind&&p.title.includes(kind+' attachment')));}
 assert.equal((await call('owner/inputs/upload','POST',{...body,kind:'invalid'})).status,400);
 assert.equal((await call('owner/inputs/upload','POST',{...body,name:'malware.exe'})).status,400);
 await assert.rejects(extractUpload({name:'huge.txt',data:Buffer.alloc(8*1024*1024+1).toString('base64')},process.cwd()));
 }finally{await new Promise(r=>app.server.close(r));rmSync(dir,{recursive:true,force:true});}
});
