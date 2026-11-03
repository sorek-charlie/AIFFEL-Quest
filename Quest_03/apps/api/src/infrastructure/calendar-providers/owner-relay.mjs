import {publicPlans} from '../../../../../packages/domain/src/tasks/public-plans.mjs';
import {seal,open} from './relay-crypto.mjs';
import {CLOUD_ORIGIN as HOST,cloudOrigin} from './cloud-origin.mjs';
export function createOwnerRelay(repo,owner,getLocalOrigin,getViewerState=null){
 let closed=false,timer,active=false,completed=[],lastShared='';const controller=new AbortController(),instanceId=crypto.randomUUID();
 async function tick(){if(closed||active)return;active=true;
  try{
   const c=repo.config(owner,'public-cloud');if(!c?.secret)return;cloudOrigin(c.url);
   const sharing=!!getViewerState&&repo.config(owner,'public-viewer-live')?.enabled===true;let shared,signature;if(sharing){shared=publicPlans(getViewerState(),new Date().toISOString());signature=JSON.stringify([shared.events,shared.tasks,shared.projects]);}const sent=completed;const r=await fetch(HOST+'/api/v1/bridge/owner',{method:'POST',headers:{Authorization:'Bearer '+c.secret,'Content-Type':'application/json'},body:JSON.stringify({instanceId,completed:sent,...(getViewerState?{viewerSharing:sharing}:{}),...(sharing&&signature!==lastShared?{viewerState:shared}:{})}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});if(!r.ok)throw new Error('relay unavailable');const result=await r.json();if(result.viewerPublished)lastShared=signature||'';completed=completed.filter(x=>!sent.some(s=>s.id===x.id));
   await Promise.all((result.requests||[]).map(async item=>{
    let response;try{const payload=await open(c.secret,item.id+':request',item.payload),p=payload.path;
     if(!/^\/api\/v1\/(owner\/|auth\/(session|login|logout|change-password)$)/.test(p)||p.includes('..')||p.includes('://'))throw new Error('invalid path');
     const origin=getLocalOrigin();if(!origin)throw new Error('PC starting');
     const headers={'Content-Type':'application/json',Origin:origin};if(payload.cookie)headers.Cookie=payload.cookie;if(payload.idempotencyKey)headers['Idempotency-Key']=payload.idempotencyKey;
     const local=await fetch(origin+p,{method:payload.method,headers,...(payload.method!=='GET'?{body:JSON.stringify(payload.body||{})}:{}),redirect:'error',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(16000)])});
     response={status:local.status,body:await local.text(),cookie:local.headers.get('set-cookie')};
    }catch{response={status:503,body:JSON.stringify({error:{message:'PC 연결을 확인하고 목록을 새로고침하세요.'}})};}
    completed.push({id:item.id,payload:await seal(c.secret,item.id+':response',response)});
   }));
  }catch{/* Offline requests expire; claimed writes are never automatically executed twice. */}finally{active=false;if(!closed)timer=setTimeout(tick,completed.length?10:1200);}
 }
 return {start(){tick();},close(){closed=true;clearTimeout(timer);controller.abort();}};
}
