import {randomBytes,createHash} from 'node:crypto';
import {requireValue} from '../../../../../packages/domain/src/index.mjs';
import {textCandidates} from '../../../../../packages/domain/src/tasks/extraction.mjs';
export function gmailCandidates(email,id) {
 const header=n=>email.payload?.headers?.find(h=>h.name.toLowerCase()===n)?.value||'';
 const plain=p=>[p?.mimeType==='text/plain'&&p.body?.data?Buffer.from(p.body.data,'base64url').toString('utf8'):'',...(p?.parts||[]).map(plain)].filter(Boolean).join('\n');
 const body=plain(email.payload)||email.snippet||'';
 const sourceEmail={messageId:id,threadId:email.threadId||id,subject:header('subject').slice(0,300),from:header('from').slice(0,500),to:header('to').slice(0,500),account:ACCOUNT,excerpt:body.slice(0,2000)};
 return textCandidates(body||header('subject')).map((c,i)=>{
  const dates=[...c.title.matchAll(/20\d{2}-\d{2}-\d{2}/g)].map(x=>x[0]);
  const project=c.kind!=='event'&&/프로젝트|project/i.test(c.title);
  return {...c,...(project?{kind:'project',startsOn:dates[0]||null,endsOn:dates[1]||null}:{}),classificationReason:project?'프로젝트 키워드 · 기간 확인 필요':c.kind==='event'?'명확한 날짜와 시각':'실행 항목 · 날짜와 구분 확인 필요',externalId:id+':'+i,sourceEmail,details:('제목: '+header('subject')+'\n'+body).slice(0,2000),participants:header('to').slice(0,500)};
 });
}
const ACCOUNT='charlie.sungjin@gmail.com';
const SCOPES='https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly';
export function createGoogle(repo,owner,inputs) {
 const pending=new Map(),previews=new Map();
 const config=()=>repo.config(owner,'google')||{};
 async function json(url,options={}) {const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});if(!r.ok){const e=new Error(r.status===401?'Google 연결을 다시 인증하세요.':r.status===403?'Google API 사용 설정과 접근 권한을 확인하세요.':`Google 요청 실패 (${r.status}). 다시 시도하세요.`);e.status=502;e.code='GOOGLE_ERROR';if(r.status===410)e.resetSync=true;throw e;}return r.json();}
 async function access() {const c=config();requireValue(c.refreshToken,'Google 계정을 먼저 연결하세요.',409,'NOT_CONNECTED');const t=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret||'',refresh_token:c.refreshToken,grant_type:'refresh_token'})});return t.access_token;}
 const get=(path,token)=>json('https://www.googleapis.com/'+path,{headers:{Authorization:'Bearer '+token}});
 return {
  status(){const c=config();return {account:ACCOUNT,connected:!!c.refreshToken,clientConfigured:!!c.clientId,calendarOnly:!!c.calendarOnly,email:c.email||null,gmailIntervalMinutes:60,calendarIntervalSeconds:60};},
  configure(body){requireValue(typeof body.clientId==='string'&&body.clientId.endsWith('.apps.googleusercontent.com'),'Google 데스크톱 OAuth 클라이언트 ID를 입력하세요.');requireValue(!body.clientSecret||typeof body.clientSecret==='string'&&body.clientSecret.length<500,'클라이언트 시크릿을 확인하세요.');repo.saveConfig(owner,'google',{clientId:body.clientId.trim(),clientSecret:body.clientSecret||''});},
  connect(origin,session,{calendarOnly=false}={}){const c=config();requireValue(c.clientId,'Google OAuth 클라이언트를 먼저 설정하세요.',409);for(const [key,value]of pending)if(value.expires<Date.now())pending.delete(key);const state=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url'),redirect=origin+'/api/v1/auth/google/callback';pending.set(state,{verifier,redirect,expires:Date.now()+600000,session,calendarOnly});return {url:'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:c.clientId,redirect_uri:redirect,response_type:'code',scope:calendarOnly?'openid email https://www.googleapis.com/auth/calendar.readonly':SCOPES,access_type:'offline',prompt:'consent',login_hint:ACCOUNT,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'})};},
  async callback(url,validSession){const state=url.searchParams.get('state'),p=pending.get(state);pending.delete(state);requireValue(p&&p.expires>Date.now()&&validSession(p.session),'인증 요청이 만료되었습니다. 다시 연결하세요.',403);requireValue(!url.searchParams.has('error'),'Google 연결이 취소되었습니다.',400);const c=config(),t=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret||'',code:url.searchParams.get('code'),code_verifier:p.verifier,redirect_uri:p.redirect,grant_type:'authorization_code'})});const profile=p.calendarOnly?await json('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+t.access_token}}):await get('gmail/v1/users/me/profile',t.access_token);requireValue((!p.calendarOnly||profile.email_verified===true)&&(profile.emailAddress||profile.email)?.toLowerCase()===ACCOUNT,'요청한 Google 계정과 다릅니다. charlie.sungjin@gmail.com으로 연결하세요.',403,'ACCOUNT_MISMATCH');requireValue(t.refresh_token||c.refreshToken,'오프라인 접근을 허용하고 다시 연결하세요.',409);repo.saveConfig(owner,'google',{...c,refreshToken:t.refresh_token||c.refreshToken,email:ACCOUNT,calendarOnly:p.calendarOnly});return {ok:true,calendarOnly:p.calendarOnly};},
  disconnect(){previews.clear();const c=config();repo.saveConfig(owner,'google',{clientId:c.clientId,clientSecret:c.clientSecret});repo.saveConfig(owner,'google-calendar-cursor',{});},
  async preview(body,session){
   const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
   requireValue(valid(body.from)&&valid(body.to),'시작일과 종료일을 확인하세요.');
   const start=Date.parse(body.from+'T00:00:00+09:00'),end=Date.parse(body.to+'T00:00:00+09:00')+86400000;
   requireValue(end>start&&end-start<=366*86400000,'가져올 기간은 최대 366일입니다.');
   const token=await access();let next='',events=[];
   for(let page=0;page<4;page++){
    const q=new URLSearchParams({timeMin:new Date(start).toISOString(),timeMax:new Date(end).toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'250',showDeleted:'false',...(next?{pageToken:next}:{})});
    const result=await get('calendar/v3/calendars/primary/events?'+q,token);
    for(const e of result.items||[]){if(e.status==='cancelled'||!e.start||!e.end)continue;events.push({kind:'event',externalId:e.id,title:(e.summary||'제목 없는 일정').slice(0,160),startsAt:new Date(e.start.dateTime||e.start.date+'T00:00:00+09:00').toISOString(),endsAt:new Date(e.end.dateTime||e.end.date+'T00:00:00+09:00').toISOString(),details:String(e.description||'').slice(0,2000),location:String(e.location||'').slice(0,300),allDay:!!e.start.date});}
    next=result.nextPageToken||'';if(!next)break;
   }
   for(const [id,p]of previews)if(p.expires<Date.now())previews.delete(id);requireValue(previews.size<20,'미리보기 요청이 많습니다. 잠시 후 다시 시도하세요.',429);
   const previewId=randomBytes(24).toString('hex');previews.set(previewId,{session,events,expires:Date.now()+600000});
   return {previewId,events,moreAvailable:!!next};
  },
  importPreview(body,session){const p=previews.get(body.previewId);requireValue(p&&p.session===session&&p.expires>Date.now(),'미리보기가 만료되었습니다. 다시 조회하세요.',409);requireValue(Array.isArray(body.ids)&&body.ids.length>0&&body.ids.length<=1000,'저장할 일정을 선택하세요.');const ids=new Set(body.ids);requireValue(body.ids.every(id=>p.events.some(e=>e.externalId===id)),'선택한 일정을 확인하세요.');const result=inputs.ingest('google-calendar',p.events.filter(e=>ids.has(e.externalId)),{auto:true});previews.delete(body.previewId);return result;},
  async gmail(){const token=await access();let next='',total={applied:0,pending:0,skipped:0,messages:0};for(let page=0;page<10;page++){const q=new URLSearchParams({q:'in:inbox newer_than:7d',maxResults:'100',...(next?{pageToken:next}:{})}),list=await get('gmail/v1/users/me/messages?'+q,token);for(const m of list.messages||[]){if(repo.proposals(owner).some(p=>p.sourceKey.startsWith('gmail:'+m.id+':'))) {total.skipped++;continue;}const email=await get(`gmail/v1/users/me/messages/${encodeURIComponent(m.id)}?format=full`,token);total.messages++;const result=inputs.ingest('gmail',gmailCandidates(email,m.id));for(const k of ['applied','pending','skipped'])total[k]+=result[k];}next=list.nextPageToken;if(!next)break;}return {...total,moreAvailable:!!next};},
  async calendar(){const token=await access();let cursor=repo.config(owner,'google-calendar-cursor')||{},next='',lastToken,total={applied:0,pending:0,skipped:0};for(let page=0;page<50;page++){const q=new URLSearchParams({maxResults:'250',singleEvents:'true',showDeleted:'true',...(cursor.syncToken?{syncToken:cursor.syncToken}:{timeMin:new Date(Date.now()-365*86400000).toISOString(),timeMax:new Date(Date.now()+730*86400000).toISOString()}),...(next?{pageToken:next}:{})});let list;try{list=await get('calendar/v3/calendars/primary/events?'+q,token);}catch(e){if(e.resetSync){repo.saveConfig(owner,'google-calendar-cursor',{});return {reset:true,...total};}throw e;}
    const candidates=[];for(const e of list.items||[]){if(e.status==='cancelled'){candidates.push({kind:'event',title:'취소된 Google 일정',externalId:e.id,status:'cancelled'});continue;}if(!e.start||!e.end)continue;const start=e.start.dateTime||e.start.date+'T00:00:00+09:00',end=e.end.dateTime||e.end.date+'T00:00:00+09:00';candidates.push({kind:'event',title:(e.summary||'Google 일정').slice(0,160),externalId:e.id,startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString()});}const result=inputs.ingest('google-calendar',candidates,{auto:true});for(const k of Object.keys(total))total[k]+=result[k];lastToken=list.nextSyncToken||lastToken;next=list.nextPageToken;if(!next)break;}
   if(!next&&lastToken)repo.saveConfig(owner,'google-calendar-cursor',{syncToken:lastToken});return {...total,moreAvailable:!!next};}
 };
}
