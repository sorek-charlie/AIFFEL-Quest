import {randomUUID} from 'node:crypto';
import {requireValue} from '../../../../packages/domain/src/index.mjs';
import {localDate} from '../../../../packages/domain/src/tasks/classification.mjs';
import {classifyMail,mailCategories,orderMailRows} from '../../../../packages/domain/src/tasks/mail-triage.mjs';
export function createMailReview({repo,owner,inputs,provider}){
 let job=null,busy=false,actionBusy=false;
 const state=()=>repo.config(owner,'gmail-review')||{rows:[],from:null,to:null};
 const save=s=>repo.saveConfig(owner,'gmail-review',s);
 async function execute(body){
  try{const remote=await provider(),min=Date.parse(body.from+'T00:00:00+09:00'),max=Date.parse(body.to+'T00:00:00+09:00')+86400000;
   const result=await remote.list({query:`in:inbox after:${Math.floor(min/1000)-1} before:${Math.floor(max/1000)}`,limit:body.limit});
   job.total=result.ids.length;const messages=[];let cursor=0,failures=0,lastError=null;
   const results=await Promise.allSettled(Array.from({length:Math.min(2,result.ids.length)},async()=>{while(cursor<result.ids.length){const id=result.ids[cursor++];try{messages.push(await remote.read(id));}catch(e){failures++;lastError=e;}finally{job.completed++;}await new Promise(r=>setTimeout(r,200));}}));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
   if(!messages.length&&failures)throw lastError;
   const old=new Map(state().rows.map(r=>[r.id,r]));const rows=messages.filter(m=>Date.parse(m.receivedAt)>=min&&Date.parse(m.receivedAt)<max).map(m=>{const analysis=classifyMail({subject:m.subject,body:m.body,labels:m.labels});return {...m,body:m.body.slice(0,6000),...analysis,state:old.get(m.id)?.state||'pending'};});
   save({rows,from:body.from,to:body.to,truncated:result.truncated,failures,checkedAt:new Date().toISOString()});job.state='done';
  }catch(e){job.state='error';job.error=e.status?e.message:'메일 조회에 실패했습니다. 연결과 권한을 확인하세요.';}finally{busy=false;}
 }
 return {
  status({category='all',page=1}={}){const s=state(),today=new Date(Date.now()+9*3600000).toISOString().slice(0,10),ordered=orderMailRows(s.rows,today),counts={all:ordered.length};for(const c of Object.keys(mailCategories))counts[c]=ordered.filter(r=>r.category===c).length;const filtered=category==='all'?ordered:ordered.filter(r=>r.category===category);const n=Math.max(1,Number(page)||1);return {job,from:s.from,to:s.to,checkedAt:s.checkedAt,truncated:s.truncated,failures:s.failures||0,counts,total:filtered.length,page:n,rows:filtered.slice((n-1)*20,n*20)};},
  start(body){requireValue(!busy&&!actionBusy,'메일을 확인 중입니다. 잠시 기다려 주세요.',409);const from=localDate(body.from),to=localDate(body.to),days=(Date.parse(to)-Date.parse(from))/86400000;requireValue(days>=0&&days<=365,'조회 기간은 최대 366일입니다.');const limit=Number(body.limit||100);requireValue([50,100,200,500].includes(limit),'조회 개수를 확인하세요.');repo.saveConfig(owner,'gmail-review-enabled',{enabled:true});busy=true;job={id:randomUUID(),state:'running',completed:0,total:0};void execute({from,to,limit});return {...job};},
  async action(id,b){requireValue(!busy&&!actionBusy,'메일 조회가 끝난 뒤 처리하세요.',409);const s=state(),row=s.rows.find(r=>r.id===id);requireValue(row,'메일을 찾을 수 없습니다.',404);requireValue(row.state==='pending','이미 처리한 메일입니다.',409);requireValue(Object.hasOwn(mailCategories,b.category),'분류를 선택하세요.');actionBusy=true;try{
   if(b.category==='spam'){requireValue(b.confirmSpam===true,'스팸함 이동을 확인하세요.');const remote=await provider();await remote.spam(row.id);row.state='spam_moved';}
   else if(b.category==='other')row.state='reviewed';
   else{const kind=b.category==='event'?'event':b.category==='project'?'project':'task';const sourceEmail={messageId:row.id,threadId:row.threadId,account:'charlie.sungjin@gmail.com',subject:row.subject,from:row.from,to:row.to,excerpt:row.body.slice(0,2000)};inputs.ingest('gmail',[{...row.candidate,kind,title:b.title||row.subject||'메일 항목',externalId:row.id+':triage',sourceEmail,details:row.body.slice(0,2000)}]);const proposal=inputs.list().find(p=>p.sourceKey==='gmail:'+row.id+':triage');if(proposal)inputs.confirm(proposal.id,{...b,title:b.title||row.subject||'메일 항목',kind});row.state='saved';}
   row.category=b.category;row.planDate=b.category==='event'?new Date(Date.parse(b.startsAt)+9*3600000).toISOString().slice(0,10):b.category==='project'?b.startsOn:b.category==='schedule'?(b.dueDate||null):null;save(s);return {ok:true,state:row.state};}finally{actionBusy=false;}
  }
 };
}
