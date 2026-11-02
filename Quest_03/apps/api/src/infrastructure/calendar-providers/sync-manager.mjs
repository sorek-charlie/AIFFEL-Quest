import {readFileSync,realpathSync,statSync} from 'node:fs';
import {extname,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {requireValue} from '../../../../../packages/domain/src/index.mjs';
import {parseIcs,textCandidates} from '../../../../../packages/domain/src/tasks/extraction.mjs';
export function createSyncManager(repo,owner,google,inputs,{manualOnly=false}={}) {
 let busy=false,closed=false,lastPhoneStamp='';const timers=[];
 const read=()=>repo.config(owner,'sync')||{gmail:true,calendar:true,kakaoFile:'',phoneFile:'',results:{}};
 function status(){const c=read();return {...c,google:google.status(),busy,appMustRemainRunning:true,kakaoMode:'export-file-only',phoneMode:'google-calendar-or-ics',calendarRealtime:false};}
 function configure(b){requireValue(typeof b.gmail==='boolean'&&typeof b.calendar==='boolean','동기화 설정을 확인하세요.');const c=read();for(const field of ['kakaoFile','phoneFile']){if(b[field]){requireValue(typeof b[field]==='string'&&isAbsolute(b[field]),'내보낸 파일의 전체 경로를 입력하세요.');const path=realpathSync(b[field]);requireValue(statSync(path).isFile()&&extname(path).toLowerCase()===(field==='phoneFile'?'.ics':'.txt'),'카카오는 TXT, 휴대폰은 ICS 파일을 선택하세요.');c[field]=path;}else c[field]='';}repo.saveConfig(owner,'sync',{...c,gmail:b.gmail,calendar:b.calendar});return status();}
 async function run(which='all') {
  requireValue(!busy,'동기화가 진행 중입니다. 잠시 후 다시 시도하세요.',409,'SYNC_BUSY');busy=true;
  const results={};
  try {
   const c=read();for(const source of ['gmail','calendar','kakao','phone']){
    if(which!=='all'&&which!==source)continue;
    try{
     let result;
     if(source==='gmail'||source==='calendar'){
      if(source==='gmail'&&repo.config(owner,'gmail-review-enabled')?.enabled){results[source]={state:'manual_only',message:'기간 지정 Gmail 분류 화면에서 조회하세요.'};continue;}
      if(google.status().calendarOnly){results[source]={state:'manual_only',message:'Google 일정 전용 연결입니다. 전용 화면에서 미리보기 후 저장하세요.'};continue;}
      if((which!=='all'&&!c[source])||!google.status().connected){results[source]={state:'not_connected',message:'Google 계정 연결 또는 자동 확인 설정이 필요합니다.'};continue;}
      result=await google[source]();
     }else{
      const path=c[source+'File'];if(!path){results[source]={state:'not_connected',message:source==='kakao'?'카카오톡 내보내기 TXT 미선택. Android 알림 앱은 별도 설치가 필요합니다.':'Google 캘린더 연결 또는 ICS 파일 선택이 필요합니다.'};continue;}
      requireValue(statSync(path).size<=8*1024*1024,'연동 파일은 8MB 이하여야 합니다.');const bytes=readFileSync(path),fingerprint=createHash('sha256').update(bytes).digest('hex'),previous=c.results?.[source];
      if(previous?.fingerprint===fingerprint){results[source]={state:'unchanged',fingerprint};continue;}
      let text=bytes.toString('utf8');if(text.includes('\ufffd'))text=new TextDecoder('euc-kr').decode(bytes);
      result=inputs.ingest(source,source==='phone'?parseIcs(text):textCandidates(text.split(/\r?\n/).slice(-100).join('\n')),{auto:source==='phone'});result.fingerprint=fingerprint;
     }
     results[source]={state:'ok',...result,checkedAt:new Date().toISOString()};
    }catch(e){results[source]={state:'error',message:e.status?e.message:'연동 원본에 접근할 수 없습니다. 연결과 파일 경로를 확인하세요.',checkedAt:new Date().toISOString()};}
   }
   const latest=read();repo.saveConfig(owner,'sync',{...latest,results:{...latest.results,...results},lastRun:new Date().toISOString()});return results;
  }finally{busy=false;}
 }
 function every(ms,fn){if(manualOnly)return;const timer=setInterval(()=>{if(!closed&&!busy)fn().catch(()=>{});},ms);timer.unref();timers.push(timer);}
 every(3600000,async()=>{await run('gmail');await run('kakao');});
 every(60000,()=>run('calendar'));
 every(2000,()=>{const c=read();if(!c.phoneFile)return Promise.resolve();let stamp;try{stamp=c.phoneFile+':'+statSync(c.phoneFile).mtimeMs;}catch{return Promise.resolve();}if(stamp===lastPhoneStamp)return Promise.resolve();lastPhoneStamp=stamp;return run('phone');});
 return {status,configure,run,close(){closed=true;timers.forEach(clearInterval);}};
}
