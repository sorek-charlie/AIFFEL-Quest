import {test} from 'node:test';
import assert from 'node:assert/strict';
import {threeDayModel} from '../../apps/web/src/app/owner/three-day-model.mjs';
import {threeDayView} from '../../apps/web/src/app/owner/three-day.mjs';
test('three-day briefing: year boundary, midnight exclusion, exact due date, project period and escaped details',()=>{
 const state={events:[{id:'cross',title:'<상담>',startsAt:'2029-12-31T14:30:00Z',endsAt:'2029-12-31T16:00:00Z',projectId:'range',venue:'zoom'},{id:'midnight',title:'자정 종료',startsAt:'2029-12-31T13:00:00Z',endsAt:'2029-12-31T15:00:00Z'}],tasks:[{title:'어제 할 일',dueDate:'2029-12-31',completed:true},{title:'오늘 할 일',dueDate:'2030-01-01'},{title:'내일 할 일',dueDate:'2030-01-02'},{title:'날짜 없음'}],projects:[{id:'range',title:'3일 프로젝트',startsOn:'2029-12-31',endsOn:'2030-01-02',status:'active'},{id:'done',title:'완료 프로젝트',startsOn:'2029-12-31',endsOn:'2029-12-31',status:'completed'},{id:'future',title:'이후 계획',startsOn:'2030-01-03',endsOn:'2030-02-01',status:'planned'}]};
 const days=threeDayModel(state,'2030-01-01');assert.deepEqual(days.map(m=>m.date),['2029-12-31','2030-01-01','2030-01-02']);assert.deepEqual(days.map(m=>m.events.length),[2,1,0]);assert.deepEqual(days.map(m=>m.tasks.length),[1,1,1]);assert.deepEqual(days.map(m=>m.projects.length),[2,1,1]);assert.equal(days[1].undated,1);
 const html=threeDayView(state,'2030-01-01');assert.equal((html.match(/<table /g)||[]).length,3);assert.equal((html.match(/role="region"/g)||[]).length,9);assert.ok(html.includes('&lt;상담&gt;'));assert.ok(!html.includes('<상담>'));assert.ok(html.includes('전날부터 – 01:00'));assert.ok(html.includes('Zoom'));assert.ok(html.includes('✓ 완료'));assert.ok(!html.includes('이후 계획'));
});
