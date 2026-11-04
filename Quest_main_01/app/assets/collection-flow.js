(function(){
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key='return-check-company-qna-v1',choices=[['yes','확인 완료'],['no','해당 없음'],['check','확인 필요']];
 const steps={upload:['stepUpload','collectUpload'],cert:['stepCert','collectCert'],qna:['stepQna','collectQna']};
 const questions=[...document.querySelectorAll('#questions .question-list li')].map((li,i)=>({id:'q'+(i+1),title:li.querySelector('b')?.textContent.trim()||'',text:li.querySelector('p')?.textContent.trim()||''}));
 const purposeByUpload={tax:'tax',employment:'employment',contracts:'contracts',payments:'carry'};
 let lastSource='upload',answers={};
 try{answers=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){answers={}}
 function save(){try{localStorage.setItem(key,JSON.stringify(answers))}catch(e){$('qnaStatus').textContent='이 브라우저에 답변을 저장할 수 없습니다. TXT로 저장해 두세요.'}}
 function show(id){if(id!=='qna')lastSource=id;for(const[s,[tab,pane]]of Object.entries(steps)){$(tab).setAttribute('aria-selected',s===id);$(pane).hidden=s!==id}
  $('stepQna').classList.toggle('from-source',id==='qna');$('upload').scrollIntoView({block:'start'})}
 function progress(){const done=questions.filter(q=>answers[q.id]?.choice).length;$('qnaProgress').textContent=done+'/'+questions.length+' 답변';$('qnaProgress').classList.toggle('warn',done<questions.length);return done}
 function renderQna(){$('qnaList').innerHTML=questions.map(q=>{const a=answers[q.id]||{};return `<li data-q="${q.id}"><div><b>${esc(q.title)}</b><p>${esc(q.text)}</p></div><div class="qna-choices" role="radiogroup" aria-label="${esc(q.title)} 답변">${choices.map(([v,l])=>`<label><input type="radio" name="${q.id}" value="${v}" ${a.choice===v?'checked':''}>${l}</label>`).join('')}</div><textarea rows="2" maxlength="2000" placeholder="근거·기간·금액 등 메모 (선택)" aria-label="${esc(q.title)} 메모">${esc(a.memo)}</textarea></li>`}).join('');progress()}
 $('qnaList').addEventListener('input',e=>{const li=e.target.closest('[data-q]');if(!li)return;const a=answers[li.dataset.q]||={};if(e.target.type==='radio')a.choice=e.target.value;else a.memo=e.target.value;save();progress();$('qnaStatus').textContent=''});
 $('qnaExport').onclick=()=>{const label=Object.fromEntries(choices),text=[(window.ReturnCheckApp?.model.company||'회사')+' 법인 Q&A 답변','작성 '+new Date().toLocaleString('ko-KR'),'',...questions.map((q,i)=>`${i+1}. ${q.title}\n   질문: ${q.text}\n   답변: ${label[answers[q.id]?.choice]||'미답변'}\n   메모: ${answers[q.id]?.memo||'-'}\n`)].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+text],{type:'text/plain;charset=utf-8'}));a.download='법인_QnA_답변.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 $('qnaReset').onclick=()=>{if(!confirm('저장된 Q&A 답변을 모두 비울까요?'))return;answers={};save();renderQna();$('qnaStatus').textContent='답변을 비웠습니다.'};
 function simulate(){if(window.ReturnCheckApp?.busy){alert('자료 분석이 끝난 뒤 시뮬레이션을 실행하세요.');return}const left=questions.length-progress();if(left&&!confirm('법인 Q&A '+left+'개가 미답변입니다. 확보 자료 기준으로 시뮬레이션을 실행할까요?')){show('qna');return}location.hash='#results'}
 document.querySelectorAll('[data-collect-step]').forEach(b=>b.onclick=()=>show(b.dataset.collectStep));
 document.querySelectorAll('[data-collect-go]').forEach(b=>b.onclick=()=>{const go=b.dataset.collectGo;go==='simulate'?simulate():show(go==='back'?lastSource:go)});
 // 기관별 업로드 버튼은 자료 종류를 미리 지정한 뒤 파일 선택을 엽니다.
 document.querySelectorAll('[data-upload]').forEach(b=>b.addEventListener('click',()=>{const v=purposeByUpload[b.dataset.upload],sel=$('inputPurpose');if(v&&[...sel.options].some(o=>o.value===v))sel.value=v},true));
 renderQna();
})();
// 단계 번호: 1-1 파일 업로드 / 1-2 공동인증서 자동 수집(병렬) → 2 법인 Q&A → 3 시뮬레이션
(function(){
 const $=id=>document.getElementById(id);if(!$('stepUpload'))return;
 const setStep=(id,num,title,small)=>{const b=$(id);if(!b)return;b.querySelector('b').textContent=num;const s=b.querySelector('span');s.firstChild.textContent=title;if(small)s.querySelector('small').textContent=small};
 const up=$('stepUpload').closest('li'),cert=$('stepCert').closest('li'),or=up.nextElementSibling;
 const group=document.createElement('li');group.className='flow-group';group.innerHTML='<div class="flow-group-label"><b>1</b>자료 확보 <small>둘 중 편한 방법</small></div><ol class="flow-pair"></ol>';
 up.before(group);const pair=group.querySelector('.flow-pair');pair.append(up);if(or&&or.classList.contains('flow-or'))pair.append(or);pair.append(cert);
 setStep('stepUpload','1-1','파일 업로드','ZIP 일괄 또는 기관별·파일별');
 setStep('stepCert','1-2','공동인증서 자동 수집','기관별 순차로 전 서류 일괄 발급');
 setStep('stepQna','2','법인 Q&A','1-1·1-2 이후 회사 확인 답변');
 setStep('stepSimulate','3','시뮬레이션','결과표로 이동');
 const sub=document.querySelector('#upload>.section-head p.muted');if(sub)sub.textContent='1-1 파일 업로드 또는 1-2 법인 공동인증서 자동 수집 → 2 법인 Q&A → 3 시뮬레이션';
 document.querySelectorAll('#upload h3').forEach(h=>{h.textContent=h.textContent.replace(/^①\s*/,'1-1 ').replace(/^②\s*/,'1-2 ').replace(/^③\s*/,'2 ')});
 // 1-2: 공동인증서로 전 기관 서류를 기관별 순차 일괄 발급
 const start=$('startInstitutionCollect'),docs=$('collectorDocuments');if(!start||!docs)return;
 start.textContent='공동인증서로 전 기관 서류 일괄 발급 (기관별 순차)';
 const order=['국세청','근로복지공단','국민건강보험'],rank=a=>{const i=order.findIndex(o=>a.includes(o));return i<0?order.length:i};
 const plan=document.createElement('div');plan.id='collectorPlan';plan.className='collector-plan';start.closest('.collector-start').after(plan);
 const all=document.createElement('label');all.className='collector-all';all.innerHTML='<input type="checkbox" checked> 전 기관·전 서류 선택';docs.before(all);
 const boxes=()=>[...docs.querySelectorAll('input[name="collectorRoute"]')];
 const R=Object.fromEntries((window.ACQUISITION_ROUTES?.routes||[]).map(r=>[r.id,r])),done={},esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const purpose={'tax-return':'tax',employment:'employment'},picker=document.createElement('input');picker.type='file';picker.multiple=true;picker.accept='.zip,.pdf,.xlsx';picker.hidden=true;plan.after(picker);let target=null;
 function render(){const groups=new Map();boxes().filter(b=>b.checked).forEach(b=>{const r=R[b.value]||{},lab=b.closest('label'),agency=(r.agency||lab.querySelector('small')?.textContent||'기타').split('/')[0].trim();if(!groups.has(agency))groups.set(agency,{url:r.url,docs:[]});groups.get(agency).docs.push({id:b.value,name:r.name||lab.querySelector('span').firstChild.textContent.trim(),menu:r.menu||[]})});
  const list=[...groups].sort((a,b)=>rank(a[0])-rank(b[0]));all.querySelector('input').checked=boxes().every(b=>b.checked);
  plan.innerHTML=list.length?'<p class="plan-lead"><b>발급 순서</b> — 기관마다 법인 공동인증서로 한 번 인증하면 그 기관 서류를 2021~2025년 순으로 이어서 발급하고 다음 기관으로 넘어갑니다. 직접 내려받은 파일은 해당 서류 줄의 <b>파일 올리기</b>로 바로 넣을 수 있습니다.</p>'+list.map(([a,g],i)=>`<section class="plan-agency"><header><span class="agency">${i+1}. ${esc(a)}</span><em>인증 1회 · 서류 ${g.docs.length}개</em>${g.url?`<a href="${esc(g.url)}" target="_blank" rel="noopener">공식 사이트 열기 ↗</a>`:''}</header><ol>`+g.docs.map((d,j)=>`<li data-route="${esc(d.id)}" class="${done[d.id]?.ok?'done':''}"><span class="doc"><i>${i+1}-${j+1}</i>${esc(d.name)}</span><span class="menu">${d.menu.map(esc).join(' <b>›</b> ')||'-'}</span><span class="up"><button type="button" class="plan-upload" data-route="${esc(d.id)}">파일 올리기</button>${done[d.id]?`<small class="plan-status${done[d.id].ok?'':' warn'}">${esc(done[d.id].text)}</small>`:''}</span></li>`).join('')+'</ol></section>').join(''):'<b>수집할 서류를 선택하세요.</b>'}
 plan.addEventListener('click',e=>{const b=e.target.closest('.plan-upload');if(!b)return;if(window.ReturnCheckApp?.busy){alert('다른 파일을 분석하는 중입니다. 끝난 뒤 다시 올리세요.');return}target=b.dataset.route;picker.click()});
 picker.onchange=async()=>{const files=[...picker.files];picker.value='';if(!files.length||!target||!window.ReturnCheckApp)return;const sel=$('inputPurpose');if(sel&&purpose[target]&&[...sel.options].some(o=>o.value===purpose[target]))sel.value=purpose[target];
  done[target]={ok:false,text:'분석 중…'};render();const r=await ReturnCheckApp.ingest(files);if(sel)sel.value='auto';
  done[target]=r?{ok:!r.errors,text:files.map(f=>f.name).join(', ')+' · '+(r.errors?r.errors+'개 확인 필요(아래 업로드 결과 참고)':'반영 완료')}:{ok:false,text:'다른 분석이 진행 중이라 넣지 못했습니다.'};render()};
 all.querySelector('input').onchange=e=>{boxes().forEach(b=>b.checked=e.target.checked);render()};docs.addEventListener('change',render);render();
})();
