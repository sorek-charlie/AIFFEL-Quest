import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {createInputs} from '../../apps/api/src/application/inputs.mjs';
import {createGoogle} from '../../apps/api/src/infrastructure/calendar-providers/google.mjs';
test('Google OAuth PKCE, account mismatch, token storage, Gmail and calendar updates using provider fixtures',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'orbit-google-')),repo=createRepository(resolve(dir,'db.sqlite'),resolve('.')),app=createScheduler(repo);app.initialize('A');const input=createInputs(repo,'A'),google=createGoogle(repo,'A',input),original=globalThis.fetch;let email='wrong@example.invalid',calendarDeleted=false;
 globalThis.fetch=async url=>{
  const u=String(url);let body;
  if(u.includes('oauth2.googleapis.com/token'))body={access_token:'SyntheticAccess',refresh_token:'SyntheticRefresh'};
  else if(u.includes('/gmail/v1/users/me/profile'))body={emailAddress:email};
  else if(u.includes('/gmail/v1/users/me/messages?'))body={messages:[{id:'m-1'}]};
  else if(u.includes('/gmail/v1/users/me/messages/m-1'))body={payload:{headers:[{name:'Subject',value:'가상 메일 제목'}]}};
  else if(u.includes('/calendar/v3/'))body={items:calendarDeleted?[{id:'e-1',status:'cancelled'}]:[{id:'e-1',summary:'가상 Google 일정',start:{dateTime:'2030-01-02T09:00:00+09:00'},end:{dateTime:'2030-01-02T10:00:00+09:00'}}],nextSyncToken:'fixture-cursor'};
  else throw new Error('Unexpected provider URL');
  return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
 };
 try{
  google.configure({clientId:'fixture.apps.googleusercontent.com'});
  let auth=new URL(google.connect('http://127.0.0.1:1234','session').url);assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.equal(auth.searchParams.get('login_hint'),'charlie.sungjin@gmail.com');
  let callback=new URL('http://127.0.0.1:1234/api/v1/auth/google/callback?code=fixture&state='+auth.searchParams.get('state'));
  await assert.rejects(()=>google.callback(callback,()=>true),e=>e.code==='ACCOUNT_MISMATCH');assert.equal(google.status().connected,false);
  email='charlie.sungjin@gmail.com';auth=new URL(google.connect('http://127.0.0.1:1234','session').url);callback=new URL('http://127.0.0.1:1234/api/v1/auth/google/callback?code=fixture&state='+auth.searchParams.get('state'));await google.callback(callback,s=>s==='session');assert.equal(google.status().connected,true);
  await google.gmail();await google.gmail();assert.equal(app.state('A').tasks.length,1);
  await google.calendar();await google.calendar();assert.equal(app.state('A').events.length,1);
  calendarDeleted=true;await google.calendar();assert.equal(app.state('A').events.length,0);
  google.disconnect();assert.equal(google.status().connected,false);
 }finally{globalThis.fetch=original;repo.close();rmSync(dir,{recursive:true,force:true});}
});
