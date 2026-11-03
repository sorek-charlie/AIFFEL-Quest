import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {homedir} from 'node:os';
import {readSyncStatus} from '../apps/api/src/infrastructure/persistence/sqlite/sync-status.mjs';
import {latestGoogleSync,nextGoogleSync} from '../apps/api/src/infrastructure/calendar-providers/google-schedule.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),recover=args.includes('--recover'),waitIndex=args.indexOf('--wait-seconds'),seconds=waitIndex<0?120:Number(args[waitIndex+1]);
if(!Number.isInteger(seconds)||seconds<1||seconds>300)throw Error('대기 시간은 1~300초입니다.');
// Windows app-container shells redirect LOCALAPPDATA; the PC launcher uses the real user profile.
const localAppData=process.platform==='win32'&&/[\\/]Packages[\\/]sandbox\./i.test(process.env.LOCALAPPDATA||'')?resolve(homedir(),'AppData/Local'):process.env.LOCALAPPDATA;
const data=process.env.ORBIT_DATA_DIR||(localAppData?resolve(localAppData,'ORBIT Scheduler/data'):resolve(root,'runtime/data')),path=resolve(data,'orbit.db');
const slot=latestGoogleSync(Date.now()),due=s=>['gmail','calendar'].filter(k=>s[k]&&!(Date.parse(s.progress[k].coveredThrough||'')>=slot.at));
try{
 let s=readSyncStatus(path);if(recover&&!s.connected)throw Error('PC 앱에서 Google 계정을 먼저 연결하세요.');
 const initial=due(s);
 if(recover&&initial.length){let running=false;try{running=(await fetch('http://127.0.0.1:18701/api/v1/auth/session',{signal:AbortSignal.timeout(1500)})).ok;}catch{}
  if(!running){const exe=resolve(root,"Charlie's Scheduler.exe");if(!existsSync(exe))throw Error('실행파일이 없습니다. npm run build:exe 후 다시 실행하세요.');const child=spawn(exe,[],{cwd:root,detached:true,windowsHide:true,stdio:'ignore'});child.on('error',()=>{});child.unref();}
  const deadline=Date.now()+seconds*1000;while(Date.now()<deadline&&due(s).length){await new Promise(r=>setTimeout(r,1000));s=readSyncStatus(path);const left=due(s);if(left.every(k=>s.progress[k].blocked||s.progress[k].attemptSlot===slot.key&&s.progress[k].attempts>=3))break;}
 }
 const outstanding=due(s);console.log(JSON.stringify({mode:recover?'recover':'status',...s,targetSlot:slot.key,nextScheduledAt:new Date(nextGoogleSync(Date.now()+1).at).toISOString(),outstanding,completed:recover?s.connected&&outstanding.length===0:null,note:'PC 앱이 조회를 수행합니다. 이 도구는 상태만 읽고, 앱이 꺼져 있으면 실행파일을 시작합니다. 비밀값·메일 원문은 출력하지 않습니다.'},null,2));if(recover&&outstanding.length)process.exitCode=2;
}catch(e){console.error(JSON.stringify({error:e.message,...(e.code?{code:e.code}:{})}));process.exitCode=1;}
