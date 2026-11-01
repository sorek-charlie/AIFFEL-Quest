import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
test('variable meeting duration excludes busy intervals and preserves purpose/venue through approval',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-duration-')),repo=createRepository(resolve(dir,'test.sqlite'),resolve('.')),now=Date.parse('2030-05-06T00:00:00Z'),app=createScheduler(repo,()=>now);app.initialize('A');
 try{app.updateSettings('A',{...app.state('A').settings,enabled:true});app.mutate('A','event','POST',null,{title:'비공개 일정',startsAt:'2030-05-07T01:00:00Z',endsAt:'2030-05-07T02:00:00Z'});const slots=app.slots('A','2030-05-07',60);assert.ok(slots.length);assert.equal(slots.some(s=>s.startsAt==='2030-05-07T00:30:00.000Z'),false);assert.equal(slots.some(s=>s.startsAt==='2030-05-07T00:00:00.000Z'),true);assert.throws(()=>app.slots('A','2030-05-07',45));
 const receipt=app.request('A',{startsAt:slots[0].startsAt,durationMinutes:60,guestName:'Synthetic',guestContact:'test@example.invalid',purpose:'기획 상담',venue:'zoom'},randomUUID());let b=app.state('A').bookings[0];assert.equal(b.durationMinutes,60);assert.equal(b.purpose,'기획 상담');assert.equal(b.venue,'zoom');app.decide('A',receipt.id,'approve',{expectedVersion:1},randomUUID());assert.equal(app.state('A').events.find(e=>e.requestId===receipt.id).venue,'zoom');assert.equal(app.status('A',{id:receipt.id,statusCapability:receipt.statusCapability}).status,'confirmed');
 const slot=app.slots('A','2030-05-07',30)[0];assert.throws(()=>app.request('A',{startsAt:slot.startsAt,durationMinutes:30,guestName:'Test',guestContact:'test@example.invalid',purpose:'상담',venue:'other'},randomUUID()),e=>e.status===400);
 }finally{repo.close();rmSync(dir,{recursive:true,force:true});}
});
