import {ownerRelay} from './owner-relay.ts';
const enc=new TextEncoder();
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const fail=(status:number,message:string)=>{throw Object.assign(new Error(message),{status});};
const text=(v:any,max:number)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail(400,'입력 내용을 확인하세요.');return v.trim();};
async function capability(secret:string,id:string,key:string){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(id+':'+key)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function handle(request:Request,env:any){
 const owner=await ownerRelay(request,env);if(owner)return owner;
 const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 try{
  if(!env.DB||!env.CLOUD_SYNC_KEY)fail(503,'예약 연결을 준비하고 있습니다.');const db=env.DB,url=new URL(request.url),p=url.pathname,now=Date.now();let b:any={};
  if(request.method==='POST'){const raw=await request.text();if(raw.length>(p.endsWith('/bridge/sync')?2000000:16384))fail(413,'요청이 너무 큽니다.');try{b=JSON.parse(raw);}catch{fail(400,'입력 형식을 확인하세요.');}if(!b||Array.isArray(b)||typeof b!=='object')fail(400,'입력을 확인하세요.');}
  if(p==='/api/v1/bridge/sync'&&request.method==='POST'){
   const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(await hash(bearer)!==await hash(env.CLOUD_SYNC_KEY))fail(401,'연결 인증이 필요합니다.');
   const profile=b.profile;if(!profile||typeof profile.enabled!=='boolean'||typeof profile.days!=='object'||!profile.days)fail(400,'공개 시간 형식 오류');
   const safe={enabled:profile.enabled,displayName:text(profile.displayName,60),timeZone:'Asia/Seoul',duration:30,durations:[30,60,90,120,150,180],days:profile.days};
   const queries=[db.prepare('INSERT INTO public_state(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind('owner',JSON.stringify(safe),now)];
   for(const d of (b.decisions||[]).slice(0,30)){if(!['pending','confirmed','rejected','cancelled','expired'].includes(d.status)||!Number.isInteger(d.version))continue;queries.push(db.prepare('UPDATE booking_requests SET status=?,local_version=? WHERE id=? AND local_version<=?').bind(d.status,d.version,d.id,d.version));}
   queries.push(db.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now));await db.batch(queries);
   const list=await db.prepare("SELECT id,payload,expires_at FROM booking_requests WHERE status='pending' AND expires_at>? ORDER BY rowid LIMIT 100").bind(now).all();return json({requests:(list.results||[]).map((r:any)=>({...JSON.parse(r.payload),id:r.id,expiresAt:r.expires_at})),updatedAt:now});
  }
  if(!p.startsWith('/api/v1/public/'))return json({error:{code:'NOT_FOUND',message:'찾을 수 없습니다.'}},404);
  if(request.method==='POST'&&request.headers.get('origin')!==url.origin)fail(403,'같은 예약 페이지에서 신청하세요.');
  const ip=request.headers.get('cf-connecting-ip')||'visitor',key=await hash(ip+':'+Math.floor(now/60000)+':'+(p.endsWith('/requests')?'request':'read'));
  const rate=await db.prepare('INSERT INTO rate_limits(id,hits,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,now+120000).first();if(rate.hits>(p.endsWith('/requests')?12:180))fail(429,'요청이 많습니다. 잠시 뒤 다시 시도하세요.');
  if(p==='/api/v1/public/request-status'&&request.method==='POST'){const id=text(b.id,80),cap=text(b.statusCapability,128),row=await db.prepare('SELECT status,payload,expires_at,capability_hash FROM booking_requests WHERE id=?').bind(id).first();if(!row||row.capability_hash!==await hash(cap))fail(404,'요청을 찾을 수 없습니다.');const data=JSON.parse(row.payload);return json({status:row.status==='pending'&&row.expires_at<=now?'expired':row.status,startsAt:data.startsAt,endsAt:data.endsAt,timeZone:'Asia/Seoul'});}
  const saved=await db.prepare('SELECT data,updated_at FROM public_state WHERE id=?').bind('owner').first();if(!saved)fail(503,'주최자 프로그램이 아직 연결되지 않았습니다.');const profile=JSON.parse(saved.data);if(!profile.enabled)fail(404,'주최자가 예약 공유를 꺼 두었습니다.');
  if(p==='/api/v1/public/local'&&request.method==='GET')return json({displayName:profile.displayName,timeZone:'Asia/Seoul',duration:30,durations:profile.durations});
  if(now-saved.updated_at>120000)fail(503,'주최자 PC 연결을 기다리고 있습니다. 잠시 후 다시 확인하세요.');
  if(p==='/api/v1/public/local/slots'&&request.method==='GET'){const date=url.searchParams.get('date')||'',duration=Number(url.searchParams.get('duration')||30);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!profile.durations.includes(duration))fail(400,'날짜와 미팅 길이를 확인하세요.');return json((profile.days[date]?.[duration]||[]).filter((s:any)=>Date.parse(s.startsAt)>=now+2*3600000));}
  if(p==='/api/v1/public/local/requests'&&request.method==='POST'){
   const retry=text(request.headers.get('idempotency-key'),128);if(retry.length<16)fail(400,'요청 키를 확인하세요.');const retryHash=await hash(retry),bodyHash=await hash(JSON.stringify(b)),old=await db.prepare('SELECT id,body_hash,payload,expires_at FROM booking_requests WHERE retry_hash=?').bind(retryHash).first();
   if(old){if(old.body_hash!==bodyHash)fail(409,'같은 요청 키로 내용이 변경되었습니다.');const data=JSON.parse(old.payload);return json({id:old.id,status:'pending',startsAt:data.startsAt,endsAt:data.endsAt,timeZone:'Asia/Seoul',expiresAt:old.expires_at,statusCapability:await capability(env.CLOUD_SYNC_KEY,old.id,retry)},202);}
   const start=text(b.startsAt,40),duration=b.durationMinutes,date=new Date(Date.parse(start)+9*3600000);if(!Number.isFinite(date.getTime())||!profile.durations.includes(duration))fail(400,'시간을 확인하세요.');const localDate=date.toISOString().slice(0,10),slot=(profile.days[localDate]?.[duration]||[]).find((s:any)=>s.startsAt===start);if(!slot||Date.parse(start)<now+2*3600000)fail(409,'빈 시간이 변경되었습니다. 다시 선택하세요.');
   const venue=b.venue;if(!['office','zoom','other'].includes(venue))fail(400,'방문처를 선택하세요.');const venueDetails=b.venueDetails?text(b.venueDetails,200):'';if(venue==='other'&&!venueDetails)fail(400,'기타 방문처를 입력하세요.');const payload={startsAt:slot.startsAt,endsAt:slot.endsAt,durationMinutes:duration,purpose:text(b.purpose,500),venue,venueDetails,guestName:text(b.guestName,60),guestContact:text(b.guestContact,120)},id=crypto.randomUUID(),cap=await capability(env.CLOUD_SYNC_KEY,id,retry),expiresAt=Math.min(now+86400000,Date.parse(start));
   const inserted=await db.prepare('INSERT INTO booking_requests(id,retry_hash,body_hash,capability_hash,status,payload,expires_at,local_version) VALUES(?,?,?,?,?,?,?,0) ON CONFLICT(retry_hash) DO NOTHING').bind(id,retryHash,bodyHash,await hash(cap),'pending',JSON.stringify(payload),expiresAt).run();if(!inserted.meta.changes)fail(409,'이미 접수 중인 요청입니다. 같은 내용으로 다시 확인하세요.');return json({id,status:'pending',startsAt:payload.startsAt,endsAt:payload.endsAt,timeZone:'Asia/Seoul',expiresAt,statusCapability:cap},202);
  }
  return json({error:{code:'NOT_FOUND',message:'찾을 수 없습니다.'}},404);
 }catch(e:any){return json({error:{code:e.status?'BOOKING_ERROR':'INTERNAL_ERROR',message:e.status?e.message:'처리하지 못했습니다. 다시 시도하세요.'}},e.status||500);}
}
