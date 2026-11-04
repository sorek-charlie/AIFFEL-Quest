/* Annual elections and origin-year ledger. Missing evidence never becomes a credit. */
(function(root){
'use strict';
const YEARS=[2021,2022,2023,2024,2025],sum=a=>a.reduce((s,n)=>s+n,0),cents=n=>Math.round(n*100);
const valid=r=>r&&Number.isFinite(r.total)&&Number.isFinite(r.youth)&&r.total>=0&&r.youth>=0&&r.youth<=r.total;
const safe=n=>Number.isSafeInteger(n)&&n>=0;
function head(m,y,mode){return(mode==='integrated'?m.employment?.integrated:m.employment?.annual)?.[y]}
function rates(mode){return mode==='integrated'?[14500000,8500000]:[11000000,7000000]}
function candidate(m,y,mode){
 if(mode==='integrated'&&y<2023||mode==='old'&&y>2024)return null;
 const p=head(m,y-1,mode),h=head(m,y,mode);
 if(!valid(p)||!valid(h))return{year:y,mode,amount:null,missing:'전년·당년 상시근로자 명세'};
 const d=Math.max(0,cents(h.total)-cents(p.total)),dy=Math.min(d,Math.max(0,cents(h.youth)-cents(p.youth))),[ry,ro]=rates(mode);
 return{year:y,mode,amount:Math.round(dy*ry/100+(d-dy)*ro/100),increase:d/100,youthIncrease:dy/100,total:h.total,youth:h.youth,source:h.filed?'원 신고서 고용명세':'고용 XLSX 잠정 집계'};
}
function repayment(o,h,count,prior=0){
 if(!valid(h))return null;
 const td=Math.min(cents(o.increase),Math.max(0,cents(o.total)-cents(h.total))),yd=Math.min(cents(o.youthIncrease),Math.max(0,cents(o.youth)-cents(h.youth))),[ry,ro]=rates(o.mode);
 const unit=td===0?yd*(ry-ro):yd>=td?(yd-td)*(ry-ro)+td*ry:yd*ry+(td-yd)*ro;
 return Math.max(0,Math.round(unit*count/100)-prior);
}
function simulate(m,plan){
 const cohorts=[],rows=[],events=[],candidates=[];let incomplete=false;
 for(const y of YEARS){
  const tax=m.taxes?.[y],ok=tax&&['base','calculated','applied','burden'].every(k=>safe(tax[k]));
  const minimum=ok?(safe(tax.minimum)?tax.minimum:Math.floor(tax.base*7/100)):null,room=ok?Math.max(0,tax.burden-minimum):0;
  let recapture=0,ruralRecovered=0,newAmount=0,continued=0;const missing=[];
  const review=[candidate(m,y,'old'),candidate(m,y,'integrated')].filter(Boolean);candidates.push(...review);
  for(const o of cohorts){
   if(y<=o.year||y>o.year+2)continue;
   const h=head(m,y,o.mode);
   if(!valid(h)){missing.push(y+'년 고용 사후관리 명세');incomplete=true;continue}
   const risk=repayment(o,h,o.paidYears.size,o.recaptured),repay=Math.min(o.paid,risk||0);
   if(repay){recapture+=repay;ruralRecovered+=Math.floor(repay*.2);o.paid-=repay;o.recaptured+=repay;events.push({year:y,origin:o.year,mode:o.mode,kind:'추징',amount:-repay})}
   if(h.total<o.total||h.youth<o.youth){
    o.balance=Math.max(0,o.balance-Math.max(0,(risk||0)-repay));o.continuationReview=true;
    missing.push(o.year+'년분 감소·청년간주·계속공제 명세');
   }else{o.balance+=o.amount;continued+=o.amount;events.push({year:y,origin:o.year,mode:o.mode,kind:'계속공제 발생',amount:o.amount})}
  }
  const selected=review.find(c=>c.mode===(plan[y]||'none'));
  if(selected?.amount===null){missing.push(selected.missing);incomplete=true}
  if(selected?.amount>0){
   const amount=y===2025&&safe(tax?.existingEmploymentGenerated)?tax.existingEmploymentGenerated:selected.amount;
   const o={...selected,amount,balance:amount,paid:0,paidYears:new Set(),recaptured:0};cohorts.push(o);newAmount=amount;
   events.push({year:y,origin:y,mode:o.mode,kind:'신규공제 발생',amount});
  }
  const filed=cohorts.find(c=>c.year===y&&c.mode==='integrated');
  if(filed&&tax?.existingEmploymentApplied){const amount=Math.min(filed.balance,tax.existingEmploymentApplied);filed.balance-=amount;filed.paid+=amount;filed.paidYears.add(y);events.push({year:y,origin:y,mode:'integrated',kind:'기공제',amount})}
  let used=0,capacity=room;
  for(const o of cohorts.slice().sort((a,b)=>a.year-b.year)){
   if(!ok||capacity<=0)break;const amount=Math.min(capacity,o.balance);if(!amount)continue;
   o.balance-=amount;o.paid+=amount;o.paidYears.add(y);capacity-=amount;used+=amount;events.push({year:y,origin:o.year,mode:o.mode,kind:'추가 공제 사용',amount});
  }
  let otherUsed=0,otherRural=0;
  for(const e of(m.verifiedOtherCredits?.[y]||[]).filter(e=>e.verified&&e.source&&safe(e.amount))){
   const cap=e.minTaxExempt?Math.max(0,(tax?.burden||0)-used-otherUsed):Math.max(0,room-used-otherUsed),amount=Math.min(cap,e.amount);
   otherUsed+=amount;otherRural+=Math.floor(amount*(e.ruralRate===0?0:.2));
  }
  // 기납부세액(원천납부) 누락분은 최저한세와 무관하게 환급되며 농특세가 없음
  const prepaid=safe(m.verification?.items?.withholding?.[y]?.cash)?m.verification.items.withholding[y].cash:0;
  const refund=ok?used+otherUsed-recapture:null,rural=ok?Math.floor(used*.2)+otherRural-ruralRecovered:null,net=ok?refund-rural+prepaid:null;
  if(!ok){missing.push('법인세 신고서·세액조정계산서');incomplete=true}
  if(!m.employment&&room>0){missing.push('상시근로자 명세');incomplete=true}
  rows.push({year:y,tax,minimum,room,used,otherUsed,prepaid,recapture,recaptureSigned:-recapture,rural,refund,net,newAmount,continued,carry:sum(cohorts.map(c=>c.balance)),missing:[...new Set(missing)].join(' · '),reason:!ok?'신고서 필요':tax.burden===0?'원 법인세 0원':room===0?'기공제 반영 · 최저한세':recapture?'환급과 추징 상계':'신규·계속·이월 공제 비교'});
 }
 return{plan,rows,events,candidates,gross:sum(rows.map(r=>r.refund||0)),net:sum(rows.map(r=>r.net||0)),rural:sum(rows.map(r=>r.rural||0)),remaining:sum(cohorts.map(c=>c.balance)),partial:incomplete,cohorts:cohorts.map(c=>({...c,paidYears:[...c.paidYears]}))};
}
const CATALOG=[
 ['social','사회보험료 세액공제','조특법 §30의4','사업주 부담 4대보험료·지원금 내역'],
 ['rnd','연구·인력개발비 공제','조특법 §10','연구소 인정서·연구비 원장'],
 ['invest','통합·종전 투자 공제','조특법 §24·구 §5/25','고정자산대장·투자 세금계산서'],
 ['wages','근로소득 증대 공제','조특법 §29의4','직전 3년·당년 개인별 급여대장'],
 ['profit','성과공유 경영성과급 공제','조특법 §19','성과공유 약정·성과급 지급내역'],
 ['regular','정규직 전환 공제','구 §30의2·§29의8','전환 전후 근로계약서'],
 ['return','육아휴직 복귀 공제','구 §29의3·§29의8','휴직·복직일·복직 후 급여'],
 ['career','경력단절자 재고용 공제','구 §29의3·§29의8','경력단절·재고용 증빙'],
 ['maintain','고용유지 중소기업 공제','조특법 §30의3','고용·임금·근로시간 원장'],
 ['sme','중소기업 특별세액감면','조특법 §7','기업규모·사업장별 소득 명세'],
 ['startup','창업·청년창업 감면','조특법 §6','창업일·최초 소득·업종·승계 증빙'],
 ['rent','착한임대인 공제','조특법 §96의3','임대계약·인하액·임차인 확인서'],
 ['foreign','외국납부세액 공제','법인세법 §57','국외소득·외국세 납부증명'],
 ['withholding','원천납부세액 정산','법인세법 §64','이자·배당 원천징수 영수증'],
 ['disaster','재해손실세액 공제','법인세법 §58','재해확인·피해자산 명세'],
 ['electronic','전자신고 공제','조특법 §104의8','직접 전자신고·신고대리 구분'],
 ['filing','성실신고 확인비용 공제','조특법 §126의6','성실신고 대상·확인비용 증빙'],
 ['settle','상생결제 공제','조특법 §7의4','상생결제 지급명세'],
 ['cooperate','상생협력 출연·무상임대 공제','조특법 §8의3','출연·임대 약정 및 지급 증빙'],
 ['tech','기술취득·이전 공제·감면','조특법 §12','기술 계약·평가·대금 지급내역'],
 ['venture','벤처출자·인수합병 공제','조특법 §12의3·§13의2 등','출자·인수 계약·대상기업 확인'],
 ['training','교육·인력 양성 관련 공제','조특법 §10·§104의18 등','위탁교육·현장훈련 협약·비용'],
 ['relocate','수도권 밖 이전 감면','조특법 §63·§63의2','이전 전후 소재지·실제 이전 증빙'],
 ['special','특구·사회적기업·업종별 특례','조특법 개별 특례','특구 입주·사회적기업·해당 업종 인허가'],
 ['prior','2021년 이전 발생 공제 이월','조특법 §144','2011~2020 공제·이월 명세서']
];
function buildReview(m,result){
 const out=[];
 for(const year of YEARS){
  const tax=m.taxes?.[year];
  for(const mode of['old','integrated']){const c=candidate(m,year,mode);
   out.push({year,id:'employment-'+mode,name:mode==='old'?'고용증대 신규 공제':'통합고용 신규 공제',law:mode==='old'?'조특법 §29의7':'조특법 §29의8',amount:c?c.amount:0,status:!c?'대상연도 밖':c.amount===null?'자료 필요':year===2025&&mode==='integrated'?'기공제 대조':result.plan[year]===mode?'계산·비교 반영':'계산·선택 비교',missing:c?.amount===null?c.missing:'',note:c?.source||''});
  }
  const ev=result.events.filter(e=>e.year===year&&e.kind==='계속공제 발생');
  out.push({year,id:'continued',name:'발생연도별 2·3차 계속공제',law:'§29의7·§29의8',amount:sum(ev.map(e=>e.amount)),status:'발생연도별 계산',missing:'',note:ev.map(e=>e.origin+'년분').join(', ')});
  out.push({year,id:'carry',name:'이월공제 사용',law:'조특법 §144',amount:sum(result.events.filter(e=>e.year===year&&e.kind==='추가 공제 사용'&&e.origin<year).map(e=>e.amount)),status:'계산 반영',missing:'',note:'발생연도 순으로 차감'});
  for(const[id,name,law,missing]of CATALOG){
   let status='자료 필요',amount=null,note='자료 미확보 · 환급 합계에 가산하지 않음';
   if(id==='sme'&&year===2023){status='기감면 유지';amount=tax?.existingNonEmploymentApplied??tax?.applied??null;note='원 신고 감면 유지 · 신규 환급 중복 가산 안 함'}
   if(['regular','return'].includes(id)&&year===2025&&m.employment?.filedIntegrated?.[2025]){status='원 신고 인원 0명';amount=0;note='2025 공제계산서 39·41쪽 0명'}
   if(id==='relocate'){status='소재지 조건 미충족';amount=0;note='첨부 소재지 서울·경기 · 수도권 밖 이전 증빙 없음'}
   if(id==='electronic'){status='신고대리 확인';amount=0;note='신고서 세무대리인 표시 · 회사 직접신고 공제 가산 안 함'}
   if(id==='social'&&year===2025)note='2024까지 신규 발생 · 종전 계속·이월 확인 필요';
   const v=m.verification?.items?.[id]?.[year];
   if(v){status=v.status;amount=v.amount;note=v.basis}
   out.push({year,id,name,law,amount,status,missing:status==='자료 필요'?missing:v?.missing||'',note,...v&&{verified:true,cash:v.cash,carry:v.carry,display:v.display,files:v.files}});
  }
 }
 return out;
}
function estimate(m,options={}){
 const plans=[];
 for(const a of['none','old'])for(const b of['none','old'])for(const c of['none','old','integrated'])for(const d of['none','old','integrated'])plans.push(simulate(m,{2021:a,2022:b,2023:c,2024:d,2025:'integrated'}));
 plans.sort((a,b)=>b.net-a.net||b.gross-a.gross||Object.values(a.plan).filter(x=>x!=='none').length-Object.values(b.plan).filter(x=>x!=='none').length);
 const chosen=options.plan?simulate(m,options.plan):plans[0];
 chosen.review=buildReview(m,chosen);chosen.comparisons=plans.map(p=>({plan:p.plan,net:p.net,gross:p.gross,recapture:sum(p.rows.map(r=>r.recapture))}));
  const open=x=>x.status==='자료 필요'||x.status==='확인 필요';chosen.hasUnquantified=chosen.review.some(open);chosen.partial=chosen.partial||chosen.hasUnquantified;
 for(const r of chosen.rows){r.missingItems=[...new Set(chosen.review.filter(x=>x.year===r.year&&open(x)).map(x=>x.missing))];r.missingShort=r.missingItems.length?r.missingItems.join(' · '):'없음 · 현재 입력자료 기준'}
 return chosen;
}
const api={estimate,simulate,candidate,repayment,buildReview,YEARS,CATALOG};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReturnTax=api;
})(typeof globalThis!=='undefined'?globalThis:this);
