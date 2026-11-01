// Deterministic extraction: ambiguous dates stay tasks for user review.
export function textCandidates(text,source='문서') {
 return String(text).split(/\r?\n/).map(s=>s.trim().replace(/^(?:[-*•]\s*|\d+[.)]\s+)/, '')).filter(s=>s.length>=2).slice(0,100).map(line=>{
  const date=line.match(/(20\d{2})[-./년]\s*(\d{1,2})[-./월]\s*(\d{1,2})/),times=[...line.matchAll(/(?:^|\s|~|–|-)([01]?\d|2[0-3]):([0-5]\d)/g)];
  const candidate={title:line.slice(0,160),kind:'task',source};
  if(date&&times.length>=1){const day=`${date[1]}-${date[2].padStart(2,'0')}-${date[3].padStart(2,'0')}`,start=Date.parse(`${day}T${times[0][1].padStart(2,'0')}:${times[0][2]}:00+09:00`),end=times[1]?Date.parse(`${day}T${times[1][1].padStart(2,'0')}:${times[1][2]}:00+09:00`):start+3600000;if(Number.isFinite(start)&&end>start&&new Date(start+9*3600000).toISOString().slice(0,10)===day)Object.assign(candidate,{kind:'event',startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString()});}
  return candidate;
 });
}
export function parseIcs(text) {
 const unfolded=String(text).replace(/\r?\n[ \t]/g,''),events=[];
 const parse=(v,key)=>{
  const allDay=/^\d{8}$/.test(v),m=v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if(!m)throw new Error('지원하지 않는 ICS 날짜 형식입니다.');
  const tz=key.match(/TZID=([^;:]+)/)?.[1];if(tz&&tz!=='Asia/Seoul'&&tz!=='UTC')throw new Error('ICS는 UTC 또는 Asia/Seoul 시간대만 지원합니다.');
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}${m[7]||tz==='UTC'?'Z':'+09:00'}`).toISOString();
 };
 for(const block of unfolded.split('BEGIN:VEVENT').slice(1)){
  const body=block.split('END:VEVENT')[0];if(/(?:^|\n)(RRULE|RECURRENCE-ID)[:;]/.test(body))throw new Error('반복 ICS는 Google 일정 연결로 가져오세요.');
  const fields={};for(const line of body.split(/\r?\n/)){const colon=line.indexOf(':');if(colon>0){const key=line.slice(0,colon);fields[key.split(';')[0]]={key,value:line.slice(colon+1)};}}
  if(!fields.DTSTART)continue;
  const start=parse(fields.DTSTART.value,fields.DTSTART.key),end=fields.DTEND?parse(fields.DTEND.value,fields.DTEND.key):new Date(Date.parse(start)+(/VALUE=DATE/.test(fields.DTSTART.key)?86400000:3600000)).toISOString();
  events.push({kind:'event',title:(fields.SUMMARY?.value||'가져온 일정').replace(/\\[nN]/g,' ').replace(/\\([,;\\])/g,'$1').slice(0,160),startsAt:start,endsAt:end,externalId:fields.UID?.value||start,status:fields.STATUS?.value==='CANCELLED'?'cancelled':'active'});
 }
 return events.slice(0,2000);
}
