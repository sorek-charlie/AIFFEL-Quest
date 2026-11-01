import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { requireValue, title, interval, overlaps, settings, slots } from '../../../../packages/domain/src/index.mjs';
import {localDate,projectFields,eventDetails,projectDetails} from '../../../../packages/domain/src/tasks/classification.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function createScheduler(repo, clock=()=>Date.now()) {
  const defaults={displayName:'나의 ORBIT',senderPhone:'010-9228-6269',enabled:false,startHour:9,endHour:18,duration:30,buffer:0,weekdays:[1,2,3,4,5],timeZone:'Asia/Seoul'};
  const ensure=owner=> { if(!repo.getOwner(owner)) repo.saveOwner(owner,defaults); return repo.getOwner(owner); };
  const busy=owner=>repo.list(owner,'event').map(e=>({start:Date.parse(e.startsAt)-(e.buffer||0)*60000,end:Date.parse(e.endsAt)+(e.buffer||0)*60000}));
  const get=(o,k,id)=>{const e=repo.get(o,k,id);requireValue(e,'항목을 찾을 수 없습니다.',404,'NOT_FOUND');return e;};
  const version=(e,b)=>requireValue(e.version===b.expectedVersion,'다른 변경이 있습니다. 새로고침하세요.',409,'VERSION_CONFLICT');
  const check=(o,start,end,buffer=0,except)=>requireValue(!repo.list(o,'event').filter(e=>e.id!==except).some(e=>overlaps({start:start-buffer*60000,end:end+buffer*60000},{start:Date.parse(e.startsAt)-(e.buffer||0)*60000,end:Date.parse(e.endsAt)+(e.buffer||0)*60000})),'다른 일정과 시간이 겹칩니다.',409,'SLOT_CONFLICT');
  function available(o,date,duration) { return slots(ensure(o),busy(o),date,clock(),duration); }
  function validSlot(o,start,duration) { requireValue(typeof start==='string'&&start.endsWith('Z')&&Number.isFinite(Date.parse(start)),'시간을 확인하세요.');const date=new Date(Date.parse(start)+9*3600000).toISOString().slice(0,10); const s=available(o,date,duration).find(s=>s.startsAt===start);requireValue(s,'현재 신청할 수 없는 시간입니다.',409,'SLOT_UNAVAILABLE');return s; }
  function idem(scope,key,body,fn) {
    requireValue(typeof key==='string' && key.length>=16 && key.length<=128,'요청 키를 확인하세요.');
    const keyHash=hash(key), bodyHash=hash(JSON.stringify(body)),old=repo.replay(scope,keyHash);
    if(old) { requireValue(old.body_hash===bodyHash,'요청 키가 다른 내용에 사용되었습니다.',409,'IDEMPOTENCY_MISMATCH');return JSON.parse(old.result); }
    const result=fn();repo.remember(scope,keyHash,bodyHash,result);return result;
  }
  return {
    initialize:owner=>repo.transaction(()=>ensure(owner)),
    state(owner) { return {settings:ensure(owner),projects:repo.list(owner,'project'),tasks:repo.list(owner,'task'),events:repo.list(owner,'event'),bookings:repo.list(owner,'booking').map(({capabilityHash,...b})=>({...b,status:b.status==='pending'&&b.expiresAt<=clock()?'expired':b.status}))}; },
    updateSettings(owner,body) { return repo.transaction(()=> {const s=settings(body); repo.saveOwner(owner,s); return s;}); },
    mutate(owner,kind,method,id,body) { return repo.transaction(()=>{
      const old=id?get(owner,kind,id):null;
      if(old) version(old,body);
      requireValue(kind==='task'||!old?.requestId,'예약 일정은 승인함에서 취소하세요.',409,'BOOKING_EVENT');
      if(method==='DELETE') {if(kind==='project')requireValue(!['task','event'].some(k=>repo.list(owner,k).some(e=>e.projectId===id)),'연결된 일정·할 일의 프로젝트를 먼저 해제하세요.',409,'PROJECT_IN_USE');repo.remove(owner,kind,id);repo.audit(owner,id,'delete',clock());return {ok:true};}
      let e={id:old?.id||randomUUID(),title:title(body.title),version:(old?.version||0)+1,...(old?.sourceKey?{sourceKey:old.sourceKey,source:old.source}:{})};
      if(kind!=='project'){const projectId=body.projectId===undefined?(old?.projectId||null):(body.projectId||null);if(projectId)requireValue(repo.get(owner,'project',projectId),'프로젝트를 찾을 수 없습니다.',404,'NOT_FOUND');e.projectId=projectId;}
      if(kind==='project')Object.assign(e,projectFields(body),projectDetails(body,old));
      else if(kind==='task') {requireValue(body.completed===undefined||typeof body.completed==='boolean','완료 값을 확인하세요.');e.completed=body.completed??old?.completed??false;e.dueDate=localDate(body.dueDate===undefined?old?.dueDate:body.dueDate,true);}
      else { const [a,b]=interval(body.startsAt,body.endsAt);check(owner,a,b,0,id);Object.assign(e,{startsAt:new Date(a).toISOString(),endsAt:new Date(b).toISOString(),buffer:0},eventDetails(body,old)); }
      repo.save(owner,kind,e);repo.audit(owner,e.id,method,clock());return e;
    }); },
    profile(owner) { const s=ensure(owner);requireValue(s.enabled,'공유 예약이 꺼져 있습니다.',404,'NOT_FOUND');return {displayName:s.displayName,timeZone:s.timeZone,duration:s.duration,durations:[30,60,90,120,150,180]}; },
    importRemote(owner,request) {return repo.transaction(()=>{if(repo.get(owner,'booking',request.id))return;requireValue(typeof request.id==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(request.id),'원격 요청 ID 오류');interval(request.startsAt,request.endsAt);requireValue(Number.isInteger(request.durationMinutes)&&request.durationMinutes>=30&&request.durationMinutes<=180&&request.durationMinutes%30===0&&Date.parse(request.endsAt)-Date.parse(request.startsAt)===request.durationMinutes*60000,'원격 시간 오류');repo.save(owner,'booking',{id:request.id,startsAt:request.startsAt,endsAt:request.endsAt,timeZone:'Asia/Seoul',durationMinutes:request.durationMinutes,purpose:title(request.purpose,500),venue:request.venue,venueDetails:String(request.venueDetails||'').slice(0,200),guestName:title(request.guestName,60),guestContact:title(request.guestContact,120),status:'pending',version:1,buffer:ensure(owner).buffer,expiresAt:Math.min(Number(request.expiresAt),Date.parse(request.startsAt)),remote:true});repo.audit(owner,request.id,'remote_request',clock());});},
    slots:available,
    request(owner,body,key) {return repo.transaction(()=>idem(`request:${owner}`,key,body,()=>{
      const durationMinutes=body.durationMinutes??ensure(owner).duration,s=validSlot(owner,body.startsAt,durationMinutes),name=title(body.guestName,60),contact=title(body.guestContact,120);
      const purpose=body.purpose===undefined?'미팅':title(body.purpose,500),venue=body.venue||'office';requireValue(['office','zoom','other'].includes(venue),'방문처를 선택하세요.');const venueDetails=body.venueDetails?title(body.venueDetails,200):'';requireValue(venue!=='other'||venueDetails,'기타 방문처를 입력하세요.');
      const cap=randomBytes(32).toString('hex'),id=randomUUID(),now=clock();
      const b={id,...s,durationMinutes,purpose,venue,venueDetails,guestName:name,guestContact:contact,status:'pending',version:1,buffer:ensure(owner).buffer,expiresAt:Math.min(now+86400000,Date.parse(s.startsAt)),capabilityHash:hash(cap)};
      repo.save(owner,'booking',b);repo.audit(owner,id,'request',now);
      // Adapter encrypts receipt copies; possession of the random retry key scopes replay.
      return {id,status:'pending',...s,expiresAt:b.expiresAt,statusCapability:cap};
    }));},
    decide(owner,id,action,body,key) {return repo.transaction(()=>idem(`decision:${owner}:${id}:${action}`,key,body,()=>{
      const b=get(owner,'booking',id);version(b,body);
      requireValue(['approve','reject','cancel'].includes(action),'잘못된 결정입니다.');
      requireValue(action==='cancel'?['pending','confirmed'].includes(b.status):b.status==='pending','이미 처리한 요청입니다.',409,'INVALID_STATE');
      if(action==='approve') {
        requireValue(b.expiresAt>clock(),'만료된 요청입니다.',410,'REQUEST_EXPIRED');const slot=validSlot(owner,b.startsAt,b.durationMinutes??(Date.parse(b.endsAt)-Date.parse(b.startsAt))/60000);
        requireValue(slot.endsAt===b.endsAt && ensure(owner).buffer===b.buffer,'미팅 설정이 변경되었습니다.',409,'SLOT_UNAVAILABLE');
        check(owner,Date.parse(b.startsAt),Date.parse(b.endsAt),b.buffer);
        repo.save(owner,'event',{id:b.id,title:`${b.guestName} · ${b.purpose||'미팅'}`.slice(0,160),startsAt:b.startsAt,endsAt:b.endsAt,buffer:b.buffer,requestId:b.id,venue:b.venue||'office',venueDetails:b.venueDetails||'',version:1});
      }
      if(action==='cancel'&&b.status==='confirmed') repo.remove(owner,'event',id);
      b.status={approve:'confirmed',reject:'rejected',cancel:'cancelled'}[action];b.version++;repo.save(owner,'booking',b);repo.audit(owner,id,action,clock());
      return {id:b.id,status:b.status,version:b.version};
    }));},
    status(owner,body) { const b=get(owner,'booking',body.id);requireValue(typeof body.statusCapability==='string' && hash(body.statusCapability)===b.capabilityHash,'항목을 찾을 수 없습니다.',404,'NOT_FOUND'); return {status:b.status==='pending'&&b.expiresAt<=clock()?'expired':b.status,startsAt:b.startsAt,endsAt:b.endsAt,timeZone:b.timeZone}; }
  };
}
