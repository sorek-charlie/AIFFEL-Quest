import {nextGoogleSync,latestGoogleSync,googleSyncTimes} from './google-schedule.mjs';
import {requireValue} from '../../../../../packages/domain/src/index.mjs';
const sources=['gmail','calendar'],retryDelays=[30000,120000];
export function createSyncManager(repo,owner,google,inputs,{manualOnly=false,now=()=>Date.now()}={}) {
 let busy=false,closed=false,active=null,queued=new Set(),permissionChecked=false;const timers=[];
 function read(){const c=repo.config(owner,'sync')||{};return {gmail:c.gmail??true,calendar:c.calendar??true,results:Object.fromEntries(Object.entries(c.results||{}).filter(([s])=>sources.includes(s))),progress:c.progress||{},...(c.lastRun?{lastRun:c.lastRun}:{}),...(c.lastScheduledSlot?{lastScheduledSlot:c.lastScheduledSlot}:{}),...(c.lastTrigger?{lastTrigger:c.lastTrigger}:{})};}
 function progress(c,source){return c.progress[source]||((c.results[source]?.state==='ok'&&c.results[source].checkedAt)?{lastSuccessAt:c.results[source].checkedAt,coveredThrough:c.results[source].checkedAt}:{});}
 const status=()=>({...read(),google:google.status(),busy,queued:[...queued],appMustRemainRunning:true,calendarRealtime:false,startupRecovery:true,scheduledTimes:googleSyncTimes,timeZone:'Asia/Seoul',nextScheduledAt:new Date(nextGoogleSync(now()+1).at).toISOString(),latestScheduledSlot:latestGoogleSync(now()).key});
 function configure(b){requireValue(typeof b.gmail==='boolean'&&typeof b.calendar==='boolean','Google 확인 설정을 확인하세요.');requireValue(!b.kakaoFile&&!b.phoneFile,'Google 연결만 지원합니다.');repo.saveConfig(owner,'sync',{...read(),gmail:b.gmail,calendar:b.calendar});return status();}
 async function execute(selected,reason){
  busy=true;const results={};
  try{for(const source of selected){if(closed)break;const c=read(),previous=progress(c,source),started=now(),slot=latestGoogleSync(started),revision=google.status().connectionRevision||null;
   const attempts=previous.attemptSlot===slot.key&&previous.connectionRevision===revision?(previous.attempts||0)+1:1;
   repo.saveConfig(owner,'sync',{...c,progress:{...c.progress,[source]:{...previous,attemptSlot:slot.key,attempts,connectionRevision:revision,lastAttemptAt:new Date(started).toISOString(),lastTrigger:reason,retryAt:null}},results:{...c.results,[source]:{state:'running',trigger:reason,scheduledSlot:slot.key,checkedAt:new Date(started).toISOString()}}});
   let result;try{
    if(!c[source]||!google.status().connected||(source==='gmail'&&google.status().calendarOnly))result={state:'not_connected',message:'Google 계정 연결·권한과 자동 확인 설정이 필요합니다.'};
    else{const value=await google[source]({since:previous.coveredThrough||previous.lastSuccessAt||null});result={...value,state:value.moreAvailable||value.reset||value.rangeLimited?'partial':'ok',...(value.moreAvailable||value.reset||value.rangeLimited?{message:'조회 범위·페이지 한도 또는 커서 재설정을 확인하세요. 미완료 구간은 성공 처리하지 않았습니다.'}: {})};}
   }catch(e){result={state:'error',message:e.status?e.message:'Google 연결을 확인하세요.',...(e.reason?{reason:e.reason}:{}),...(e.authenticationRequired?{authenticationRequired:true}:{})};}
   const completed=now(),ok=result.state==='ok',blocked=result.state==='not_connected'||!!result.authenticationRequired;
   const next={...previous,attemptSlot:slot.key,attempts,connectionRevision:revision,lastAttemptAt:new Date(started).toISOString(),lastTrigger:reason,retryAt:!ok&&!blocked&&attempts<3?new Date(completed+retryDelays[attempts-1]).toISOString():null,...(ok?{lastSuccessAt:new Date(completed).toISOString(),coveredThrough:new Date(started).toISOString()}:{}),blocked};
   results[source]={...result,checkedAt:new Date(completed).toISOString(),trigger:reason,scheduledSlot:slot.key};
   const current=read();repo.saveConfig(owner,'sync',{...current,progress:{...current.progress,[source]:next},results:{...current.results,[source]:results[source]},lastRun:new Date(completed).toISOString(),lastTrigger:reason,...(ok?{lastScheduledSlot:slot.key}:{})});
  }return results;}finally{busy=false;}
 }
 async function run(which='all',{reason='manual'}={}){
  requireValue(['all',...sources].includes(which),'지원하지 않는 연동입니다.',404,'NOT_FOUND');requireValue(!closed,'앱이 종료 중입니다.',409,'SYNC_CLOSED');const selected=which==='all'?sources:[which];
  if(busy){selected.forEach(s=>queued.add(s));return {queued:true};}
  active=(async()=>{const result=await execute(selected,reason);while(!closed&&queued.size){const next=[...queued];queued.clear();await execute(next,'queued');}return result;})();return active;
 }
 async function checkScheduled(reason='scheduled'){
  if(closed||busy)return false;if(!permissionChecked&&google.status().connected&&google.status().calendarOnly&&google.detectGmailAccess){permissionChecked=true;busy=true;try{await google.detectGmailAccess();}catch{}finally{busy=false;}if(closed)return false;}const c=read(),g=google.status(),slot=latestGoogleSync(now()),revision=g.connectionRevision||null;
  if(!g.connected)return false;
  const due=sources.filter(source=>{if(!c[source])return false;const p=progress(c,source);if(Date.parse(p.coveredThrough||'')>=slot.at)return false;
   if(p.attemptSlot===slot.key&&p.connectionRevision===revision){if(p.blocked||p.attempts>=3)return false;if(p.retryAt&&Date.parse(p.retryAt)>now())return false;}return true;});
  if(!due.length)return false;active=execute(due,reason);await active;while(!closed&&queued.size){const next=[...queued];queued.clear();active=execute(next,'queued');await active;}return true;
 }
 if(!manualOnly){const start=setTimeout(()=>checkScheduled('startup').catch(()=>{}),0);start.unref();timers.push(start);const timer=setInterval(()=>checkScheduled('scheduled-or-recovery').catch(()=>{}),15000);timer.unref();timers.push(timer);}
 return {status,configure,run,checkScheduled,close(){closed=true;queued.clear();timers.forEach(t=>{clearInterval(t);clearTimeout(t);});return busy?active?.catch(()=>{}):null;}};
}
