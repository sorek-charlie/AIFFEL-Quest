import {randomUUID,createHash} from 'node:crypto';
import {projectFields,localDate,eventDetails} from '../../../../packages/domain/src/tasks/classification.mjs';
import {requireValue,title,interval,overlaps} from '../../../../packages/domain/src/index.mjs';
export function createInputs(repo,owner) {
 const allowed=source=>['manual','gmail','google-calendar'].includes(source);
 function apply(p) {
  const old=repo.list(owner,p.kind).find(e=>e.sourceKey===p.sourceKey);
  if(p.kind==='event'){
   if(p.status==='cancelled'){if(old)repo.remove(owner,'event',old.id);return {cancelled:true};}
   const [a,b]=interval(p.startsAt,p.endsAt);
   requireValue(!repo.list(owner,'event').some(e=>e.id!==old?.id&&overlaps({start:a,end:b},{start:Date.parse(e.startsAt)-(e.buffer||0)*60000,end:Date.parse(e.endsAt)+(e.buffer||0)*60000})),'다른 일정과 충돌합니다. 시간을 조정하세요.',409,'SLOT_CONFLICT');
  }
  const e={id:old?.id||randomUUID(),title:title(p.title),sourceKey:p.sourceKey,source:p.source,projectId:p.projectId===undefined?(old?.projectId||null):p.projectId,version:(old?.version||0)+1,...(p.kind==='event'?{startsAt:p.startsAt,endsAt:p.endsAt,buffer:0}:{completed:old?.completed||false,dueDate:p.dueDate===undefined?(old?.dueDate||null):localDate(p.dueDate,true)})};
  if(p.sourceEmail)e.sourceEmail=p.sourceEmail;
  if(p.kind==='project')Object.assign(e,projectFields(p),{progress:null,notes:p.details||p.sourceEmail?.excerpt||''});
  Object.assign(e,eventDetails(p,old));
  repo.save(owner,p.kind,e);repo.audit(owner,e.id,'import',Date.now());return e;
 }
 return {
  list:()=>repo.proposals(owner).filter(p=>p.state==='pending'&&allowed(p.source)),
  ingest(source,candidates,{auto=false}={}) {
   requireValue(allowed(source),'직접 입력과 Google 가져오기만 지원합니다.');
   return repo.transaction(()=>{let applied=0,pending=0,skipped=0;const proposalIds=[];
    for(const item of candidates){const sourceKey=source+':'+(item.externalId||createHash('sha256').update(JSON.stringify(item)).digest('hex'));const known=repo.proposals(owner).find(p=>p.sourceKey===sourceKey);const fingerprint=createHash('sha256').update(JSON.stringify(item)).digest('hex');if(known?.fingerprint===fingerprint){skipped++;if(known.state==='pending')proposalIds.push(known.id);continue;}
     const p={...item,kind:['event','project'].includes(item.kind)?item.kind:'task',source,id:known?.id||randomUUID(),sourceKey,fingerprint,state:'pending'};
     if(auto){try{apply(p);p.state='applied';applied++;}catch(e){if(e.status!==409)throw e;p.error=e.message;pending++;}}else pending++;
     if(known)repo.updateProposal(owner,p);else repo.saveProposal(owner,p);if(p.state==='pending')proposalIds.push(p.id);
    }return {applied,pending,skipped,proposalIds};
   });
  },
  confirm(id,body) {return repo.transaction(()=>{const p=repo.proposal(owner,id);requireValue(p&&allowed(p.source)&&p.state==='pending','검토할 항목을 찾을 수 없습니다.',404);if(body.reject){p.state='rejected';repo.updateProposal(owner,p);return {ok:true};}requireValue(['task','event','project'].includes(body.kind),'종류를 선택하세요.');Object.assign(p,{title:title(body.title),kind:body.kind,...(body.kind==='event'?{startsAt:body.startsAt,endsAt:body.endsAt}:{})});Object.assign(p,eventDetails(body,p));if(body.kind==='task'&&body.dueDate!==undefined)p.dueDate=localDate(body.dueDate,true);if(body.kind==='project')Object.assign(p,projectFields(body));if(body.projectId)requireValue(repo.get(owner,'project',body.projectId),'프로젝트를 찾을 수 없습니다.',404);p.projectId=body.projectId||null;const e=apply(p);p.state='applied';repo.updateProposal(owner,p);return e;});}
 };
}

