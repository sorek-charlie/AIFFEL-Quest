// Generic report layouts; all financial values come from normalized source data.
const pptxgen=require('pptxgenjs'),fs=require('fs'),path=require('path');
const [input,dir]=process.argv.slice(2);const D=JSON.parse(fs.readFileSync(input,'utf8'));const rows=D.rows;
if(!rows.length||rows.length>3)throw Error('1~3개 연도 자료가 필요합니다.');
const labels={assets:'자산총계',current_assets:'유동자산',noncurrent_assets:'비유동자산',cash:'현금 및 현금성자산',receivables:'매출채권',inventory:'재고자산',liabilities:'부채총계',current_liabilities:'유동부채',short_debt:'단기차입금',payables:'매입채무',equity:'자본총계',capital:'자본금',sales:'매출액',cost_of_sales:'매출원가',gross_profit:'매출총이익',selling_admin:'판매비와 관리비',operating_profit:'영업이익',net_profit:'당기순이익',pretax:'세전이익',income_tax:'법인세',interest:'이자비용'};
const ink='1A2D3E',blue='185C86',muted='526477',line='D6E0E6',company=D.company||'기업명 미입력';
const money=v=>v==null?'자료 없음':(v/100000000).toFixed(2);
const pct=(a,b)=>a==null||b==null||b<=0?'계산 불가':(a/b*100).toFixed(1)+'%';
const growth=(a,b)=>a==null||b==null||b<=0?'계산 불가':((a/b-1)*100).toFixed(1)+'%';
const range=rows.map(r=>r.year).join(' · ');
function setup(){const p=new pptxgen();p.layout='LAYOUT_WIDE';p.title=company+' 재무분석';p.author='업무 작업실';p.subject='재무자료 기반 보고서';p.company=company;p.lang='ko-KR';p.theme={headFontFace:'Malgun Gothic',bodyFontFace:'Malgun Gothic',lang:'ko-KR'};return p;}
function text(s,t,x,y,w,h,o={}){s.addText(String(t),{x,y,w,h,fontFace:'Malgun Gothic',fontSize:14,color:ink,margin:0,fit:'shrink',...o})}
function page(p,title){const s=p.addSlide();s.background={color:'FFFFFF'};text(s,title,.65,.42,11.9,.5,{fontSize:24,bold:true});text(s,range+' · 단위 억 원',.66,1.02,11,.24,{fontSize:10,color:muted});s.addShape('line',{x:.65,y:7.04,w:12.02,h:0,line:{color:line,width:.7}});text(s,company+' · 원자료 대조 필요',.66,7.12,10.5,.2,{fontSize:8,color:muted});text(s,String(p._slides.length).padStart(2,'0'),12.25,7.10,.4,.2,{fontSize:9,color:muted});return s;}
function note(s,value){s.addShape('roundRect',{x:.72,y:5.98,w:11.9,h:.76,rectRadius:.06,line:{color:'DCE7EF',width:.5},fill:{color:'F3F8FB'}});text(s,value,.95,6.16,11.4,.38,{fontSize:11,color:'34566B'});}
function cover(p,title){const s=p.addSlide();s.background={color:'19344A'};text(s,'경영진 검토 자료',.82,1.05,10,.35,{fontSize:15,color:'B7CCD9'});text(s,title,.82,1.8,11.7,1.2,{fontSize:34,bold:true,color:'FFFFFF'});text(s,company+' · 대표 '+(D.representative||'자료 없음'),.84,3.42,11,.5,{fontSize:19,color:'FFFFFF'});text(s,range+' · 제공된 연간 재무자료',.84,4.05,11,.5,{fontSize:15,color:'D0DEE6'});text(s,'누락 항목과 검산 결과는 본문 및 별도 기록을 확인하세요.',.84,6.73,11,.28,{fontSize:10,color:'C4D5E0'});}
function tablePage(p,title,keys,remark){const s=page(p,title),ys=1.52,all=rows.length;let w0=4.3,w=(11.85-w0)/all;
  s.addShape('rect',{x:.72,y:ys,w:11.85,h:.48,line:{color:line,width:.5},fill:{color:'E8F0F6'}});text(s,'항목 (억 원)',.84,ys+.13,4,.22,{fontSize:11,bold:true});rows.forEach((r,i)=>text(s,String(r.year)+'년',.72+w0+i*w+.1,ys+.13,w-.2,.2,{fontSize:11,bold:true,align:'right'}));
  keys.forEach((k,j)=>{let y=ys+.48+j*.62;s.addShape('rect',{x:.72,y,w:11.85,h:.62,line:{color:line,width:.5},fill:{color:j%2?'F8FAFB':'FFFFFF'}});text(s,labels[k],.84,y+.18,4,.26,{fontSize:14});rows.forEach((r,i)=>text(s,money(r[k]),.72+w0+i*w+.1,y+.18,w-.2,.26,{fontSize:14,align:'right'}));});note(s,remark||'원자료의 단위와 기간을 확인했습니다. 표시 금액은 억 원으로 반올림했습니다.');}
function bulletsPage(p,title,lines,remark){const s=page(p,title);lines.forEach((value,i)=>{s.addShape('ellipse',{x:.83,y:1.67+i*.75,w:.08,h:.08,line:{color:blue},fill:{color:blue}});text(s,value,1.1,1.54+i*.75,11.2,.55,{fontSize:17});});note(s,remark||'자료가 없거나 확인되지 않은 항목은 임의로 채우지 않습니다.');}
function ratios(key,base){return rows.map(r=>`${r.year}년  ${pct(r[key],r[base])}`)}
const last=rows[rows.length-1],previous=rows.length>1?rows[rows.length-2]:null;
function checks(r){return [['balance','재무상태'],['gross','매출총이익'],['operating','영업이익']].map(([k,n])=>n+' '+(r.checks[k]===true?'일치':r.checks[k]===false?'불일치':'자료 부족')).join(' · ')}
async function deep(){const p=setup();cover(p,'기업 심층 재무분석');
tablePage(p,'기업 현황과 재무 요약',['assets','liabilities','equity','sales','operating_profit','net_profit']);
tablePage(p,'경영실적 분석',['sales','cost_of_sales','gross_profit','selling_admin','operating_profit'],D.llm_commentary?'AI 검토 · 원문 확인: '+D.llm_commentary:'확정 실적과 계획은 별도로 확인합니다.');
tablePage(p,'손익계산서',['sales','cost_of_sales','gross_profit','selling_admin','operating_profit','net_profit']);
bulletsPage(p,'원가와 손익 영향',['매출원가 및 매출총이익의 기간별 변화를 확인합니다.','원재료비·노무비·제조경비 상세는 제공 자료를 확인하세요.','자료가 없는 항목의 산식·분해 결과는 표시하지 않습니다.']);
tablePage(p,'재무상태표',['assets','current_assets','noncurrent_assets','liabilities','equity']);
bulletsPage(p,'재무지표',rows.map(r=>`${r.year}년 · 영업이익률 ${pct(r.operating_profit,r.sales)} · 유동비율 ${pct(r.current_assets,r.current_liabilities)} · 부채비율 ${pct(r.liabilities,r.equity)}`),'분모가 없거나 0 이하이면 계산 불가로 표시합니다.');
bulletsPage(p,'신용공여 및 검산',rows.map(r=>`${r.year}년 · ${checks(r)}`).concat(['기관·과목·만기별 여신 정보는 별도 자료 확인이 필요합니다.']));
if(p._slides.length!==8)throw Error('심층 보고서 장수 오류');await p.writeFile({fileName:path.join(dir,'deep-8.pptx')});}
async function comprehensive(){const p=setup();cover(p,'기업 재무분석 및 성장계획');
bulletsPage(p,'회사 개요',['기업명: '+company,'대표자: '+(D.representative||'자료 없음'),'사업 분야: '+(D.business||'자료 없음'),'분석 대상: '+range]);
tablePage(p,'경영 요약',['sales','operating_profit','net_profit'],D.llm_commentary?'AI 검토 · 원문 확인: '+D.llm_commentary:'경영 결과는 원자료와 함께 확인합니다.');
tablePage(p,'매출 추이',['sales']);
bulletsPage(p,'매출 성장',previous?[`${last.year}년 전기 대비 ${growth(last.sales,previous.sales)}`,`${previous.year}년 대비 ${last.year}년 매출액 변화`, '계산: (당기 매출 / 전기 매출 - 1) × 100']:['비교 가능한 전기 자료가 없습니다.']);
tablePage(p,'매출총이익 구조',['sales','cost_of_sales','gross_profit']);
bulletsPage(p,'매출총이익률',ratios('gross_profit','sales'));
tablePage(p,'판매관리비',['sales','selling_admin','gross_profit']);
tablePage(p,'영업이익 추이',['sales','operating_profit']);
bulletsPage(p,'영업이익률',ratios('operating_profit','sales'));
tablePage(p,'당기순이익',['operating_profit','pretax','income_tax','net_profit']);
tablePage(p,'자산 규모',['assets']);
tablePage(p,'자산 구성',['assets','current_assets','noncurrent_assets']);
tablePage(p,'매출채권',['sales','receivables']);
tablePage(p,'재고자산',['cost_of_sales','inventory']);
tablePage(p,'부채와 자본',['assets','liabilities','equity']);
bulletsPage(p,'부채비율',ratios('liabilities','equity'));
bulletsPage(p,'유동성',ratios('current_assets','current_liabilities'),'유동비율 = 유동자산 ÷ 유동부채.');
tablePage(p,'차입금과 매입채무',['liabilities','short_debt','payables']);
tablePage(p,'현금과 운전자금',['cash','receivables','inventory','current_liabilities']);
tablePage(p,'이자비용과 영업이익',['interest','operating_profit','pretax']);
bulletsPage(p,'성장계획',['사용자 입력 성장계획: '+(D.plan_note||'자료 없음'),'목표·가정은 확정 실적과 구분해 별도 검증합니다.']);
bulletsPage(p,'자금 활용 계획',['사용자 입력 자금 활용: '+(D.funding_note||'자료 없음'),'금액·금리·만기는 관련 근거를 확인한 후 반영합니다.']);
bulletsPage(p,'확인할 주요 항목',['미확인 계정과 기간별 자료를 보완합니다.','매출채권 회수, 재고와 차입 조건을 확인합니다.','경영계획은 관련 원자료와 함께 검토합니다.']);
bulletsPage(p,'원자료 대조와 검산',rows.map(r=>`${r.year}년 · ${checks(r)}`).concat(['상세 계정별 출처는 별도 검산 기록을 확인하세요.']));
if(p._slides.length!==25)throw Error('종합 보고서 장수 오류: '+p._slides.length);await p.writeFile({fileName:path.join(dir,'comprehensive-25.pptx')});}
fs.mkdirSync(dir,{recursive:true});(async()=>{await deep();await comprehensive()})().catch(e=>{console.error(e.message);process.exit(1)});
