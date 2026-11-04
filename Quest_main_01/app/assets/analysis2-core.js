(function(root){
'use strict';
const YEARS=[2021,2022,2023,2024,2025];
const WORKFLOW=['검토대기','자료요청','상담준비','연락완료','회신대기','보완중','해결완료'];
const sum=a=>a.reduce((s,n)=>s+n,0);
function applicability(row){
 if(row.status==='미시행')return{excluded:true,reason:row.rule||row.version};
 if(row.id==='employment-integrated'&&row.year<2023)return{excluded:true,reason:'통합고용 신규 공제 도입 전 연도'};
 if(row.id==='employment-old'&&row.year===2025)return{excluded:true,reason:'종전 고용증대 신규 발생 종료 · 과거 발생분 계속·이월은 별도 검토'};
 if(row.id==='social'&&row.year===2025)return{excluded:true,reason:'사회보험료 신규 발생분 적용 종료 · 과거 발생분 계속·이월은 별도 검토'};
 return{excluded:false,reason:''};
}
function groupRows(rows){const groups=new Map();for(const r of rows){const key=r.type+':'+r.id;if(!groups.has(key))groups.set(key,{key,id:r.id,name:r.name,type:r.type,rows:[]});groups.get(key).rows.push(r)}return[...groups.values()].map(g=>({...g,rows:g.rows.sort((a,b)=>a.year-b.year)}))}
const INPUTS=[
 {id:'tax',name:'법인세 신고서·세액조정계산서',years:'2021~2025',purpose:'세액공제',required:'정기·수정·경정 및 부속명세',owner:'국세청 홈택스'},
 {id:'employment',name:'고용 취득·상실·휴직 이력',years:'2020~2025',purpose:'세액공제',required:'사업장별 전체 이력·월말 인원',owner:'근로복지공단'},
 {id:'contracts',name:'근로계약·임원/친족·근로시간',years:'2021~2025',purpose:'세액공제',required:'계약 갱신·제외인원·휴직 확인',owner:'회사 인사 / 근로복지공단'},
 {id:'salary',name:'개인별 급여·원천징수 자료',years:'2020~2025 및 비교연도',purpose:'세액공제',required:'월별 급여대장·지급명세서',owner:'회사 회계 / 국세청 홈택스'},
 {id:'insurance',name:'사업주 부담 사회보험료',years:'2021~2025',purpose:'사회보험료 공제',required:'실제 납부액·지원/감면 차감',owner:'통합징수포털 / 회사 회계'},
 {id:'carry',name:'기공제·이월·실납부 명세',years:'2021~2025 및 전기 이월',purpose:'세액공제',required:'전체 이월명세·결정/경정·납부내역',owner:'국세청 홈택스'}
];
function source(support,id){return(support.sources||[]).find(s=>s.id===id)}
function refs(support,ids){return ids.map(id=>source(support,id)).filter(Boolean)}
function taxRule(row,support){
 const y=row.year,id=row.id;let rule=y+' 귀속 조문·부칙 및 공제·감면 중복배제 확인',version=y+' 귀속 / 연혁 확인 필요',ids=['S34'];
 if(id==='employment-old'){rule=y===2025?'2025 신규 발생 종료. 종전 발생분 계속·이월은 별도':'중소·수도권 청년등 1,100만원 / 청년등 외 700만원. 발생연도별 최대 3개년';version=y+' 귀속 종전 고용증대'+(y>=2023&&y<=2024?' / 통합과 선택':'');ids=y<=2022?['S04','S06']:['S04','S05']}
 if(id==='employment-integrated'){rule=y<2023?'미시행: 2023.1.1 이후 개시 과세연도부터':'청년 15~34세 / 중소·수도권 청년등 1,450만원·그 외 850만원. 기공제·감소 사후관리 확인';version=y+' 귀속 통합고용'+(y===2023||y===2024?' / 종전과 중복 불가':'');ids=['S04','S05']}
 if(id==='social'){rule=y===2025?'신규 발생은 2024까지. 종전 발생분의 계속·이월 검토':'증가인원 사용자 부담 사회보험료 / 청년등 100%, 그 외 50%. 보조금 차감·고용유지 확인';ids=['S04','S07'];version=y+' 귀속 사회보험료 공제'}
 if(id==='continued'){rule='최초 발생연도·선택제도별 계속공제. 전체·청년 감소 및 청년 간주 여부 대조';ids=['S04','S05','S07'];version=y+' 적용 / 발생연도별 규정'}
 if(id==='carry'||id==='prior'){rule='발생연도별 이월·기공제액·유효기간을 대조. 미공제 발생액은 즉시 환급액이 아님';ids=['S07','S34'];version=y+' 사용 / 최초 발생연도 연혁 확인'}
 if(id==='repayment'){rule='고용감소에 따른 추가납부는 음수. 농특세 환급·미공제 이월액 조정은 구분';ids=['S07','S34'];version=y+' 사후관리 / 발생연도별 규정'}
 if(['regular','return','career'].includes(id)){rule=y<=2022?'종전 전환·복귀·경력단절 관련 조문과 당시 요건 확인':'통합고용 추가공제와 종전 경과조치 구분. 전환·복귀 발생일·고용유지·중복 확인';ids=['S04','S05'];version=y+' 발생일 기준 / 경과조치 확인'}
 if(id==='rnd'){rule='일반·신성장·국가전략 연구비와 기업규모별 산식 구분. 최저한세 적용 여부 별도';ids=['S34'];version=y+' 연구비 발생연도 / 인정요건 확인'}
 if(id==='invest'){rule='투자연도·자산종류·기업규모·당해 연도 임시공제율 및 다른 감면과 중복 확인';ids=['S34'];version=y+' 투자 발생연도 / 해당 연도율 확인'}
 return{rule,version,sources:refs(support,ids)};
}
function buildRows(model,result,support){
 const rows=result.review.map(r=>{
  const policy=taxRule(r,support);let cash=null,cashLabel='환급 미판정';
  if(r.id==='carry'){cash=sum(result.events.filter(e=>e.year===r.year&&e.kind==='추가 공제 사용'&&e.origin<r.year).map(e=>e.amount));cashLabel='당년 환급 반영'}
  if(r.id.startsWith('employment-')){const mode=r.id==='employment-old'?'old':'integrated';cash=sum(result.events.filter(e=>e.year===r.year&&e.origin===r.year&&e.mode===mode&&e.kind==='추가 공제 사용').map(e=>e.amount));cashLabel='당년 신규분 환급 반영'}
  if(r.verified&&r.cash!==null&&r.cash!==undefined){cash=r.cash;cashLabel=r.status==='추정 반영'?'기납부세액 추정 환급':'당년 환급 반영'}
  return{key:'tax:'+r.year+':'+r.id,year:r.year,type:'세액공제',id:r.id,name:r.name,law:r.law,...policy,amount:r.amount,amountLabel:'공제 발생·검토액',cash,cashLabel,status:r.status,missing:r.verified?r.missing:r.missing||(['계산·비교 반영','계산·선택 비교'].includes(r.status)?'계약·제외인원·최저한세·기공제·납부 대조':r.note||''),verified:!!r.verified,display:r.display||null,carry:r.carry||0,files:r.files||[],owner:'국세청 홈택스',coowner:['social','employment-old','employment-integrated','return','regular','career','continued'].includes(r.id)?'근로복지공단 / 회사 인사':'회사 회계',next:'해당 연도 요건·중복·기공제와 실제 납부를 대조하고 원 명세서로 재계산',basis:r.note||'첨부 신고서·고용자료 검토'};
 });
 for(const r of result.rows)rows.push({key:'tax:'+r.year+':repayment',year:r.year,type:'세액공제',id:'repayment',name:'고용감소 추징·추가납부',law:'조특법 §29의7·§29의8',...taxRule({year:r.year,id:'repayment'},support),amount:-r.recapture,amountLabel:'추징 예상액',cash:-r.recapture,cashLabel:'당년 추가납부 반영',status:r.recapture?'추징 잠정 계산':'현재 계산상 0원',missing:'감소인원·청년간주·공제 횟수·과거 실제 공제 대조',owner:'국세청 홈택스',coowner:'근로복지공단',next:'발생연도별 감소 사유와 실제 공제액·농특세를 대조',basis:'1차 결과의 고용공제 원장'});
 return rows;
}
function inputStatus(model,records=[]){return INPUTS.map(def=>{
 let state='미확보',evidence='원 증빙 필요';
 if(def.id==='tax'){const years=YEARS.filter(y=>model.taxes?.[y]);state=years.length===5?'5개년 인식':'일부/미확보';evidence=years.length?years.join('·')+' 귀속 신고서':'법인세 PDF 필요'}
 if(def.id==='employment'&&model.employment){state='고용 이력 인식';evidence=model.employment.records+'개 이력·계약/법정 제외인원 미대조'}
 const received=records.filter(r=>r.intent===def.id&&!r.error);
 if(received.length&&!['tax','employment'].includes(def.id)){state='접수·요건 확인 필요';evidence=received.length+'개 파일 접수. 내용·금액·자격 확정 전'}
 return{...def,state,evidence};
})}
function validateCase(value){
 if(!WORKFLOW.includes(value.status))throw Error('진행 상태를 선택하세요.');
 if(value.status==='해결완료'&&(!String(value.evidence||'').trim()||!String(value.response||'').trim()||value.evidenceChecked!==true))throw Error('해결완료에는 회신 내용·근거자료와 근거 확인이 필요합니다.');
 return true;
}
function requestText(row,company,contact){return[
 '[검토 요청] '+company+' / '+row.year+'년 / '+row.name,
 '담당: '+(contact?.name||row.owner)+' ('+(contact?.role||row.owner)+')',
 '분류: '+row.type,'적용 기준: '+row.version,'법령/정책: '+row.law,
 '연도별 요건: '+row.rule,'현재 분석: '+row.status,
 row.amount===null?'검토금액: 자료 미확보로 금액 미판정':'발생·검토액: '+row.amount.toLocaleString('ko-KR')+'원 (최종 청구액 아님)',
 '부족자료: '+(row.missing||'적용 근거 재확인'),'확인 요청: '+row.next,
 '요청사항: 적용 가능 여부, 기한·중복·추징, 보완자료 및 산출근거를 회신해 주세요.',
 '1차 결과: 세금 경정청구 참고용 예상액.',
 '주민등록번호·계좌·개인별 급여 원문은 이 요청서에 포함하지 않았습니다.',
 '근거 링크:',...row.sources.map(s=>s.title+' '+s.url)
 ].join('\r\n')}
function mailto(email,subject,body){if(!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)||/[\r\n]/.test(email))throw Error('담당자의 올바른 이메일을 입력하세요.');return'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)}
const api={YEARS,WORKFLOW,INPUTS,buildRows,inputStatus,validateCase,requestText,mailto,taxRule,applicability,groupRows};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Analysis2Core=api;
})(typeof globalThis!=='undefined'?globalThis:this);
