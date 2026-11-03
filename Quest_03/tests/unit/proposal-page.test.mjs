import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposalPage} from '../../apps/web/src/features/settings/proposal-page.mjs';
import {inputsView} from '../../apps/web/src/features/settings/inputs.mjs';
test('1,360 pending proposals render only 20 forms and every page remains reachable',()=>{
 const rows=Array.from({length:1360},(_,i)=>({id:String(i),title:'Synthetic '+i,kind:'task',source:'gmail'}));
 const integration={google:{connected:false,account:'synthetic@example.invalid'}};
 const html=inputsView(rows,integration,[],1);
 assert.equal((html.match(/data-proposal="/g)||[]).length,20);
 assert.ok(html.includes('1360개'));assert.ok(html.includes('1 / 68'));
 const visited=[];for(let page=1;page<=68;page++)visited.push(...proposalPage(rows,page).rows.map(x=>x.id));
 assert.equal(new Set(visited).size,1360);assert.equal(proposalPage(rows,999).page,68);
 assert.equal(proposalPage([],0).page,1);
});
