export function isoWeek(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear(),first=new Date(Date.UTC(year,0,1,12));return {year,week:Math.ceil(((d-first)/86400000+1)/7)};}
export function weekGroups(tasks,month=null){
 const groups=new Map(),monthStart=month?month+'-01':null,monthEnd=month?new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0,12)).toISOString().slice(0,10):null;
 for(const task of [...tasks].sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.title.localeCompare(b.title))){
  let key='undated',label='날짜 미지정';
  if(task.dueDate){const date=new Date(task.dueDate+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));const start=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+6);const end=date.toISOString().slice(0,10);if(month&&(end<monthStart||start>monthEnd))continue;const annual=isoWeek(task.dueDate);key=start;label=`${annual.year}년 ${String(annual.week).padStart(2,'0')}주차 (${start} ~ ${end})`;}
  if(!groups.has(key))groups.set(key,{key,label,tasks:[]});groups.get(key).tasks.push(task);
 }
 return [...groups.values()];
}
