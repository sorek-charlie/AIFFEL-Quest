(function(root){'use strict';
const YEARS=[2021,2022,2023,2024,2025];
const A=typeof module!=='undefined'&&module.exports?require('./analysis2-core.js'):root.Analysis2Core;
function build(result,items,verification){
 const sumKnown=values=>values.some(v=>typeof v==='number')?values.reduce((s,v)=>s+(typeof v==='number'?v:0),0):null;
 const groups=new Map();
 for(const row of items.filter(r=>r.type==='세액공제')){const category=row.id==='withholding'?'기타':'세액공제·감면';const key=category+':'+row.id;
  if(!groups.has(key))groups.set(key,{key,id:row.id,name:row.id==='carry'?'과거 발생분 당년 사용(이월·계속)':row.name,category,years:{},missing:row.missing,note:verification?.notes?.[row.id]||'',caseKey:row.key});
  let amount=row.cash,label=amount===null?'자료 필요':'';
  const applies=A.applicability(row),notApplicable=applies.excluded,reason=applies.reason;
  if(notApplicable){amount=null;label='미적용'}
  else if(row.id==='continued'){amount=null;label='이월·계속 사용행에 포함'}
  else if(row.status==='기감면 유지'){amount=null;label='기신고 유지'}
  else if(row.amount===null&&amount===0){amount=null;label='자료 필요'}
  const display=!notApplicable&&row.display||null;if(display)label=display;
  const group=groups.get(key);if(row.missing)group.missing=row.missing;group.years[row.year]={amount,label,display,carry:row.carry||0,estimated:row.status==='추정 반영',status:row.status,missing:row.missing,caseKey:row.key,notApplicable,reason:display?row.basis:reason};
 }
 const other=[{id:'rural',name:'농어촌특별세 현금 증감',missing:'공제·추징별 농특세 최종 대조',value:r=>-r.rural},{id:'local',name:'법인지방소득세 경정',missing:'지방소득세 신고서·납부·결정 자료',value:()=>null},{id:'interest',name:'국세환급가산금',missing:'납부일·환급결정일·적용이율',value:()=>null}];
 for(const o of other){const v=verification?.other?.[o.id],display=v?.[0]||null,amount=v?(display==='해당 없음'?0:null):o.value(r=>r);
  groups.set('기타:'+o.id,{key:'기타:'+o.id,id:o.id,name:o.name,category:'기타',missing:v?'':o.missing,note:v?.[1]||'',years:Object.fromEntries(result.rows.map(r=>{const value=v?amount:o.value(r);return[r.year,{amount:value,label:display||(value===null?'자료 필요':''),display,reason:v?.[1],missing:v?'':o.missing}]}))})}

 const annual=result.rows.map(r=>({year:r.year,additionalTaxRefund:r.refund===null?null:r.used+r.otherUsed,recapture:r.refund===null?null:-r.recapture,taxNet:r.refund,otherKnown:r.refund===null?null:-r.rural+(r.prepaid||0),knownSubtotal:r.net,missing:r.missingShort,scope:'법인세·농특세 계산분만 / 지원금·기타 미확인 제외'}));
 const shared=all=>{const cells=all.filter(c=>c&&!c.notApplicable),carry=cells.reduce((s,c)=>s+(c.carry||0),0);
  if(!cells.length||!cells.every(c=>c.display&&!c.amount))return null;
  const special=[...new Set(cells.map(c=>c.display).filter(l=>l!=='해당 없음'&&!l.startsWith('이월')))];
  return special.length===1?special[0]:special.length?null:carry?'이월 '+carry.toLocaleString('ko-KR'):'해당 없음'};
 for(const group of groups.values()){const cells=YEARS.map(y=>group.years[y]);const labels=[...new Set(cells.filter(c=>c&&!c.notApplicable).map(c=>c.amount===null?c.label:null))];
  group.subtotal={amount:sumKnown(cells.map(c=>c?.amount)),pending:cells.filter(c=>!c||c.label==='자료 필요').length,display:shared(cells)||(labels.length===1&&labels[0]&&labels[0]!=='자료 필요'?labels[0]:null)};}
 const totals=Object.fromEntries(['additionalTaxRefund','recapture','taxNet','otherKnown','knownSubtotal'].map(k=>[k,sumKnown(annual.map(r=>r[k]))]));
 totals.partial=annual.some(r=>r.knownSubtotal===null);
 const categories=['세액공제·감면','기타'].map(category=>({category,count:[...groups.values()].filter(r=>r.category===category).length,years:Object.fromEntries(YEARS.map(y=>{const cells=[...groups.values()].filter(r=>r.category===category).map(r=>r.years[y]);return[y,{amount:sumKnown(cells.map(c=>c?.amount)),pending:cells.filter(c=>!c||c.label==='자료 필요').length,display:(live=>live.length&&live.every(c=>c.amount===null&&c.display)?live[0].display:null)(cells.filter(c=>c&&!c.notApplicable))}]}))}));
 return{years:YEARS,annual,totals,categories,items:[...groups.values()].sort((a,b)=>['세액공제·감면','기타'].indexOf(a.category)-['세액공제·감면','기타'].indexOf(b.category))};
}
const api={build};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ResultMatrix=api;
})(typeof window!=='undefined'?window:globalThis);
