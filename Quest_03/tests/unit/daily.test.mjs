import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyModel} from '../../apps/web/src/app/owner/daily-model.mjs';
test('daily briefing: Seoul boundary, continuing hours, exact task date and project state',()=>{
 const s={events:[{id:'prior',startsAt:'2030-01-01T14:00:00Z',endsAt:'2030-01-01T16:00:00Z'},{id:'morning',startsAt:'2030-01-02T00:30:00Z',endsAt:'2030-01-02T02:00:00Z'},{id:'next',startsAt:'2030-01-02T15:00:00Z',endsAt:'2030-01-02T16:00:00Z'}],tasks:[{id:'today',dueDate:'2030-01-02'},{id:'undated'},{id:'next',dueDate:'2030-01-03'}],projects:[{id:'active',startsOn:'2030-01-01',endsOn:'2030-01-10',status:'active'},{id:'overdue',startsOn:'2029-12-01',endsOn:'2030-01-01',status:'active'},{id:'future',startsOn:'2030-02-01',endsOn:'2030-02-10',status:'planned'},{id:'done',startsOn:'2030-01-01',endsOn:'2030-01-10',status:'completed'}]};
 const m=dailyModel(s,'2030-01-02');assert.deepEqual(m.events.map(e=>e.id),['prior','morning']);assert.equal(m.hours.length,24);assert.equal(m.hours[0].events[0].id,'prior');assert.equal(m.hours[9].events[0].id,'morning');assert.equal(m.hours[10].ongoing[0].id,'morning');assert.equal(m.hours[11].ongoing.length,0);assert.deepEqual(m.tasks.map(t=>t.id),['today']);assert.equal(m.undated,1);assert.equal(m.projects.length,3);
});
