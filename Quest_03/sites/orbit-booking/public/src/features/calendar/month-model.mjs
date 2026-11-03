// Display-only projection. All conflict and storage decisions belong to the API.
export const seoulDate = instant => new Date(Date.parse(instant)+9*3600000).toISOString().slice(0,10);
export function shiftMonth(month, offset) {
  const [year,m]=month.split('-').map(Number);
  return new Date(Date.UTC(year,m-1+offset,1)).toISOString().slice(0,7);
}
export function dayEvents(events,date) {
  const start=Date.parse(date+'T00:00:00+09:00'),end=start+86400000;
  return events.filter(e=>Date.parse(e.startsAt)<end&&Date.parse(e.endsAt)>start).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
}
export function monthCells(month,events) {
  const [year,m]=month.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1)),offset=first.getUTCDay();
  const weeks=Math.ceil((offset+new Date(Date.UTC(year,m,0)).getUTCDate())/7);
  return Array.from({length:weeks*7},(_,i)=>{
    const date=new Date(Date.UTC(year,m-1,1-offset+i)).toISOString().slice(0,10);
    return {date,day:Number(date.slice(8)),inMonth:date.startsWith(month),events:dayEvents(events,date)};
  });
}

export function monthEvents(events,month){
 const start=Date.parse(month+'-01T00:00:00+09:00'),end=Date.parse(shiftMonth(month,1)+'-01T00:00:00+09:00');
 return events.filter(e=>Date.parse(e.startsAt)<end&&Date.parse(e.endsAt)>start).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
}
