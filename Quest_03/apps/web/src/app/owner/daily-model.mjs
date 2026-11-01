import {dayEvents} from '../../features/calendar/month-model.mjs';
export function dailyModel(state,date){
 const start=Date.parse(date+'T00:00:00+09:00'),events=dayEvents(state.events,date);
 return {date,events,tasks:state.tasks.filter(t=>t.dueDate===date),undated:state.tasks.filter(t=>!t.dueDate).length,projects:(state.projects||[]).filter(p=>p.status!=='completed').sort((a,b)=>a.endsOn.localeCompare(b.endsOn)),hours:Array.from({length:24},(_,hour)=>({hour,events:events.filter(e=>Math.floor((Math.max(Date.parse(e.startsAt),start)-start)/3600000)===hour),ongoing:events.filter(e=>Date.parse(e.startsAt)<start+hour*3600000&&Date.parse(e.endsAt)>start+hour*3600000&&hour>0)}))};
}
