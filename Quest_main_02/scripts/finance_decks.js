// Generate locally, without copying source images or metadata.
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const [input, dir] = process.argv.slice(2);
if (!input || !dir) throw new Error('Usage: node finance_decks.js input.json output_dir');
const D=JSON.parse(fs.readFileSync(input,'utf8'));
const rows=D.rows;
if(rows.length!==3) throw new Error('3개 연도 재무자료가 필요합니다.');
const F={sales:'매출액',cost_of_sales:'매출원가',gross_profit:'매출총이익',selling_admin:'판매관리비',operating_profit:'영업이익',net_profit:'순이익',assets:'자산총계',current_assets:'유동자산',noncurrent_assets:'비유동자산',cash:'현금및현금성자산',receivables:'매출채권',inventory:'재고자산',liabilities:'부채총계',current_liabilities:'유동부채',short_debt:'단기차입금',payables:'매입채무',equity:'자본총계',capital:'자본금',interest:'이자비용',pretax:'세전이익',income_tax:'법인세비용'};
const eok=n=>n==null?'확인 필요':(n/100000).toFixed(2);
const pct=(a,b)=>b==null||b===0?'계산 불가':(a/b*100).toFixed(1)+'%';
const yoy=(a,b)=>b<=0?'비교 유의':((a/b-1)*100).toFixed(1)+'%';
const planValue=n=>n==null?'자료 미제공':n+'억 원';
const ink='1A2D3E', blue='185C86', sub='526477', line='D6E0E6', pale='EDF4F8', white='FFFFFF';
const slideSize={w:13.333,h:7.5};
function init(){let p=new pptxgen();p.layout='LAYOUT_WIDE';p.author='업무 작업실';p.subject='비식별 재무 보고';p.title='(주)대한민국 기업분석';p.company='(주)대한민국';p.lang='ko-KR';p.theme={headFontFace:'Malgun Gothic',bodyFontFace:'Malgun Gothic',lang:'ko-KR'};return p;}
function text(s,t,x,y,w,h,o={}){s.addText(String(t),{x,y,w,h,fontFace:'Malgun Gothic',fontSize:14,color:ink,margin:0,breakLine:false,fit:'shrink',...o})}
function base(p,title,tag){let s=p.addSlide();s.background={color:white};text(s,title,.64,.42,11.8,.48,{fontSize:25,bold:true});text(s,tag||'2023–2025 연간 재무 원자료',.65,.98,11.6,.25,{fontSize:10,color:sub});s.addShape(p.ShapeType.line,{x:.65,y:7.06,w:12.03,h:0,line:{color:line,width:.7}});text(s,'(주)대한민국  |  원자료 대조 · 2026년 2분기 미검증',.65,7.12,10.9,.18,{fontSize:8,color:sub});text(s,String(p._slides.length).padStart(2,'0'),12.27,7.10,.38,.2,{fontSize:9,color:sub,align:'right'});return s;}
function note(s,message){s.addShape('roundRect',{x:.72,y:5.88,w:11.9,h:.82,rectRadius:.06,line:{color:'DCE7EF',width:.6},fill:{color:'F3F8FB'}});text(s,message,.96,6.07,11.4,.42,{fontSize:12,color:'34566B'});}
function bullets(s,items){items.forEach((x,i)=>{s.addShape('ellipse',{x:.83,y:1.65+i*.85,w:.09,h:.09,line:{color:blue},fill:{color:blue}});text(s,x,1.1,1.53+i*.85,11,.59,{fontSize:18})});}
function table(s,fields){let y=1.46;const widths=[4.1,2.55,2.55,2.55], X=[.72,4.82,7.37,9.92];s.addShape('rect',{x:.72,y,w:11.75,h:.48,line:{color:blue,width:.5},fill:{color:'E8F0F6'}});['항목 (단위: 억 원)',...rows.map(x=>x.year+'년')].forEach((v,i)=>text(s,v,X[i]+.12,y+.13,widths[i]-.24,.2,{fontSize:11,bold:true,align:i?'right':'left'}));y+=.48;fields.forEach((key,j)=>{s.addShape('rect',{x:.72,y,w:11.75,h:.63,line:{color:line,width:.5},fill:{color:j%2?'F8FAFB':white}});text(s,F[key],X[0]+.12,y+.18,widths[0]-.24,.28,{fontSize:15});rows.forEach((r,i)=>text(s,eok(r[key]),X[i+1]+.12,y+.18,widths[i+1]-.24,.28,{fontSize:15,align:'right'}));y+=.63});}
function chart(s,p,key,label){let values=rows.map(r=>Number((r[key]/100000).toFixed(3)));s.addChart(p.ChartType.bar,[{name:label,labels:rows.map(r=>String(r.year)),values}],{x:.8,y:1.55,w:8.2,h:4.05,catAxisLabelFontFace:'Malgun Gothic',catAxisLabelFontSize:12,valAxisLabelFontSize:10,showLegend:false,showValue:true,dataLabelFormatCode:'0.00',showTitle:false,showCatName:false,chartColors:[blue],showBorder:false,showValue:true,showValAxisTitle:true,valAxisTitle:'억 원',showCatName:false,showMarker:false,valGridLine:{color:'E8EDF2',size:.5},showCatAxisTitle:false});let r=rows[2],prev=rows[1];text(s,`${r.year}년`,9.5,1.85,2.2,.3,{fontSize:14,color:sub});text(s,eok(r[key])+'억',9.5,2.24,2.5,.5,{fontSize:24,bold:true,color:blue});text(s,'전년 대비  '+yoy(r[key],prev[key]),9.5,3.05,2.7,.35,{fontSize:13});}
function three(s,p,title,items){let r=rows[2];const w=3.76;items.forEach((v,i)=>{let x=.72+i*4;s.addShape('roundRect',{x,y:1.58,w,h:2.15,rectRadius:.06,line:{color:line,width:.7},fill:{color:i===0?pale:white}});text(s,v[0],x+.22,1.88,w-.44,.3,{fontSize:13,color:sub});text(s,v[1],x+.22,2.42,w-.44,.5,{fontSize:23,bold:true,color:i===0?blue:ink});text(s,v[2],x+.22,3.12,w-.44,.32,{fontSize:11,color:sub});});}
function metrics(r){return [['매출액',eok(r.sales)+'억 원','연간 매출'],['영업이익',eok(r.operating_profit)+'억 원','영업이익률 '+pct(r.operating_profit,r.sales)],['당기순이익',eok(r.net_profit)+'억 원','순이익률 '+pct(r.net_profit,r.sales)]];}
function makeCover(p,title,subtext){let s=p.addSlide();s.background={color:'19344A'};text(s,'경영진 검토 자료',.82,1.05,10,.35,{fontSize:15,color:'B7CCD9'});text(s,title,.82,1.80,11.7,1.3,{fontSize:36,bold:true,color:white});text(s,'(주)대한민국  ·  대표 홍길동',.84,3.45,10,.42,{fontSize:19,color:white});text(s,subtext,.84,4.10,10,.65,{fontSize:15,color:'D0DEE6'});text(s,'실제 재무수치를 이용한 비식별 로컬 결과물',.84,6.74,11,.28,{fontSize:11,color:'C4D5E0'});}
const A=rows[0],B=rows[1],C=rows[2];
function one(p,title,body,footer='수치는 제공된 재무 원자료의 2023–2025년 실적 기준입니다.'){let s=base(p,title);bullets(s,body);note(s,footer);return s;}
function tableSlide(p,title,keys,footer){let s=base(p,title);table(s,keys);note(s,footer||'단위는 억 원으로 변환해 소수점 둘째 자리까지 표시합니다.');}
async function comprehensive(){const p=init();makeCover(p,'기업 재무분석 및 성장계획','2023–2025 연간 실적 분석  |  2026년 2분기 검증 대기');
one(p,'회사 개요와 보고 범위',['회사명: (주)대한민국  ·  대표: 홍길동','사업 분야: '+(D.business||'자료 확인 필요'),'분석 기간: 2023~2025년 연간 재무 원자료','2026년 2분기 부가세 자료는 이번 보고서에서 대조하지 않음'],'회사명·대표자는 가명이며, 성장계획은 실적이 아닌 목표·가정으로 분리합니다.');
{let s=base(p,'경영 요약');three(s,p,'경영 요약',metrics(C));note(s,D.llm_commentary?'AI 검토 · 원문 확인: '+D.llm_commentary:'매출 성장과 수익성 변화를 함께 보고, 계획 수치는 별도 확인합니다.');}
{let s=base(p,'연간 매출 추이');chart(s,p,'sales','매출');note(s,'매출 증가율은 전년 매출이 양수일 때만 계산합니다.');}
one(p,'매출 성장률',['2024년 전년 대비 '+yoy(B.sales,A.sales),'2025년 전년 대비 '+yoy(C.sales,B.sales),'2023~2025년 연평균 성장률 '+((Math.pow(C.sales/A.sales,1/2)-1)*100).toFixed(1)+'%'],'산식: 연간 성장률 = (당기 매출 / 전기 매출 − 1) × 100.');
tableSlide(p,'매출총이익 구조',['sales','cost_of_sales','gross_profit']);
one(p,'매출총이익률 변화',rows.map(r=>`${r.year}년  ${pct(r.gross_profit,r.sales)}  · 매출총이익 ${eok(r.gross_profit)}억 원`),'산식: 매출총이익 ÷ 매출액. 반올림 전 값을 기준으로 계산합니다.');
tableSlide(p,'판매관리비의 변화',['sales','selling_admin','gross_profit']);
{let s=base(p,'영업이익 추이');chart(s,p,'operating_profit','영업이익');note(s,'영업이익 = 매출총이익 − 판매관리비. 원자료 값과 연도별로 대조했습니다.');}
one(p,'영업이익률',rows.map(r=>`${r.year}년  ${pct(r.operating_profit,r.sales)}  · 영업이익 ${eok(r.operating_profit)}억 원`),'원인을 단정하지 않고 원가와 판매관리비의 변화도 함께 확인합니다.');
tableSlide(p,'순이익과 세전이익',['operating_profit','pretax','income_tax','net_profit'],`원자료 미표시는 0으로 대체하지 않습니다. 2025년 세전·세금 대조 차이: ${C.checks.net_difference_thousand_krw==null?'확인 필요':C.checks.net_difference_thousand_krw+'천 원'}.`);
{let s=base(p,'자산 규모 추이');chart(s,p,'assets','자산');note(s,'재무상태표의 자산총계는 부채와 자본의 합계와 대조했습니다.');}
tableSlide(p,'유동·비유동 자산 구성',['assets','current_assets','noncurrent_assets']);
tableSlide(p,'매출채권의 변화',['sales','receivables']);
tableSlide(p,'재고자산의 변화',['cost_of_sales','inventory']);
tableSlide(p,'부채와 자본의 구성',['assets','liabilities','equity']);
one(p,'부채비율과 자본 상태',rows.map(r=>r.equity<=0?`${r.year}년  자본이 0 이하이므로 부채비율 해석 유의`:`${r.year}년  부채비율 ${pct(r.liabilities,r.equity)}`),'부채비율 = 부채총계 ÷ 자본총계. 음수 자본 기간은 단순 비율을 제시하지 않습니다.');
one(p,'유동성 지표',rows.map(r=>`${r.year}년 유동비율  ${pct(r.current_assets,r.current_liabilities)}`),'유동비율 = 유동자산 ÷ 유동부채. 유동성 평가는 현금 회수 일정도 함께 확인해야 합니다.');
tableSlide(p,'차입금과 매입채무',['liabilities','short_debt','payables']);
tableSlide(p,'현금과 유동성',['cash','receivables','inventory','current_liabilities']);
tableSlide(p,'이자비용과 영업이익',['operating_profit','interest','pretax']);
one(p,'성장계획 검토',['제공 회사소개서의 2026년 매출 전망: '+planValue(D.plan['2026_sales_100m_krw']),'제공 회사소개서의 2027년 매출 목표: '+planValue(D.plan['2027_sales_100m_krw']),'계획·목표는 확정 실적이 아니며 달성 가정과 일정은 재검토 필요'],'2026년 2분기 및 상반기 수치는 원자료 대조 전이므로 실적으로 사용하지 않습니다.');
one(p,'자금 활용과 상환 검토',['제공 회사소개서의 조달 희망 규모: '+planValue(D.plan['funding_100m_krw']),'집행 목적·조건·약정 금리는 별도 원자료 확인 필요','원금, 이자, 보증료와 만기를 구분하여 상환 부담을 검토'],'조달 규모는 제안된 계획이며 대출 승인·확정 조건이 아닙니다.');
one(p,'확인할 주요 항목',['2026년 2분기 부가세와 연간 재무자료의 기간 대조','매출채권의 회수 일정, 재고의 구성과 회전 확인','사업계획·자금 소요의 근거 및 실제 조달 조건 확인'],'재무 분석은 제공 자료를 바탕으로 한 참고용이며 최종 판단은 검토자가 수행합니다.');
one(p,'원자료 대조와 검산',['2023~2025년: 자산 = 부채 + 자본, 각 연도 일치','2023~2025년: 매출 − 매출원가 = 매출총이익, 각 연도 일치','2023~2025년: 매출총이익 − 판관비 = 영업이익, 각 연도 일치',`2025년 세전이익·법인세·순이익 대조 차이: ${C.checks.net_difference_thousand_krw==null?'확인 필요':C.checks.net_difference_thousand_krw+'천 원'} · 2026년 2분기 대조 대기`],'원자료: 제공받은 재무상태표·손익계산서와 회사소개서. 표시 단위: 억 원.');
if(p._slides.length!==25)throw new Error('25 slide count mismatch: '+p._slides.length);await p.writeFile({fileName:path.join(dir,'comprehensive-25.pptx')});}
async function deep(){const p=init();makeCover(p,'기업 심층 재무분석','제공된 8장 분석 양식의 구성 참고  |  2023–2025');
tableSlide(p,'업체 현황 및 재무요약',['assets','liabilities','equity','sales','operating_profit','net_profit'],'회사명·대표자는 지정된 익명 이름. 원본의 타사 식별정보는 포함하지 않습니다.');
tableSlide(p,'경영실적 분석',['sales','cost_of_sales','gross_profit','selling_admin','operating_profit'],D.llm_commentary?'AI 검토 · 원문 확인: '+D.llm_commentary:'미래 목표는 재무 실적과 별도이며 증빙 확인 전 확정하지 않습니다.');
tableSlide(p,'손익계산서',['sales','cost_of_sales','gross_profit','selling_admin','operating_profit','net_profit']);
one(p,'제조원가 및 원가 영향',['제공 자료상 매출원가와 매출총이익을 우선 대조','원재료비·노무비·제조경비 세부명세는 확인 필요','제조원가 자료가 없으면 해당 항목을 계산하지 않음'],'업종에 따라 제조원가 명세가 없을 수 있으므로 임의로 0을 입력하지 않습니다.');
tableSlide(p,'재무상태표',['assets','current_assets','noncurrent_assets','liabilities','equity']);
one(p,'재무지표',rows.map(r=>`${r.year}년  영업이익률 ${pct(r.operating_profit,r.sales)}  · 유동비율 ${pct(r.current_assets,r.current_liabilities)}  · 부채비율 ${r.equity>0?pct(r.liabilities,r.equity):'해석 유의'}`),'원본 참고 양식의 업종별 평가 구간과 비교 기준은 확인 전 적용하지 않습니다.');
one(p,'신용공여 및 검증',['금융기관별 여신·보증·만기 구분: 원자료 재확인 필요','공개할 수 있는 비식별 자료만 보고서에 반영','자산 합계, 매출총이익, 영업이익은 각 연도 원자료 대조'],'원본 PPTX의 다른 기업 이미지와 개인 정보는 사용하지 않았습니다.');
if(p._slides.length!==8)throw new Error('8 slide count mismatch');await p.writeFile({fileName:path.join(dir,'deep-8.pptx')});}
fs.mkdirSync(dir,{recursive:true});(async()=>{await comprehensive();await deep();console.log('보고서 생성: 종합 25장, 심층 8장');})().catch(e=>{console.error(e.message);process.exit(1)});
