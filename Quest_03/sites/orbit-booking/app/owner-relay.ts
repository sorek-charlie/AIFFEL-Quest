import {publicPlans} from './public-plans.mjs';
import {seal,open} from './relay-crypto.mjs';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).join(',');
export async function ownerRelay(request:Request,env:any):Promise<Response|null>{
 const url=new URL(request.url),p=url.pathname,db=env.DB,secret=env.CLOUD_SYNC_KEY,now=Date.now();
 const bridge=p==='/api/v1/bridge/owner';
 const allowed=/^\/api\/v1\/(owner\/[a-zA-Z0-9/_-]+|auth\/(session|login|logout|change-password))$/.test(p);
 if(!bridge&&!allowed)return null;
 if(!db||!secret)return json({error:{message:'관리자 연결을 준비하고 있습니다.'}},503);
 try{
  if(bridge){
   if(request.method!=='POST'||await digest(request.headers.get('authorization')||'')!==await digest('Bearer '+secret))return json({error:{message:'인증이 필요합니다.'}},401);
   const raw=await request.text();if(raw.length>2000000)return json({error:{message:'요청이 큽니다.'}},413);const body=JSON.parse(raw),queries=[];
   if(!/^[0-9a-f-]{36}$/.test(body.instanceId||''))return json({error:{message:'PC 프로그램을 최신 버전으로 재시작하세요.'}},409);
   const lease=await db.prepare('INSERT INTO public_state(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at WHERE public_state.updated_at<? OR public_state.data=excluded.data RETURNING id').bind('owner-relay',JSON.stringify({instanceId:body.instanceId}),now,now-15000).first();
   if(!lease)return json({error:{message:'이미 연결된 PC 프로그램이 있습니다.'}},409);
   if(body.viewerSharing===false)queries.push(db.prepare('DELETE FROM public_state WHERE id=?').bind('viewer-live'));
   if(body.viewerSharing===true&&body.viewerState){const plans=publicPlans(body.viewerState,new Date(now).toISOString());queries.push(db.prepare('INSERT INTO public_state(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind('viewer-live',JSON.stringify({instanceId:body.instanceId,plans}),now));}
   for(const item of (body.completed||[]).slice(0,8)){if(!/^[0-9a-f-]{36}$/.test(item.id)||typeof item.payload?.data!=='string'||item.payload.data.length>1500000)continue;queries.push(db.prepare("UPDATE owner_relay SET response=?,state='done' WHERE id=? AND state='running'").bind(JSON.stringify(item.payload),item.id));}
   queries.push(db.prepare('DELETE FROM owner_relay WHERE expires_at<?').bind(now-60000));await db.batch(queries);
   const jobs=await db.prepare("UPDATE owner_relay SET state='running' WHERE id IN (SELECT id FROM owner_relay WHERE state='queued' AND expires_at>? ORDER BY rowid LIMIT 8) RETURNING id,payload").bind(now).all();
   return json({viewerPublished:body.viewerSharing===true&&!!body.viewerState,requests:(jobs.results||[]).map((r:any)=>({id:r.id,payload:JSON.parse(r.payload)}))});
  }
  if(!['GET','POST','PUT','PATCH','DELETE'].includes(request.method))return json({error:{message:'허용되지 않은 요청입니다.'}},405);
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:{message:'같은 관리자 페이지에서 요청하세요.'}},403);
  if(p.startsWith('/api/v1/owner/')&&!/(?:^|;\s*)orbit=[a-f0-9]{64}(?:;|$)/.test(request.headers.get('cookie')||''))return json({error:{message:'비밀번호를 입력해 로그인하세요.'}},401);
  // Setup and OAuth browser redirects stay local. They must never accept remote setup tokens.
  if(p.includes('/integrations/google/connect'))return json({error:{message:'Google 최초 연결은 PC에서 진행하세요.'}},400);
  const ip=request.headers.get('cf-connecting-ip')||'unknown',login=p.endsWith('/login')||p.endsWith('/change-password'),key=await digest('owner:'+ip+':'+Math.floor(now/60000)+':'+login);
  const rate=await db.prepare('INSERT INTO rate_limits(id,hits,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,now+120000).first();if(rate.hits>(login?5:240))return json({error:{message:'요청이 많습니다. 잠시 뒤 다시 시도하세요.'}},429);
  const heartbeat=await db.prepare('SELECT updated_at FROM public_state WHERE id=?').bind('owner-relay').first();if(!heartbeat||now-heartbeat.updated_at>15000)return json({error:{message:'PC 프로그램을 켜고 인터넷 연결을 확인하세요.'}},503);
  let body={};if(request.method!=='GET'){if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({error:{message:'JSON 입력이 필요합니다.'}},415);const raw=await request.text();if(raw.length>262144)return json({error:{message:'외부 업로드는 256KB 이하만 지원합니다. 큰 파일은 PC에서 가져오세요.'}},413);body=JSON.parse(raw);}
  const id=crypto.randomUUID(),cookie=request.headers.get('cookie')?.match(/(?:^|;\s*)orbit=[a-f0-9]{64}(?:;|$)/)?.[0]?.replace(/^;\s*|;$/g,'')||'';
  const encrypted=await seal(secret,id+':request',{path:p,method:request.method,body,cookie,idempotencyKey:request.headers.get('idempotency-key')});
  await db.prepare("INSERT INTO owner_relay(id,state,payload,expires_at) VALUES(?,'queued',?,?)").bind(id,JSON.stringify(encrypted),now+25000).run();
  for(let attempt=0;attempt<32;attempt++){
   await new Promise(resolve=>setTimeout(resolve,600));const row=await db.prepare('SELECT response FROM owner_relay WHERE id=?').bind(id).first();
   if(row?.response){const result=await open(secret,id+':response',JSON.parse(row.response));await db.prepare('DELETE FROM owner_relay WHERE id=?').bind(id).run();const headers:any={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(result.cookie&&/^orbit=/.test(result.cookie))headers['Set-Cookie']=result.cookie+'; Secure';return new Response(result.body,{status:result.status,headers});}
  }
  // Cancel unclaimed work. A claimed mutation may have completed: refresh rather than replay.
  await db.prepare("DELETE FROM owner_relay WHERE id=? AND state='queued'").bind(id).run();return json({error:{message:'PC 응답 시간이 초과되었습니다. 목록을 새로고침해 처리 결과부터 확인하세요.'}},504);
 }catch{return json({error:{message:'관리자 연결 오류입니다. 잠시 후 다시 시도하세요.'}},503);}
}
