import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoState} from '../../apps/web/src/app/owner/demo-state.mjs';
import {threeDayView} from '../../apps/web/src/app/owner/three-day.mjs';
test('today focus: demo is separate, detailed facts, manual/automatic progress and checklist dates',()=>{
 const s=demoState('2030-01-01'),html=threeDayView(s,'2030-01-01');assert.equal(s._demo,true);assert.ok(html.includes('참석자'));assert.ok(html.includes('본사 3층'));assert.ok(html.includes('65%'));assert.ok(html.includes('다음 배포 체크리스트 작성'));assert.ok(!html.includes('data-brief-task='));assert.ok(html.includes('disabled'));
 const real={...s,_demo:false,projects:s.projects.map(p=>({...p,progress:null,notes:'<추가>'}))},r=threeDayView(real,'2030-01-01');assert.ok(r.includes('40%'));assert.ok(r.includes('연결 할 일 완료 기준'));assert.ok(r.includes('data-brief-task='));assert.ok(r.includes('&lt;추가&gt;'));
 const none=threeDayView({...real,tasks:[]},'2030-01-01');assert.ok(none.includes('진척률 미설정'));assert.ok(!none.includes('NaN'));
 const popup=threeDayView(s,'2030-01-01',{todayOnly:true});assert.equal((popup.match(/<th /g)||[]).length,3);assert.ok(!popup.includes('어제'));assert.ok(!popup.includes('내일'));assert.ok(popup.includes('고객 포털 개선 미팅'));
});
