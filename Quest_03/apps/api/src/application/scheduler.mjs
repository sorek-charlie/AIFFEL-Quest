import { randomUUID } from 'node:crypto';
import { requireValue, title, interval, overlaps } from '../../../../packages/domain/src/index.mjs';
import {localDate,projectFields,eventDetails,projectDetails} from '../../../../packages/domain/src/tasks/classification.mjs';
export function createScheduler(repo, clock=()=>Date.now()) {
  const defaults={displayName:'이성진',timeZone:'Asia/Seoul'};
  const ensure=owner=> { if(!repo.getOwner(owner)) repo.saveOwner(owner,defaults); return repo.getOwner(owner); };
  const get=(o,k,id)=>{const e=repo.get(o,k,id);requireValue(e,'항목을 찾을 수 없습니다.',404,'NOT_FOUND');return e;};
  const version=(e,b)=>requireValue(e.version===b.expectedVersion,'다른 변경이 있습니다. 새로고침하세요.',409,'VERSION_CONFLICT');
  const check=(o,start,end,buffer=0,except)=>requireValue(!repo.list(o,'event').filter(e=>e.id!==except).some(e=>overlaps({start:start-buffer*60000,end:end+buffer*60000},{start:Date.parse(e.startsAt)-(e.buffer||0)*60000,end:Date.parse(e.endsAt)+(e.buffer||0)*60000})),'다른 일정과 시간이 겹칩니다.',409,'SLOT_CONFLICT');
  return {
    initialize:owner=>repo.transaction(()=>ensure(owner)),
    state(owner) {const profile=ensure(owner);return {settings:{displayName:profile.displayName,timeZone:'Asia/Seoul'},projects:repo.list(owner,'project'),tasks:repo.list(owner,'task'),events:repo.list(owner,'event')};},
    updateSettings(owner,body) {return repo.transaction(()=>{const value={displayName:title(body.displayName,60),timeZone:'Asia/Seoul'};repo.saveOwner(owner,value);return value;});},
    mutate(owner,kind,method,id,body) { return repo.transaction(()=>{
      const old=id?get(owner,kind,id):null;
      if(old) version(old,body);
      if(method==='DELETE') {if(kind==='project')requireValue(!['task','event'].some(k=>repo.list(owner,k).some(e=>e.projectId===id)),'연결된 일정·할 일의 프로젝트를 먼저 해제하세요.',409,'PROJECT_IN_USE');repo.remove(owner,kind,id);repo.audit(owner,id,'delete',clock());return {ok:true};}
      let e={id:old?.id||randomUUID(),title:title(body.title),version:(old?.version||0)+1,...(old?.sourceKey?{sourceKey:old.sourceKey,source:old.source,...(old.sourceEmail?{sourceEmail:old.sourceEmail}:{})}:{})};
      if(kind!=='project'){const projectId=body.projectId===undefined?(old?.projectId||null):(body.projectId||null);if(projectId)requireValue(repo.get(owner,'project',projectId),'프로젝트를 찾을 수 없습니다.',404,'NOT_FOUND');e.projectId=projectId;}
      if(kind==='project')Object.assign(e,projectFields(body),projectDetails(body,old));
      else if(kind==='task') {requireValue(body.completed===undefined||typeof body.completed==='boolean','완료 값을 확인하세요.');e.completed=body.completed??old?.completed??false;e.dueDate=localDate(body.dueDate===undefined?old?.dueDate:body.dueDate,true);}
      else { const [a,b]=interval(body.startsAt,body.endsAt);check(owner,a,b,0,id);Object.assign(e,{startsAt:new Date(a).toISOString(),endsAt:new Date(b).toISOString(),buffer:0},eventDetails(body,old)); }
      repo.save(owner,kind,e);repo.audit(owner,e.id,method,clock());return e;
    }); },
  };
}
