import {publicPlans} from './public-plans.mjs';
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function viewerHandle(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/v1/viewer/'))return null;
 const route=url.pathname.slice('/api/v1/viewer/'.length);
 // Public assessment view: no password or owner session, and no mutation routes.
 if(request.method!=='GET')return json({error:{code:'READ_ONLY',message:'열람 전용입니다. 입력·수정·삭제할 수 없습니다.'}},403);
 if(route==='session')return json({signedIn:true,passwordRequired:false,mode:'read-only'});
 if(route==='state'){try{
  const row=await env.DB?.prepare('SELECT data,updated_at FROM public_state WHERE id=?').bind('viewer-live').first();
  if(!row)return json({error:{message:'아직 공개된 자료가 없습니다. PC에서 공개 자료를 반영해 주세요.'}},503);
  const shared=JSON.parse(row.data),heartbeat=await env.DB.prepare('SELECT data,updated_at FROM public_state WHERE id=?').bind('owner-relay').first();
  const live=!!heartbeat&&Date.now()-heartbeat.updated_at<=20000&&JSON.parse(heartbeat.data).instanceId===shared.instanceId;
  return json({...publicPlans(shared.plans,shared.plans.updatedAt),live,passwordRequired:false,retained:true});
 }catch{return json({error:{message:'자료를 불러오지 못했습니다. 다시 확인해 주세요.'}},503);}}
 return json({error:{message:'찾을 수 없습니다.'}},404);
}
