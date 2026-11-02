import {textCandidates} from './extraction.mjs';
export const mailCategories={event:'일정',schedule:'스케줄',project:'프로젝트',other:'기타',spam:'스팸 후보'};
export function classifyMail({subject='',body='',labels=[]}){
 const text=(subject+'\n'+body).slice(0,20000),dates=[...text.matchAll(/20\d{2}-\d{2}-\d{2}/g)].map(m=>m[0]);
 const event=textCandidates(text).find(c=>c.kind==='event');
 if(labels.includes('SPAM')||/(?:비밀번호|password|인증번호|otp).{0,25}(?:회신|보내|reply)|(?:당첨|상속금|고수익 보장).{0,40}(?:송금|입금|수수료)/i.test(text))return {category:'spam',reason:'계정정보 회신 또는 선입금을 요구하는 의심 문구. 원문 확인 필요',candidate:null,planDate:null};
 if(event)return {category:'event',reason:'명확한 날짜와 시각을 발견했습니다.',candidate:{...event,title:subject.slice(0,160)||event.title},planDate:new Date(Date.parse(event.startsAt)+9*3600000).toISOString().slice(0,10)};
 if(/프로젝트|project|착수|마일스톤|개발 범위|사업 계획/i.test(text))return {category:'project',reason:'프로젝트·착수·사업 범위 관련 문구. 기간 확인 필요',candidate:{kind:'project',title:subject.slice(0,160)||'메일 프로젝트',startsOn:dates[0]||null,endsOn:dates[1]||null},planDate:dates[0]||null};
 if(/제출|마감|검토.{0,8}요청|회신.{0,8}(요청|부탁)|작성.{0,8}(요청|필요)|해야|to[- ]?do|action required|deadline|please review/i.test(text))return {category:'schedule',reason:'수행·제출·검토 요청을 발견했습니다. 기한 확인 필요',candidate:{kind:'task',title:subject.slice(0,160)||'메일 할 일',dueDate:dates[0]||null},planDate:dates[0]||null};
 return {category:'other',reason:'명확한 일정·실행 요청·프로젝트 근거가 없어 기타로 분류했습니다.',candidate:null,planDate:null};
}
export function orderMailRows(rows,today){
 const group=r=>r.planDate?(r.planDate>=today?0:2):1;
 return [...rows].sort((a,b)=>group(a)-group(b)||(group(a)===0?a.planDate.localeCompare(b.planDate):group(a)===2?b.planDate.localeCompare(a.planDate):0)||b.receivedAt.localeCompare(a.receivedAt)||a.id.localeCompare(b.id));
}
