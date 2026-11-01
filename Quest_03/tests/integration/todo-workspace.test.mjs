import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {createTodoWorkspace} from '../../apps/api/src/bootstrap/todo-workspace.mjs';
import {createSupabaseTodos,validateSupabaseConfig} from '../../apps/api/src/infrastructure/persistence/supabase/todos.mjs';
test('assignment Todo local CRUD and genuine application restart checkpoint',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'todo-ab-')),path=resolve(dir,'db.sqlite');let repo;
 function open(){repo=createRepository(path,resolve('.'));const scheduler=createScheduler(repo);scheduler.initialize('A');return createTodoWorkspace(repo,'A',scheduler,resolve('.'));}
 try{let w=open();const call=(r,m,b={})=>w.handle('todo/'+r,m,b,'session');
  const item=await call('items','POST',{title:'지속 저장 Todo'});await call('items/'+item.id,'PATCH',{title:'수정된 Todo',completed:true,expectedVersion:1});
  const deleted=await call('items','POST',{title:'삭제 검증'});await call('items/'+deleted.id,'DELETE',{expectedVersion:1});await call('checkpoint','POST');await assert.rejects(()=>call('verify','POST'),e=>e.status===409);
  repo.close();w=open();const items=await call('items','GET');assert.equal(items.find(t=>t.id===item.id).completed,true);assert.equal(items.find(t=>t.id===item.id).title,'수정된 Todo');assert.equal(items.some(t=>t.id===deleted.id),false);assert.equal((await call('verify','POST')).status,'앱 재시작 후 보존 확인');
 }finally{repo?.close();rmSync(dir,{recursive:true,force:true});}
});
test('Supabase REST contract uses user JWT, DTO allowlist and optimistic version; rejects service keys',async()=>{
 const anon='x.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.test',url='https://abcdefghijklmnopqrst.supabase.co';
 assert.throws(()=>validateSupabaseConfig({url,key:'sb_secret_'+'x'.repeat(40)}));assert.throws(()=>validateSupabaseConfig({url:'http://127.0.0.1',key:anon}));
 const calls=[],rows=[{id:'00000000-0000-4000-8000-000000000001',title:'가상 클라우드 Todo',completed:false,version:1,owner_id:'private-owner'}];
 const client=createSupabaseTodos({url,key:anon},async(path,options)=>{calls.push({path,options});return Response.json(rows);});
 const s={token:'synthetic-user-token',userId:'00000000-0000-4000-8000-000000000002'};assert.deepEqual(Object.keys((await client.list(s))[0]).sort(),['completed','id','title','version']);await client.create(s,{title:'추가'});await client.update(s,rows[0].id,{title:'수정',completed:true,expectedVersion:1});await client.remove(s,rows[0].id,{expectedVersion:1});
 for(const c of calls)assert.equal(c.options.headers.Authorization,'Bearer synthetic-user-token');assert.equal(JSON.parse(calls[1].options.body).owner_id,s.userId);assert.match(calls[2].path,/version=eq.1/);
});
