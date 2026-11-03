// Deterministic extraction: ambiguous dates stay tasks for user review.
export function textCandidates(text,source='직접 입력') {
 return String(text).split(/\r?\n/).map(s=>s.trim().replace(/^(?:[-*•]\s*|\d+[.)]\s+)/, '')).filter(s=>s.length>=2).slice(0,100).map(line=>{
  const date=line.match(/(20\d{2})[-./년]\s*(\d{1,2})[-./월]\s*(\d{1,2})/),times=[...line.matchAll(/(?:^|\s|~|–|-)([01]?\d|2[0-3]):([0-5]\d)/g)];
  const candidate={title:line.slice(0,160),kind:'task',source};
  if(date&&times.length>=1){const day=`${date[1]}-${date[2].padStart(2,'0')}-${date[3].padStart(2,'0')}`,start=Date.parse(`${day}T${times[0][1].padStart(2,'0')}:${times[0][2]}:00+09:00`),end=times[1]?Date.parse(`${day}T${times[1][1].padStart(2,'0')}:${times[1][2]}:00+09:00`):start+3600000;if(Number.isFinite(start)&&end>start&&new Date(start+9*3600000).toISOString().slice(0,10)===day)Object.assign(candidate,{kind:'event',startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString()});}
  return candidate;
 });
}
