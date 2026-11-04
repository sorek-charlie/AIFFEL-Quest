/* Reports are generated from the current session only; no company reports ship. */
(function(){'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v===null||v===undefined?'미판정':Number(v).toLocaleString('ko-KR');
 const titles={1:'연도별 결과·카테고리별 연도',2:'요약 + 항목별 결과',3:'2차 항목별 분석·설명',4:'업로드 자료 분석'};
 const dialog=document.createElement('dialog');dialog.className='session-report';dialog.setAttribute('aria-label','현재 회사 보고서 미리보기');
 dialog.innerHTML='<div class="session-report-tools"><b>보고서 미리보기</b><button data-save>HTML 저장</button><button data-print>인쇄 / PDF 저장</button><button data-close>닫기</button></div><iframe title="현재 업로드 자료 보고서" sandbox="allow-same-origin allow-modals"></iframe>';
 document.body.append(dialog);let html='',version=1;
 const table=(heads,rows)=>'<table><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 function panel(id){const p=document.getElementById(id)?.closest('.panel');if(!p)return'';const c=p.cloneNode(true);c.querySelectorAll('button,label').forEach(x=>x.remove());return c.outerHTML}
 function generate(n){const app=window.ReturnCheckApp,m=app.model,r=app.result;
  let body='';
  if(n===1||n===2){body=document.querySelector('#results .summary').outerHTML+panel('annualCombinedRows')+panel('categoryYearRows');if(n===2)body+=panel('itemYearRows')}
  if(n===3){body=table(['연도','항목','판정','공제 발생액','환급 반영액','부족자료','근거'],(window.Analysis2?.rows||[]).map(x=>[x.year,x.name,x.status,money(x.amount),money(x.cash),x.missing,x.basis]))}
  if(n===4){body=table(['파일명·서류명','원본 파일명','기관·부서','지정 귀속연도','크기(byte)','분석 결과'],app.files.map(f=>[f.displayName||f.documentName||f.name,f.name,f.agency||'자동 분류',f.declaredYear==='auto'?'전체·자동 확인':f.declaredYear||'자동 확인',f.bytes??'',f.status]));body+='<p>파일 원문과 개인별 식별번호는 이 목록에 포함하지 않습니다. 법인명과 파일명도 회사정보이므로 저장·공유 전에 확인하세요.</p>'}
  const links=[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>'<link rel="stylesheet" href="'+esc(l.href)+'">').join('');
  return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>'+esc(titles[n])+'</title>'+links+'<style>body{margin:0;background:white;color:#17324d;font:14px/1.5 sans-serif}main{padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd9e5;padding:8px;text-align:left;overflow-wrap:anywhere}th{background:#eaf0f8}h1{font-size:22px}.scroll{overflow:visible!important}.matrix-category{position:static!important}.matrix-detail{display:none}@media print{@page{size:A4 landscape;margin:10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}main{padding:0}tr{break-inside:avoid}}</style></head><body><main><h1>'+esc(m.company||'현재 회사')+' · '+esc(titles[n])+'</h1><p>생성일 '+esc(new Date().toLocaleDateString('ko-KR'))+' · 현재 업로드 자료 기준 · 검토용 시뮬레이션</p><section id="results">'+body+'</section></main></body></html>';
 }
 document.querySelectorAll('[data-report]').forEach(button=>button.onclick=()=>{const app=window.ReturnCheckApp;if(!app||!app.files.length){alert('회사 자료를 업로드한 뒤 보고서를 생성하세요.');return}if(app.busy){alert('자료 분석이 끝난 뒤 보고서를 생성하세요.');return}version=+button.dataset.report;html=generate(version);dialog.querySelector('iframe').srcdoc=html;dialog.querySelector('b').textContent=titles[version];dialog.showModal()});
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.querySelector('[data-print]').onclick=()=>dialog.querySelector('iframe').contentWindow.print();
 dialog.querySelector('[data-save]').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));a.download='경정청구_보고서'+version+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 const style=document.createElement('style');style.textContent='.session-report{width:95vw;max-width:none;height:90vh;padding:12px;border:1px solid #ccd9e5;border-radius:12px}.session-report::backdrop{background:#17324d88}.session-report-tools{display:flex;align-items:center;gap:10px;padding:8px}.session-report-tools b{margin-right:auto}.session-report iframe{width:100%;height:calc(100% - 60px);border:0}';document.head.append(style);
})();
