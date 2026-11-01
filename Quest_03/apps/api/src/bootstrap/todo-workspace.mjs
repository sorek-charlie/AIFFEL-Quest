import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {requireValue} from '../../../../packages/domain/src/index.mjs';
import {createTodoService} from '../application/tasks/todo.mjs';
import {createSupabaseTodos,validateSupabaseConfig} from '../infrastructure/persistence/supabase/todos.mjs';
export function createTodoWorkspace(repo,owner,scheduler,root){
 const instanceId=randomUUID(),sessions=new Map(),config=()=>repo.config(owner,'todo-cloud')||{provider:'sqlite'};
 function context(cookie){const c=config(),client=c.url?createSupabaseTodos(c):null,s=sessions.get(cookie);return {c,client,s};}
 function service(cookie){const {c,client,s}=context(cookie);if(c.provider==='supabase'){requireValue(s,'Supabase에 로그인하세요.',409);return createTodoService({list:()=>client.list(s),create:b=>client.create(s,b),update:(id,b)=>client.update(s,id,b),remove:(id,b)=>client.remove(s,id,b)});}return createTodoService({list:()=>scheduler.state(owner).tasks,create:b=>scheduler.mutate(owner,'task','POST',null,b),update:(id,b)=>scheduler.mutate(owner,'task','PATCH',id,b),remove:(id,b)=>scheduler.mutate(owner,'task','DELETE',id,b)});}
 return {async handle(route,method,b,cookie){
  if(route==='todo/status'&&method==='GET'){const {c,s}=context(cookie);return {provider:c.provider||'sqlite',configured:!!c.url,url:c.url||'',testAccountsAvailable:!!repo.config(owner,'todo-test-accounts'),signedIn:!!s,email:s?.email||null,records:repo.config(owner,'todo-evidence')||{},sql:readFileSync(resolve(root,'database/supabase/migrations/0001_todo_rls.sql'),'utf8')};}
  if(route==='todo/config'&&method==='PUT'){requireValue(['sqlite','supabase'].includes(b.provider),'저장소를 선택하세요.');const old=config();const c=b.url||b.key?validateSupabaseConfig({url:b.url||old.url,key:b.key||old.key}):old;if(b.provider==='supabase')requireValue(c.url&&c.key,'Supabase 설정을 먼저 저장하세요.');repo.saveConfig(owner,'todo-cloud',{...c,provider:b.provider});if(b.url||b.key)sessions.clear();return {ok:true};}
  if(route==='todo/login'&&method==='POST'){const {client}=context(cookie);requireValue(client,'Supabase 설정을 먼저 저장하세요.');const s=await client.login(b.email,b.password);sessions.set(cookie,s);return {email:s.email};}
  if(route==='todo/test-login'&&method==='POST'){const {client}=context(cookie),test=repo.config(owner,'todo-test-accounts');requireValue(client&&test,'검증 계정 설정이 없습니다.');const s=await client.login(test.A.email,test.A.password);sessions.set(cookie,s);return {ok:true};}
  if(route==='todo/logout'&&method==='POST'){sessions.delete(cookie);return {ok:true};}
  if(route==='todo/items'&&method==='GET')return service(cookie).list();
  if(route==='todo/items'&&method==='POST')return service(cookie).create(b);
  const item=route.match(/^todo\/items\/([a-f0-9-]{36})$/);if(item){if(method==='PATCH')return service(cookie).update(item[1],b);if(method==='DELETE')return service(cookie).remove(item[1],b);}
  if(route==='todo/checkpoint'&&method==='POST'){const port=service(cookie),saved=await port.create({title:'[제출 검증] 앱 재시작 후 보존 확인',completed:false});const records=repo.config(owner,'todo-evidence')||{};records[config().provider||'sqlite']={id:saved.id,instanceId,createdAt:new Date().toISOString(),status:'재시작 후 확인 대기'};repo.saveConfig(owner,'todo-evidence',records);return saved;}
  if(route==='todo/verify'&&method==='POST'){const key=config().provider||'sqlite',records=repo.config(owner,'todo-evidence')||{},record=records[key];requireValue(record,'먼저 보존 확인 항목을 만드세요.');requireValue(record.instanceId!==instanceId,'PC 앱을 종료하고 재실행한 뒤 확인하세요.',409);const items=await service(cookie).list();requireValue(items.some(t=>t.id===record.id),'보존 확인 항목이 없습니다.',409);record.status='앱 재시작 후 보존 확인';record.verifiedAt=new Date().toISOString();repo.saveConfig(owner,'todo-evidence',records);return record;}
  if(route==='todo/rls'&&method==='POST'){
   const {client,s}=context(cookie);requireValue(client&&s,'Supabase 사용자 A로 로그인하세요.');const test=b.useTestAccount?repo.config(owner,'todo-test-accounts')?.B:null;const other=await client.login(test?.email||b.email,test?.password||b.password);requireValue(other.userId!==s.userId,'다른 사용자 B를 입력하세요.');let probe;
   try{probe=await client.create(s,{title:'[RLS 검증 임시]',completed:false});const path='/rest/v1/orbit_todos?id=eq.'+probe.id;const checks={};
    try{await client.request(path);checks.anonymous=false;}catch(e){checks.anonymous=[401,403].includes(e.providerStatus);}
    checks.select=(await client.request(path,{token:other.token})).length===0;
    checks.update=(await client.request(path,{token:other.token,method:'PATCH',body:{title:'금지된 수정'},prefer:'return=representation'})).length===0;
    checks.delete=(await client.request(path,{token:other.token,method:'DELETE',prefer:'return=representation'})).length===0;
    try{await client.request('/rest/v1/orbit_todos',{token:other.token,method:'POST',body:{owner_id:s.userId,title:'금지된 생성'}});checks.insert=false;}catch(e){checks.insert=e.providerStatus===403;}
    try{await client.request(path,{token:s.token,method:'PATCH',body:{owner_id:other.userId}});checks.ownerChange=false;}catch(e){checks.ownerChange=e.providerStatus===403;}
    checks.unchanged=(await client.list(s)).some(t=>t.id===probe.id&&t.title==='[RLS 검증 임시]');
    const result={checkedAt:new Date().toISOString(),passed:Object.values(checks).every(Boolean),checks};repo.saveConfig(owner,'todo-rls-evidence',result);return result;
   }finally{if(probe)await client.remove(s,probe.id,{expectedVersion:probe.version});}
  }
  if(route==='todo/rls'&&method==='GET')return repo.config(owner,'todo-rls-evidence')||{passed:null};
  requireValue(false,'경로를 찾을 수 없습니다.',404);
 }};
}
