import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyMail,orderMailRows} from '../../packages/domain/src/tasks/mail-triage.mjs';
import {createMailReview} from '../../apps/api/src/application/mail-review.mjs';
test('five mail categories and top-down near-to-far agenda sorting',()=>{
 const examples=[['회의','2030-01-03 09:20 미팅','event'],['요청','제안서 제출 마감 2030-01-05','schedule'],['프로젝트 착수','2030-01-01 ~ 2030-02-01','project'],['뉴스레터','이번 주 소식','other'],['당첨','당첨 수령을 위해 수수료 입금','spam']];
 for(const [subject,body,expected]of examples)assert.equal(classifyMail({subject,body}).category,expected);
 const rows=[{id:'far',planDate:'2030-02-01',receivedAt:'2030-01-01'},{id:'none',planDate:null,receivedAt:'2030-01-03'},{id:'past',planDate:'2029-12-31',receivedAt:'2030-01-01'},{id:'near',planDate:'2030-01-03',receivedAt:'2030-01-01'}];assert.deepEqual(orderMailRows(rows,'2030-01-02').map(r=>r.id),['near','far','none','past']);
});
test('date-bounded asynchronous one-mail-one-row review, pagination and explicit spam movement',async()=>{
 const configs=new Map(),repo={config:(o,k)=>structuredClone(configs.get(k)),saveConfig:(o,k,v)=>configs.set(k,structuredClone(v))};let query,spamCalls=0;
 const messages=[{id:'a',subject:'뉴스',body:'소식',receivedAt:'2030-01-02T00:00:00Z',labels:[]},{id:'b',subject:'당첨',body:'당첨 후 수수료 입금',receivedAt:'2030-01-03T00:00:00Z',labels:[]}];
 const app=createMailReview({repo,owner:'A',inputs:{},provider:async()=>({list:async b=>(query=b.query,{ids:['a','b'],truncated:false}),read:async id=>messages.find(m=>m.id===id),spam:async()=>{spamCalls++;}})});
 app.start({from:'2030-01-01',to:'2030-01-03',limit:50});for(let n=0;n<100&&app.status().job.state==='running';n++)await new Promise(r=>setTimeout(r,1));assert.equal(app.status().job.state,'done');assert.equal(app.status().total,2);assert.match(query,/after:\d+ before:\d+/);assert.equal(app.status({category:'spam'}).rows[0].id,'b');assert.equal(spamCalls,0);
 await assert.rejects(()=>app.action('b',{category:'spam'}));assert.equal(spamCalls,0);await app.action('b',{category:'spam',confirmSpam:true});assert.equal(spamCalls,1);await assert.rejects(()=>app.action('b',{category:'spam',confirmSpam:true}));assert.equal(spamCalls,1);
 await app.action('a',{category:'other'});assert.equal(app.status({category:'other'}).rows[0].state,'reviewed');assert.equal(app.status({page:2}).rows.length,0);
});
