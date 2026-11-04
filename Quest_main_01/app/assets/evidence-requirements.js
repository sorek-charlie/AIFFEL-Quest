(function(root){'use strict';
const DOCS={
 tax:{name:'법인세 신고서·공제/감면·이월 명세',agency:'국세청 홈택스',route:'tax-return',detail:'해당 귀속의 정기·수정·경정 신고 및 세액조정계산서 전체'},
 history:{name:'전자신고·결정/경정 내역',agency:'국세청 홈택스 / 관할 세무서',route:'tax-history',detail:'최종 유효 신고·접수일·경정결정과 기청구 여부 대조'},
 employment:{name:'고용보험 취득·상실·휴직 이력',agency:'근로복지공단 토탈서비스',route:'employment',detail:'대상 사업장 전체 이력. 전년 비교가 필요한 공제는 전년도도 포함'},
 insurance:{name:'4대보험 납부확인서·고지/산출내역',agency:'국민건강보험공단 통합징수포털',route:'insurance-paid',detail:'건강·연금·고용·산재 실납부·정산·지원/감면 내역. 요율표로 대체 불가'},
 monthlyInsurance:{name:'개인별·월별 납부·산출 보완자료',agency:'국민건강보험공단 EDI',route:'insurance-edi',detail:'사용자 부담과 근로자 부담을 구분할 수 있는 월별 자료'},
 payroll:{name:'근로소득 지급명세서 제출내역',agency:'국세청 홈택스',route:'salary',detail:'해당 귀속과 비교연도 제출자료. 회사 월별 급여대장을 대신하지 않음'},
 paid:{name:'법인세 실납부 내역',agency:'국세청 홈택스',route:'tax-due',detail:'납부할 세액 목록이 아닌 실제 납부내역·납부일·세목'},
 refund:{name:'국세환급금 상세내역·결정통지',agency:'국세청 홈택스',route:'tax-refund',detail:'법인세 세목·환급 결정일·기지급액을 구분'},
 business:{name:'사업자등록증명·등록 변경 이력',agency:'국세청 홈택스',route:'business-registration',detail:'법인명·업종·사업장·개업일·주소 변경 확인'},
 local:{name:'법인지방소득세 신고·납부·경정결정',agency:'위택스 / 관할 지방자치단체',url:'https://www.wetax.go.kr/',detail:'해당 귀속 신고서·공제/감면·실납부·기환급·결정 내역. 홈택스 국세 신고와 별도'},
 research:{name:'연구소·전담부서 인정 및 변경 자료',agency:'해당 인정기관',detail:'인정번호·인정/변경일 확인. 연구비의 적격성은 회사 연구·지출 증빙과 별도 대조'},
 foreign:{name:'국외 납세·원천징수·확정세액 증빙',agency:'해당 국가의 과세기관',detail:'납부세목·대상소득·납부일·확정세액. 국내 법인 공동인증서로 해외기관 일괄 발급된다고 보장하지 않음'},
 disaster:{name:'재해 사실·피해 확인자료',agency:'관할 지방자치단체·해당 확인기관',detail:'재해일·피해 사실·확인 범위와 재해손실 계산자료 대조'},
 filing:{name:'성실신고 확인서 제출·접수 내역',agency:'국세청 홈택스',route:'tax-history',detail:'해당 귀속 제출 여부·제출일·확인자 대조'},
 special:{name:'해당 특례의 지정·인가·인증 증빙',agency:'해당 지정·인가 기관',detail:'특구 입주·사회적기업·업종 인허가 등 실제 적용하려는 특례별 문서'}
};
const employment={government:['tax','employment','payroll'],company:['월별 근로자 명부·입퇴사 및 휴직/복직 대장','근로계약서·계약갱신·주당 근로시간','임원·대표자·친족 등 제외인원 확인 명단','개인별 급여대장·급여 지급증빙'],questions:['비교연도와 해당 연도에 사업양수·합병·고용승계·사업장 이동이 있었나요?','임원·친족·단시간·단기계약 등 제외대상과 적용기간은 무엇인가요?','청년의 연령·병역기간과 해당 연도 고용감소 사유를 확인했나요?']};
const tax={government:['tax','history'],company:['공제/감면별 산출 원장·회계전표·원 증빙','기신고·기청구·기공제와 발생연도별 이월 사용 원장'],questions:['해당 연도에 적용하려는 공제의 실제 대상 지출·사실이 있었나요?','이미 공제·감면·환급을 받았거나 다른 항목과 중복되는 금액이 있나요?']};
const extra={
 'employment-old':{base:employment,company:['종전 고용증대 공제의 발생연도·선택·계속공제 내역'],questions:['2023~2024년 종전/통합 중 어떤 제도를 선택했고 기존 신고와 일치하나요?']},
 'employment-integrated':{base:employment,company:['통합고용 공제 계산서와 청년등 인원 산출표'],questions:['통합고용의 청년·추가공제 대상과 종전 공제 중복을 구분했나요?']},
 continued:{base:employment,company:['최초 발생연도별 1·2·3차 공제 및 감소 사후관리 원장'],questions:['최초 발생분의 고용유지·감소·청년 간주 요건을 각 계속연도별로 확인했나요?']},
 carry:{base:tax,government:['paid','refund'],company:['발생연도·유효기간별 기초·사용·기말 이월명세'],questions:['과거 발생분 중 이미 사용·소멸·추징 조정한 공제가 있나요?']},
 prior:{base:tax,government:['paid'],company:['2021년 이전 발생분 원 신고서와 기말 이월 잔액 근거'],questions:['최초 발생연도·종류·유효기간과 2021년 기초 잔액은 무엇인가요?']},
 repayment:{base:employment,government:['history','paid','refund'],company:['고용감소 원인·추징 횟수·실제 기공제액·농특세 대조표'],questions:['감소인원과 이미 사용한 공제액을 기준으로 추징을 계산했나요?']},
 social:{base:employment,government:['insurance','monthlyInsurance'],company:['근로자별 월별 사업주 실부담 보험료 집계','두루누리 등 지원·감면·보험료 환급 차감표'],questions:['근로자 부담 보험료와 정부 지원액을 사업주 실부담에서 제외했나요?']},
 rnd:{base:tax,government:['research','payroll'],company:['연구과제 계획·연구노트·성과 및 전담업무 자료','연구인력·연구재료·위탁비 구분 원장과 계약/지급증빙'],questions:['일반·신성장·국가전략 연구비 중 어느 구분이고 인정기간·실제 업무가 일치하나요?']},
 invest:{base:tax,company:['자산별 취득계약·세금계산서·지급증빙·고정자산대장','자산 사용개시일·사업용도·기지원금 및 투자비 집계'],questions:['신품/중고·제외자산·취득 및 사용개시일·국고보조금을 확인했나요?']},
 wages:{base:employment,company:['비교연도와 당해 연도 임금 총액·상시인원 산출표'],questions:['임원 등 제외대상·임금증가 계산 대상 범위를 일관되게 적용했나요?']},
 profit:{base:employment,company:['성과공유 약정·성과급 지급규정·개인별 지급 증빙'],questions:['일반 상여금과 해당 제도 요건을 갖춘 경영성과급을 구분했나요?']},
 regular:{base:employment,company:['전환 전·후 근로계약서와 정규직 전환 인사발령'],questions:['실제 전환일·전환 전 고용형태·전환 후 유지기간은 무엇인가요?']},
 return:{base:employment,company:['육아휴직 신청·허용·복직 발령·복직 후 근무/급여 자료'],questions:['휴직·복직일과 복직 후 고용유지 및 통합고용 추가공제 중복을 확인했나요?']},
 career:{base:employment,company:['퇴직·경력단절 사유와 재고용 전후 계약/인사 자료'],questions:['당시 법령의 단절 사유·기간·재고용 대상 요건이 충족되나요?']},
 maintain:{base:employment,company:['근로시간 단축·임금 합의 및 전후 근무/급여 대조표'],questions:['고용유지와 임금·시간 감소 요건을 동시에 충족했나요?']},
 sme:{base:tax,government:['business'],company:['업종별 매출·사업장별 손익·중소기업 규모 판단 근거'],questions:['해당 연도 업종·규모·지역 요건과 다른 공제/감면 중복을 확인했나요?']},
 startup:{base:tax,government:['business'],company:['설립·인수·분할·폐업/재개업 이력 및 사업 개시 증빙'],questions:['실질적인 신규 창업인지 사업승계·확장인지, 청년·지역 요건이 맞나요?']},
 rent:{base:tax,company:['임대차계약·인하 합의서·인하 전후 임대료 수납 증빙','임차인 요건 확인자료와 지원금/보전액 내역'],questions:['인하 기간·인하액·임차인 요건과 돌려받은 보전액이 있나요?']},
 foreign:{base:tax,government:['foreign'],company:['국외 원천소득·외국납부세액·환율 및 한도 계산표'],questions:['소득 귀속과 국외 확정세액·국내 한도·이월/공제 사용을 대조했나요?']},
 withholding:{base:tax,government:['paid','refund'],company:['원천징수영수증·이자/배당 명세·회계전표'],questions:['법인 귀속 원천납부 세액 중 이미 공제·환급받은 금액이 있나요?']},
 disaster:{base:tax,government:['disaster'],company:['재해일 현재 자산가액·피해액·보험보전액·손실 산출 근거'],questions:['피해 자산·손실 비율·보전금·신청시기 요건을 확인했나요?']},
 electronic:{base:tax,company:['전자신고 수행 주체·업무 위임 및 수수료 증빙'],questions:['회사 직접 신고인가요, 외부 대리 신고인가요? 공제 주체를 확인했나요?']},
 filing:{base:tax,government:['filing'],company:['성실신고 확인 계약·세금계산서·실제 수수료 지급증빙'],questions:['확인 대상 여부·해당 연도 제출과 비용의 실제 부담자를 확인했나요?']},
 settle:{base:tax,company:['상생결제 약정·단계별 결제명세·현금성 결제일/금액 증빙'],questions:['대상 결제수단·지급기한·공제율·중복을 거래별로 확인했나요?']},
 cooperate:{base:tax,company:['출연·무상임대 계약·수령확인·목적/사용 및 지급 증빙'],questions:['수혜기업·출연 목적·가액·중복 지원 요건이 맞나요?']},
 tech:{base:tax,company:['기술 취득/이전 계약·기술 대상·대가 지급 및 수익 원장'],questions:['대상 기술·거래관계·취득/이전 시점과 대가가 해당 연도 요건에 맞나요?']},
 venture:{base:tax,company:['출자·인수합병 계약·납입증명·보유기간·주주/관계회사 자료'],questions:['대상 기업·투자 방식·특수관계·보유기간 요건을 확인했나요?']},
 training:{base:tax,company:['교육계약·교육대상·교육기관·비용 원장과 국고지원 차감표'],questions:['대상 교육비와 일반 복리후생·보조금 보전분을 구분했나요?']},
 relocate:{base:tax,government:['business'],company:['이전 전후 임대/매매 계약·설비/인력 실제 이전 증빙','사업장별 소득 구분과 기존 사업 폐쇄/전입 이력'],questions:['실제 수도권 밖 이전일·이전 사업 범위와 감면대상 소득을 확인했나요?']},
 special:{base:tax,government:['special'],company:['적용 특례별 사업장·업종·소득·지정기간 증빙'],questions:['어떤 특례 조문을 적용하며 지정/인증·발생연도·사후관리 요건은 무엇인가요?']},
 rural:{base:tax,government:['paid','refund'],company:['공제·추징별 농특세 과세/비과세·기납부/환급 대조표'],questions:['추징에 따른 농특세 환급과 새 공제의 농특세 부담을 구분했나요?']},
 local:{base:tax,government:['local'],company:['국세·지방소득세 조정 차이 및 지방세 별도 계산 원장'],questions:['지방소득세를 별도로 신고·경정했고 기환급·기청구 내역이 있나요?']},
 interest:{government:['paid','refund'],company:['납부일·기환급일·예상 환급결정일 대장'],questions:['환급가산금 대상·기산일·기간별 이율과 기지급 내역을 확인했나요?']},
 'tax-summary':{base:tax},'other-summary':{base:tax,government:['paid','refund','local']}
};
function get(id,year,routes=[]){const specific=extra[id]||tax,base=specific.base||{};const unique=a=>[...new Set(a||[])];const government=unique([...(base.government||[]),...(specific.government||[])]).map(key=>{const d=DOCS[key],route=routes.find(r=>r.id===d.route);return{...d,id:key,url:route?.url||d.url||'',menu:route?.menu||[],year:year||'2021~2025',attached:route?.attached?.length||0}});return{id,year:year||'2021~2025',government,company:unique([...(base.company||[]),...(specific.company||[])]),questions:unique([...(base.questions||[]),...(specific.questions||[])])};}
const api={get,ids:Object.keys(extra)};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EvidenceRequirements=api;
})(typeof window!=='undefined'?window:globalThis);
