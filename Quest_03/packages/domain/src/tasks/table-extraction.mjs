// OCR coordinates preserve dated lesson rows instead of mixing table columns.
export function tableCandidates(layouts,text,source){
 const year=String(text).match(/\b(20\d{2})[-./]\d{1,2}[-./]\d{1,2}/)?.[1];if(!year)return [];
 const out=[];
 for(const page of layouts){
  const words=page.words||[],anchors=words.filter(w=>w.x<page.width*.14&&/^\d{2}[-_–]\d{2}$/.test(w.text)).sort((a,b)=>a.y-b.y);
  const join=ws=>{const lines=[];for(const w of [...ws].sort((a,b)=>a.y-b.y||a.x-b.x)){let line=lines.find(l=>Math.abs(l.y-w.y)<Math.max(5,w.height*.5));if(!line){line={y:w.y,words:[]};lines.push(line);}line.words.push(w);}return lines.sort((a,b)=>a.y-b.y).map(l=>l.words.sort((a,b)=>a.x-b.x).map(w=>w.text).join(' ')).join('\n');};
  for(let i=0;i<anchors.length;i++){
   const a=anchors[i],top=a.y-a.height*2.4,bottom=Math.min(anchors[i+1]?anchors[i+1].y-anchors[i+1].height*2.4:Infinity,a.y+110),row=words.filter(w=>w.y>=top&&w.y<bottom);
   const date=row.find(w=>w.x<page.width*.14&&/^\d{1,2}\/\d{1,2}$/.test(w.text));if(!date)continue;
   const [m,d]=date.text.split('/'),dueDate=`${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;const stamp=Date.parse(dueDate+'T12:00:00Z');if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==dueDate)continue;
   const titleWords=row.filter(w=>w.x>=page.width*.145&&w.x<page.width*.435),subject=titleWords.find(w=>w.text==='주제'),title=join(titleWords.filter(w=>!subject||w.y<subject.y-3)).replace(/\n/g,' ').trim();
   if(!title)continue;const details=join(row.filter(w=>w.x>=page.width*.435&&w.x<page.width*.825));
   out.push({kind:'task',title:`${a.text.replace(/[_–]/g,'-')} ${title}`.slice(0,160),dueDate,details:details.slice(0,2000),source,structured:true,attachmentPreview:join(row).slice(0,4000)});
  }
 }
 return out.length>=3?out:[];
}
