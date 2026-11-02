import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGoogle} from '../../apps/api/src/infrastructure/calendar-providers/google.mjs';
test('spam permission is separate; gateway changes only SPAM and INBOX on the selected message',async()=>{
 const configs=new Map(),repo={config:(o,k)=>configs.get(k),saveConfig:(o,k,v)=>configs.set(k,v)},google=createGoogle(repo,'A',{}),original=globalThis.fetch;let writes=[];
 globalThis.fetch=async(url,options={})=>{const u=String(url);if(u.includes('oauth2.googleapis.com/token'))return Response.json({access_token:'Synthetic',refresh_token:'SyntheticRefresh',scope:'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.readonly'});if(u.endsWith('/profile'))return Response.json({emailAddress:'charlie.sungjin@gmail.com'});if(u.endsWith('/modify')){writes.push({u,...options});return Response.json({id:'abc'});}throw Error('Unexpected URL');};
 try{google.configure({clientId:'fixture.apps.googleusercontent.com'});configs.set('google',{...configs.get('google'),refreshToken:'SyntheticReadOnly'});await assert.rejects(async()=>{const mailbox=await google.mailbox();await mailbox.spam('abc');},e=>e.code==='GMAIL_MODIFY_REQUIRED');assert.equal(writes.length,0);
  const auth=new URL(google.connect('http://127.0.0.1:1234','session',{gmailReview:true}).url);assert.match(auth.searchParams.get('scope'),/gmail.modify/);await google.callback(new URL('http://127.0.0.1:1234/callback?code=test&state='+auth.searchParams.get('state')),()=>true);assert.equal(google.status().gmailModify,true);
  const mailbox=await google.mailbox();await mailbox.spam('abc');assert.equal(writes.length,1);assert.equal(writes[0].method,'POST');assert.match(writes[0].u,/messages\/abc\/modify$/);assert.deepEqual(JSON.parse(writes[0].body),{addLabelIds:['SPAM'],removeLabelIds:['INBOX']});
 }finally{globalThis.fetch=original;}
});
