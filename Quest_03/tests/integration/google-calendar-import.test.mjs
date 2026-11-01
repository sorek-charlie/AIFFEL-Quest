import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createRepository} from '../../apps/api/src/infrastructure/persistence/sqlite/index.mjs';
import {createScheduler} from '../../apps/api/src/application/scheduler.mjs';
import {createInputs} from '../../apps/api/src/application/inputs.mjs';
import {createGoogle} from '../../apps/api/src/infrastructure/calendar-providers/google.mjs';
test('calendar-only OAuth, bounded preview, explicit selection, session binding, dedup and conflict review',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'calendar-import-')),repo=createRepository(resolve(dir,'db.sqlite'),resolve('.')),app=createScheduler(repo);app.initialize('A');const inputs=createInputs(repo,'A'),google=createGoogle(repo,'A',inputs),original=globalThis.fetch;const requested=[];
 globalThis.fetch=async(url,options)=>{const u=String(url);requested.push({u,options});if(u.includes('oauth2.googleapis.com/token'))return Response.json({access_token:'Synthetic',refresh_token:'SyntheticRefresh'});if(u.includes('openidconnect.googleapis.com'))return Response.json({email:'charlie.sungjin@gmail.com',email_verified:true});if(u.includes('/calendar/v3/'))return Response.json({items:[{id:'timed',summary:'10분 일정',start:{dateTime:'2035-01-02T09:20:00+09:00'},end:{dateTime:'2035-01-02T10:00:00+09:00'}},{id:'allday',summary:'종일 일정',start:{date:'2035-01-03'},end:{date:'2035-01-04'}},{id:'deleted',status:'cancelled'}]});throw Error('Unexpected URL');};
 try{
  google.configure({clientId:'fixture.apps.googleusercontent.com'});const auth=new URL(google.connect('http://127.0.0.1:1234','session',{calendarOnly:true}).url);assert.match(auth.searchParams.get('scope'),/calendar.readonly/);assert.doesNotMatch(auth.searchParams.get('scope'),/gmail/);await google.callback(new URL('http://127.0.0.1:1234/callback?code=synthetic&state='+auth.searchParams.get('state')),()=>true);assert.equal(google.status().calendarOnly,true);
  await assert.rejects(()=>google.preview({from:'2035-99-01',to:'2035-01-31'},'session'),e=>e.status===400);
  await assert.rejects(()=>google.preview({from:'2035-01-01',to:'2037-01-01'},'session'),e=>e.status===400);
  const preview=await google.preview({from:'2035-01-01',to:'2035-01-31'},'session');assert.equal(preview.events.length,2);assert.equal(app.state('A').events.length,0);assert.equal(preview.events[1].startsAt,'2035-01-02T15:00:00.000Z');
  assert.throws(()=>google.importPreview({previewId:preview.previewId,ids:['timed']},'other'),e=>e.status===409);assert.throws(()=>google.importPreview({previewId:preview.previewId,ids:['forged']},'session'));
  assert.equal(google.importPreview({previewId:preview.previewId,ids:['timed']},'session').applied,1);assert.equal(app.state('A').events.length,1);
  const again=await google.preview({from:'2035-01-01',to:'2035-01-31'},'session');assert.equal(google.importPreview({previewId:again.previewId,ids:['timed']},'session').skipped,1);
  app.mutate('A','event','POST',null,{title:'점유',startsAt:'2035-01-02T15:00:00.000Z',endsAt:'2035-01-02T16:00:00.000Z'});const conflict=await google.preview({from:'2035-01-01',to:'2035-01-31'},'session');assert.equal(google.importPreview({previewId:conflict.previewId,ids:['allday']},'session').pending,1);
  assert.ok(requested.every(x=>!x.options?.method||x.options.method==='GET'||x.u.includes('oauth2.googleapis.com/token')));
 }finally{globalThis.fetch=original;repo.close();rmSync(dir,{recursive:true,force:true});}
});
