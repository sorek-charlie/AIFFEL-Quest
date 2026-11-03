import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {createDecipheriv} from 'node:crypto';
// Local read-only status adapter. Credentials are decrypted only to determine flags, never returned.
export function readSyncStatus(path,owner='local-owner'){
 if(!existsSync(path)||!existsSync(path+'.key')){const e=new Error('PC 앱의 저장소가 없거나 현재 실행 환경에서 접근할 수 없습니다. 앱의 데이터 위치와 로컬 실행 권한을 확인하세요.');e.code='DATA_UNAVAILABLE';throw e;}
 const key=readFileSync(path+'.key');let db;try{db=new DatabaseSync(path,{readOnly:true});}catch(cause){const e=new Error('현재 실행 환경에서 PC 앱 DB를 열 수 없습니다. 승인된 로컬 실행 권한으로 상태 명령을 다시 실행하세요.');e.code='DATA_ACCESS_DENIED';throw e;}
 try{const config=name=>{const row=db.prepare('SELECT value FROM private_config WHERE owner_id=? AND name=?').get(owner,name);if(!row)return {};const b=Buffer.from(row.value,'base64'),d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8'));};
  const c=config('sync'),g=config('google'),copy=(v,keys)=>Object.fromEntries(keys.filter(k=>v?.[k]!==undefined).map(k=>[k,v[k]]));
  return {connected:!!g.refreshToken,calendarOnly:!!g.calendarOnly,gmail:c.gmail??true,calendar:c.calendar??true,lastRun:c.lastRun||null,lastTrigger:c.lastTrigger||null,progress:Object.fromEntries(['gmail','calendar'].map(s=>[s,copy(c.progress?.[s]||(c.results?.[s]?.state==='ok'?{lastSuccessAt:c.results[s].checkedAt,coveredThrough:c.results[s].checkedAt}:{}),['lastSuccessAt','coveredThrough','lastAttemptAt','lastTrigger','attemptSlot','attempts','retryAt','blocked'])])),results:Object.fromEntries(['gmail','calendar'].map(s=>[s,copy(c.results?.[s],['state','message','checkedAt','trigger','scheduledSlot','applied','pending','skipped','messages','moreAvailable','rangeLimited','range'])]))};
 }finally{db.close();}
}
