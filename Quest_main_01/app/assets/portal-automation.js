(function(root){'use strict';
const PLANS={
 'tax-return':['세금신고','법인세 신고','신고내역 조회(접수증·납부서)'],
 'tax-history':['세금신고','신고서 조회/삭제/부속서류','전자신고 결과 조회'],
 'tax-due':['납부·고지·환급','세금납부','납부내역 조회'],
 'tax-refund':['납부·고지·환급','국세환급','환급금 상세조회'],
 'business-registration':['증명·등록·신청','즉시발급 증명','사업자등록증명'],
 employment:['정보조회','보험가입정보 조회','근로자고용정보현황조회'],
 'insurance-rate':['정보조회','보험료정보 조회','사업장요율조회'],
 'insurance-paid':['제증명발급','증명서 발급','납부확인서'],
 'insurance-edi':['제증명','제증명신청','납부확인서 신청 및 발급'],
 salary:['지급명세·자료제출','근로소득 지급명세서','제출내역 조회']
};
const normalize=s=>String(s||'').replace(/[\s·ㆍ/()（）－-]/g,'').trim();
const allowed=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['hometax.go.kr','nts.go.kr','comwel.or.kr','kcomwel.or.kr','nhis.or.kr'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h))}catch{return false}};
function plan(id){return PLANS[id]?[...PLANS[id]]:[]}
// Runs only in the app's embedded official-site browser, never in its analysis page.
function step(job){
 if(!allowed(location.href))return{state:'external',message:'공식기관 외 화면 · 자동 조작 중지'};
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.disabled;
 const links=()=>[...document.querySelectorAll('a,button,[role="tab"],[role="menuitem"]')].filter(visible);
 const find=text=>links().filter(e=>normalize(e.innerText||e.textContent)===normalize(text));
 const body=document.body?.innerText||'',logout=links().some(e=>normalize(e.innerText||e.textContent)==='로그아웃');
 const companyText=body.replace(/\s/g,'');
 const companyId=String(job.companyId||'').replace(/\D/g,''),bare=String(job.companyName||'').replace(/\s/g,'').replace(/^주식회사|^\(주\)|주식회사$|\(주\)$/g,''),company=(companyId.length===10&&companyText.includes(companyId))||(bare.length>1&&['주식회사'+bare,'(주)'+bare,bare+'주식회사',bare+'(주)'].some(n=>companyText.includes(n)));
 if(job.authConfirmed&&!logout&&(find('로그인').length||/로그인이 필요|로그인 후 이용/.test(body)))return{state:'session-expired',message:'기관 로그인 만료 · 공식 인증을 다시 진행하세요.'};
 if(!logout&&!job.authConfirmed){
  const dialogOpen=[...document.querySelectorAll('input[type="password"],input[name="certselect_lite_input1"],[role="dialog"]')].some(e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
  if(job.phase==='login'&&!dialogOpen){
   if(false){const b=document.getElementById('btnEntrCrt');if(b&&visible(b)&&root.__returnCheckAuthStep!=='certificate'){root.__returnCheckAuthStep='certificate';b.click();return{state:'auth',message:'공식 인증창에서 NPKI 두 파일 또는 PFX/P12를 선택하세요.'}}}
   const certificate=find('공동인증서 로그인').concat(find('공동인증서'));
   if(certificate.length===1&&root.__returnCheckAuthStep!=='certificate'){root.__returnCheckAuthStep='certificate';certificate[0].click();return{state:'auth',message:'기관 공동인증 화면을 여는 중'}}
   const login=find('로그인');if(login.length===1&&!root.__returnCheckAuthStep){root.__returnCheckAuthStep='login';login[0].click();return{state:'auth',message:'기관 로그인 화면을 여는 중'}}
  }
  return{state:'auth',message:'공식기관의 법인 공동인증을 완료하세요. 인증서·암호는 해당 기관 화면에만 입력합니다.'};
 }
 if(!job.authConfirmed)return{state:company?'authenticated':'company-check',message:company?'기업 로그인·대상 법인 표시 확인':'로그인은 확인되었으나 대상 법인명·번호를 화면에서 확인해야 합니다.'};
 if(job.phase==='navigate'){
  const path=Array.isArray(job.menu)&&job.menu.length?job.menu:plan(job.id),text=path[job.menuIndex];if(!text)return{state:'menu-complete'};const matches=find(text);
  if(matches.length===1){matches[0].click();return{state:'menu-clicked',message:text}}
  if(matches.length>1)return{state:'manual',message:text+' 메뉴가 여러 곳입니다. 해당 서류의 메뉴를 선택하고 현재 화면 사용을 누르세요.'};
  if(!job.allMenuOpened){const all=find('전체 메뉴');if(all.length===1){all[0].click();return{state:'all-menu-opened',message:'전체 메뉴에서 '+text+' 찾는 중'}}}
  return{state:'manual',message:text+' 메뉴를 찾지 못했습니다. 기관 개편·권한·팝업을 확인하고 해당 메뉴에서 현재 화면 사용을 누르세요.'};
 }
 if(job.phase==='set-year'){
  const years=[...document.querySelectorAll('select')].filter(visible).filter(e=>/귀속|사업연도|기준연도|기준년도|조회연도|조회년도|년도|연도/.test([e.getAttribute('aria-label'),e.name,e.id,document.querySelector('label[for="'+CSS.escape(e.id)+'"]')?.textContent].join(' '))&&[...e.options].some(o=>normalize(o.textContent).replace('년','')===String(job.year)||o.value===String(job.year)));
  if(years.length===1){const select=years[0],option=[...select.options].find(o=>o.value===String(job.year)||normalize(o.textContent).replace('년','')===String(job.year));select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));return{state:'year-set',message:job.year+'년 선택'}}
  return{state:'parameters',message:job.year+'년의 기간·사업장·세목·사업명을 기관 화면에서 선택한 뒤 조회조건 준비 완료를 누르세요.'};
 }
 if(job.phase==='query'){
  let matches=find('조회');if(!matches.length)matches=find('검색');if(matches.length!==1)return{state:'parameters',message:'조회 버튼·기간·사업장 조건을 직접 확인하세요. 조회를 완료한 뒤 조회 완료를 누르세요.'};
  matches[0].click();return{state:'queried',message:job.year+'년 조회 요청'};
 }
 if(job.phase==='export'){
  if([...document.querySelectorAll('[aria-busy="true"],#loading,.loading,.loading_wrap,.blockUI.blockOverlay')].some(visible))return{state:'loading',message:'기관 조회·발급 응답을 기다리는 중'};
  if(/조회된 (?:내역|자료|데이터)(?:이|가) 없습니다|검색 ?결과가 없습니다|조회 ?결과가 없습니다|신청 ?내역이 없습니다/.test(body))return{state:'empty',message:job.year+'년 기관 조회 결과 없음 · 자격 미해당/지원액 0원으로 확정하지 않음'};
  const names=['엑셀다운로드','엑셀 다운로드','엑셀저장','엑셀 저장','PDF다운로드','PDF 다운로드','PDF저장','PDF 저장'];
  const matches=links().filter(e=>names.some(n=>normalize(n)===normalize(e.innerText||e.textContent)));
  if(matches.length===1){matches[0].click();return{state:'download-requested',message:'기관 파일 다운로드 요청 · 완료 이벤트 대기'}}
  return{state:'manual-export',message:'기관 화면의 엑셀·PDF 저장/통지서 출력으로 발급하세요. 파일 다운로드가 실제 완료되어야 확보로 기록됩니다.'};
 }
 return{state:'waiting',message:'기관 응답 대기'};
}
const api={plan,allowed,step};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PortalAutomation=api;
})(typeof window!=='undefined'?window:globalThis);
