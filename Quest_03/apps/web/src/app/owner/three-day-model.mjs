import {dailyModel} from './daily-model.mjs';
export function threeDayModel(state,date){
 const center=Date.parse(date+'T00:00:00+09:00');
 return [-1,0,1].map((offset,index)=>{
  const day=new Date(center+offset*86400000+9*3600000).toISOString().slice(0,10),m=dailyModel(state,day);
  return {...m,label:['어제','오늘','내일'][index],isToday:offset===0,projects:(state.projects||[]).filter(p=>p.startsOn<=day&&p.endsOn>=day).sort((a,b)=>a.endsOn.localeCompare(b.endsOn)||a.title.localeCompare(b.title))};
 });
}
