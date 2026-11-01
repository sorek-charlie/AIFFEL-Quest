import {CLOUD_ORIGIN,cloudOrigin} from './cloud-origin.mjs';
export const DEFAULT_BOOKING_URL=CLOUD_ORIGIN;
export function createPublicCloud(repo,owner,app){
 let running=false,closed=false;const controller=new AbortController();
 const config=()=>repo.config(owner,'public-cloud')||{};
 function status(){const c=config();return {url:c.url==='https://orbit-appointments-quest03.cherrysocute9.chatgpt.site'?DEFAULT_BOOKING_URL:(c.url||DEFAULT_BOOKING_URL),configured:!!c.secret,connected:!!c.lastSync&&Date.now()-Date.parse(c.lastSync)<120000,lastSync:c.lastSync||null,error:c.error||null,enabled:app.state(owner).settings.enabled};}
 async function sync(){if(running||closed)return status();const c=config();if(!c.secret||!c.url)return status();running=true;try{
  const base=new URL(cloudOrigin(c.url));
  const state=app.state(owner),days={};if(state.settings.enabled){const start=Date.parse(new Date(Date.now()+9*3600000).toISOString().slice(0,10)+'T00:00:00Z');for(let i=0;i<31;i++){const date=new Date(start+i*86400000).toISOString().slice(0,10);days[date]={};for(const duration of [30,60,90,120,150,180])days[date][duration]=app.slots(owner,date,duration);}}
  const decisions=state.bookings.filter(b=>b.remote&&c.acked?.[b.id]!==`${b.status}:${b.version}`).slice(0,30).map(b=>({id:b.id,status:b.status,version:b.version}));
  const response=await fetch(base.origin+'/api/v1/bridge/sync',{method:'POST',headers:{Authorization:'Bearer '+c.secret,'Content-Type':'application/json'},body:JSON.stringify({profile:{enabled:state.settings.enabled,displayName:state.settings.displayName,days},decisions}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});if(!response.ok)throw new Error('예약 서버 연결 오류 ('+response.status+')');const result=await response.json();if(closed)return status();for(const item of result.requests||[])app.importRemote(owner,item);
  const current=config(),acked={...current.acked};for(const d of decisions)acked[d.id]=`${d.status}:${d.version}`;repo.saveConfig(owner,'public-cloud',{...current,acked,lastSync:new Date().toISOString(),error:null});
 }catch(error){if(!closed)repo.saveConfig(owner,'public-cloud',{...config(),error:error.message||'외부 예약 서버 연결 실패'});}finally{running=false;}return status();}
 const timer=setInterval(()=>{sync().catch(()=>{});},30000);timer.unref();
 return {status,sync,close(){closed=true;controller.abort();clearInterval(timer);}};
}
