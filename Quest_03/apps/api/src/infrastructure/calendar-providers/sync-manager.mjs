import {nextGoogleSync,googleSyncTimes} from './google-schedule.mjs';
import {requireValue} from '../../../../../packages/domain/src/index.mjs';
export function createSyncManager(repo,owner,google,inputs,{manualOnly=false,now=()=>Date.now()}={}) {
 let busy=false,closed=false,nextDue=nextGoogleSync(now());const timers=[];
 function read(){const c=repo.config(owner,'sync')||{};return {gmail:c.gmail??true,calendar:c.calendar??true,results:Object.fromEntries(Object.entries(c.results||{}).filter(([s])=>['gmail','calendar'].includes(s))),...(c.lastRun?{lastRun:c.lastRun}:{}),...(c.lastScheduledSlot?{lastScheduledSlot:c.lastScheduledSlot}:{})};}
 const status=()=>({...read(),google:google.status(),busy,appMustRemainRunning:true,calendarRealtime:false,scheduledTimes:googleSyncTimes,timeZone:'Asia/Seoul'});
 function configure(b){requireValue(typeof b.gmail==='boolean'&&typeof b.calendar==='boolean','Google 확인 설정을 확인하세요.');requireValue(!b.kakaoFile&&!b.phoneFile,'Google 연결만 지원합니다.');repo.saveConfig(owner,'sync',{...read(),gmail:b.gmail,calendar:b.calendar});return status();}
 async function run(which='all'){
  requireValue(['all','gmail','calendar'].includes(which),'지원하지 않는 연동입니다.',404,'NOT_FOUND');requireValue(!busy,'동기화가 진행 중입니다.',409,'SYNC_BUSY');busy=true;const results={};
  try{const c=read();for(const source of ['gmail','calendar']){if(which!=='all'&&which!==source)continue;
   try{if(source==='gmail'&&google.status().calendarOnly){results[source]={state:'not_connected',message:'Gmail 권한을 추가 연결하세요.'};continue;}
    if(!c[source]||!google.status().connected){results[source]={state:'not_connected',message:'Google 계정 연결과 확인 설정이 필요합니다.'};continue;}
    results[source]={state:'ok',...await google[source](),checkedAt:new Date().toISOString()};
   }catch(e){results[source]={state:'error',message:e.status?e.message:'Google 연결을 확인하세요.',checkedAt:new Date().toISOString()};}
  }repo.saveConfig(owner,'sync',{...read(),results:{...read().results,...results},lastRun:new Date().toISOString()});return results;}finally{busy=false;}
 }
 async function checkScheduled(){if(closed||busy||now()<nextDue.at)return false;const slot=nextDue;nextDue=nextGoogleSync(now()+1);if((read().lastScheduledSlot||'')>=slot.key)return false;repo.saveConfig(owner,'sync',{...read(),lastScheduledSlot:slot.key});await run('all');return true;}
 if(!manualOnly){const timer=setInterval(()=>checkScheduled().catch(()=>{}),15000);timer.unref();timers.push(timer);}
 return {status,configure,run,checkScheduled,close(){closed=true;timers.forEach(clearInterval);}};
}
