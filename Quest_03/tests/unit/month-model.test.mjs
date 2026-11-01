import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthCells,shiftMonth,dayEvents,seoulDate} from '../../apps/web/src/features/calendar/month-model.mjs';
test('month calendar covers leap days, adjacent months, Sunday start and year rollover',()=>{
 const leap=monthCells('2028-02',[]);assert.equal(leap.length,35);assert.equal(new Set(leap.map(c=>c.date)).size,35);assert.equal(leap.filter(c=>c.inMonth).length,29);
 assert.equal(monthCells('2026-11',[])[0].date,'2026-11-01');assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2027-01',-1),'2026-12');
});
test('Seoul multi-day and cross-month events use exclusive end, including midnight',()=>{
 const span={id:'span',startsAt:'2026-10-31T14:00:00.000Z',endsAt:'2026-11-02T15:00:00.000Z'}; // Oct 31 23:00 -> Nov 3 00:00 KST
 const midnight={id:'midnight',startsAt:'2026-10-30T14:00:00.000Z',endsAt:'2026-10-30T15:00:00.000Z'};
 assert.equal(seoulDate(span.startsAt),'2026-10-31');assert.equal(dayEvents([midnight],'2026-10-30').length,1);assert.equal(dayEvents([midnight],'2026-10-31').length,0);
 assert.equal(dayEvents([span],'2026-11-01').length,1);assert.equal(dayEvents([span],'2026-11-02').length,1);assert.equal(dayEvents([span],'2026-11-03').length,0);
 assert.ok(monthCells('2026-11',[span]).find(c=>c.date==='2026-11-01').events.includes(span));
});
