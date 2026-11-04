(function(){
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>n===null||n===undefined?'자료 필요':n.toLocaleString('ko-KR')+'원';
 const signed=n=>n===null||n===undefined?'자료 필요':(n>0?'+':n<0?'−':'')+Math.abs(n).toLocaleString('ko-KR')+'원';
 const emptyModel=()=>({company:'',companyId:'',officerName:'',taxes:{},employment:null});
 const shortName=n=>String(n||'').replace(/^주식회사\s*/,'(주)').replace(/\s*주식회사$/,'(주)');
 let model=emptyModel(),result,files=[],busy=false;
 let intakeContext={intent:"auto",declaredYear:"auto"},parsedInputMeta={actualType:"참고자료",actualYears:[]};
 function applyFiled(){if(!model.employment)return;for(const t of Object.values(model.taxes||{}))for(const[y,h]of Object.entries(t.filedIntegrated||model.employment.filedIntegrated||{})){
   model.employment.integrated||={};model.employment.filedIntegrated||={};model.employment.filedIntegrated[y]=h;model.employment.integrated[y]={...(model.employment.integrated[y]||{}),...h,filed:true};if(model.employment.annual[y]){model.employment.annual[y].total=h.total;model.employment.annual[y].totalSource=h.source}
 }}
 function render(){
  applyFiled();result=ReturnTax.estimate(model);document.body.classList.toggle('no-data',!(Object.keys(model.taxes||{}).length||model.employment));const has=result.rows.some(r=>r.refund!==null);
  $('companyName').textContent=shortName(model.company)||(model.companyId?'사업자 '+model.companyId:'회사 자료 업로드 대기');if($('topCompany'))$('topCompany').textContent=(model.company||'회사 자료 업로드 대기')+' · 법인세';if($('overviewCompany'))$('overviewCompany').textContent=shortName(model.company)||'회사별 결과';$('grossTotal').textContent=has?signed(result.gross):'자료 필요';$('netTotal').textContent=has?signed(result.net):'자료 필요';$('ruralTotal').textContent=signed(-result.rural);
  $('resultLabel').textContent='전 연도 검토 · 확보 자료 기준 예상';
  if($('yearResults'))$('yearResults').innerHTML=result.rows.map(r=>`<article class="year ${r.refund>0?'active':''}"><div class="year-label">${r.year}년</div><div class="number ${r.refund<0?'negative':'positive'}">${signed(r.refund)}</div><div class="cash-parts"><span>환급 ${signed(r.used+r.otherUsed)}</span><span class="negative">추징 ${signed(-r.recapture)}</span></div><div class="need">부족 · ${esc(r.missingShort)}</div></article>`).join('');
  $('taxRows').innerHTML=result.rows.map(r=>`<tr><td>${r.year}</td><td>${money(r.tax?.burden)}</td><td>${money(r.minimum)}</td><td class="positive">${signed(r.used+r.otherUsed)}</td><td class="negative">${signed(-r.recapture)}</td><td>${signed(r.refund)}</td><td>${signed(-r.rural)}</td><td>${signed(r.net)}</td></tr>`).join('');
  $('headRows').innerHTML=Object.entries(model.employment?.annual||{}).map(([y,h])=>`<tr><td>${y}</td><td>${h.total.toFixed(2)}</td><td>${h.youth.toFixed(2)}</td><td>${model.employment.integrated?.[y]?.youth?.toFixed(2)??'자료 필요'}</td><td>${esc(model.employment.integrated?.[y]?.filed?'신고서 39쪽 우선':'고용 이력 잠정')}</td></tr>`).join('');
  $('reviewCount').textContent=result.review.length+'개 연도·항목 검토';$('overviewCount').textContent=result.review.length+'개 항목';$('loadedCount').textContent=Object.keys(model.taxes||{}).length+'/5개년 신고서 · '+(model.employment?'고용자료 반영':'고용자료 필요');
  $('datasetLabel').textContent=files.length?'추가 자료 '+files.filter(f=>!f.error).length+'개 처리':'자료 업로드 대기 · 실행 시 초기화';
  $('reconciliation').textContent=model.reconciliation||'원 신고서 PDF를 요약 엑셀보다 우선합니다.';
  $('planLabel').textContent='신규 공제의 선택 가능 조합 '+result.comparisons.length+'개 비교 · 확인 가능한 5개년 순환급 우선. 기존 2025 통합고용 공제는 유지합니다.';
  $('ledgerRows').innerHTML=result.events.map(e=>`<tr><td>${e.year}</td><td>${e.origin} 발생</td><td>${e.mode==='old'?'고용증대':'통합고용'}</td><td>${esc(e.kind)}</td><td class="${e.amount<0?'negative':''}">${signed(e.amount)}</td></tr>`).join('');
  $('sourceRows').innerHTML=Object.values(model.taxes||{}).map(t=>`<tr><td>${t.year}</td><td>${esc(t.source)}</td><td>${esc(t.page)}쪽</td></tr>`).join('');renderReview();window.Analysis2?.refresh(model,result,files);window.ResultMatrixUI?.render();
 }
 function renderReview(){window.Analysis2?.renderTable()}
 function feedback(s,error=false){$('uploadStatus').textContent=s;$('uploadStatus').classList.toggle('error',error)}
 function renderFiles(){$('fileResults').innerHTML=files.map(f=>`<div class="file-row"><span>${esc(f.displayName||f.name)}${f.documentName?`<small>${esc([f.agency,f.documentName,f.declaredYear==='auto'?'연도 자동 확인':f.declaredYear].filter(Boolean).join(' · '))}</small>`:''}${f.displayName&&f.displayName!==f.name?`<small>원본: ${esc(f.name)}</small>`:''}</span><span class="${f.error?'negative':'positive'}">${esc(f.status)}</span></div>`).join('')}
 function accept(id){if(!id)throw Error('사업자등록번호를 확인할 수 없는 자료입니다.');if(!model.companyId){model.companyId=id;return}if(id!==model.companyId)throw Error('다른 회사 자료입니다(현재 '+model.companyId+'). 다른 회사는 Reset 후 업로드하세요.')}
 function mergeTax(t){accept(t.companyId);if(t.companyName&&!model.company)model.company=t.companyName;if(t.ceo&&!model.officerName)model.officerName=t.ceo;const old=model.taxes[t.year];if(old?.origin==='pdf'&&t.origin==='summary')return '원 신고서 우선 유지';if(old?.origin==='pdf'&&t.origin==='pdf'&&['base','applied','burden'].some(k=>old[k]!==t[k]))throw Error(t.year+'년 신고서 금액 충돌 · 수정·경정 확인 필요');model.taxes[t.year]=t;applyFiled();return t.year+'년 세액 반영'}
 async function processOne(name,buffer){
  parsedInputMeta={actualType:"참고자료·요건 검토 필요",actualYears:[]};
  if(/\.xlsx$/i.test(name)){const sheets=await SourceReader.workbook(buffer),rows=Object.values(sheets).find(rows=>rows.some(r=>r.some(v=>String(v).replace(/\s/g,'')==='고용취득일')));
   if(rows){const e=SourceReader.employment(rows,name,model.officerName||'');accept(e.companyId);parsedInputMeta={actualType:"고용 이력 XLSX",actualYears:Object.entries(e.annual).filter(([y,h])=>h.total>0).map(([y])=>+y)};const prior=model.employment?.filedIntegrated;e.filedIntegrated=prior||{};model.employment=e;applyFiled();return '고용 '+e.records+'이력 분석'}
   const taxes=SourceReader.summaryTax(sheets,name);if(taxes.length){parsedInputMeta={actualType:"법인세 종합정보 XLSX",actualYears:taxes.map(t=>t.year)};taxes.forEach(mergeTax);return taxes.length+'개년 원 신고서 대조'}return '참고자료 읽음 · 요건 검토 필요';
  }
  if(/\.pdf$/i.test(name)){const pages=await SourceReader.pdfPages(buffer),tax=SourceReader.pdfTax(pages,name);if(tax){parsedInputMeta={actualType:"법인세 원 신고서 PDF",actualYears:[tax.year]};if(intakeContext.documentId?.startsWith('tax-return:')&&String(tax.year)!==String(intakeContext.declaredYear))throw Error('지정 연도 '+intakeContext.declaredYear+'년과 신고서 귀속 '+tax.year+'년이 다릅니다. 해당 연도 칸에 첨부하세요.');return mergeTax(tax);}if(intakeContext.documentId?.startsWith('tax-return:'))throw Error('법인세 신고서·세액조정계산서를 인식하지 못했습니다. 서류와 PDF 형식을 확인하세요.');if(!pages.some(p=>p.text.replace(/\s/g,'').length>30))throw Error('문자 인식 필요 · 스캔 PDF');return '본문 읽음 · 공제 요건 검토 필요'}
  if(intakeContext.documentId?.startsWith('other:')&&/\.(jpg|jpeg|png|hwp|hwpx|doc|docx|txt|csv|xls)$/i.test(name)){parsedInputMeta={actualType:'기타 첨부파일(참고용)',actualYears:[]};return '참고자료 첨부 · 자동계산 미반영'}throw Error('지원 형식 ZIP·XLSX·문자형 PDF');
 }
 async function ingest(selected,context){
  if(busy||!selected.length)return;intakeContext={...(window.Analysis2?.intakeContext()||{intent:"auto",declaredYear:"auto"}),...context};busy=true;document.querySelectorAll('[data-upload],#zipPick,#filesPick,#clearSources').forEach(e=>e.disabled=true);let processed=0,errors=0;feedback('자료를 분석하고 있습니다…');$('uploadProgress').hidden=false;
  try{const entries=[];for(const f of selected){if(f.size>50*1024*1024){files.push({name:f.name,...intakeContext,actualType:'분석 실패',actualYears:[],error:true,status:'파일당 50MB 제한'});errors++;continue}
   if(/\.zip$/i.test(f.name)){try{const z=await SourceReader.unzip(await f.arrayBuffer());for(const e of Object.values(z.files).filter(e=>!e.dir&&!/(^|\/)__MACOSX\//.test(e.name)))entries.push({name:e.name,read:()=>e.async('arraybuffer')})}catch(e){files.push({name:f.name,error:true,status:'ZIP 읽기 실패'});errors++}}
   else entries.push({name:f.name,read:()=>f.arrayBuffer()});}
   entries.sort((a,b)=>Number(/\.pdf$/i.test(b.name))-Number(/\.pdf$/i.test(a.name)));
   for(const e of entries){feedback('분석 '+(processed+1)+'/'+entries.length+' · '+e.name);let receipt;try{const buf=await e.read();const status=await processOne(e.name,buf);receipt={name:e.name,bytes:buf.byteLength,...intakeContext,...parsedInputMeta,status,error:false}}catch(error){receipt={name:e.name,...intakeContext,actualType:"분석 실패",actualYears:[],error:true,status:error.message};errors++}files.push(receipt);processed++;$('progressBar').style.width=Math.round(processed/entries.length*100)+'%';renderFiles();render();window.Analysis2?.recordInput(receipt);await new Promise(r=>setTimeout(r,0))}
   feedback(processed+'개 파일 처리 · '+(errors?errors+'개 확인 필요':'재계산 완료'),errors>0);return {processed,errors};
  }finally{busy=false;document.querySelectorAll('[data-upload],#zipPick,#filesPick,#clearSources').forEach(e=>e.disabled=false);$('zipInput').value='';$('filesInput').value='';render();renderFiles()}
 }
 function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
 $('zipPick').onclick=()=>$('zipInput').click();$('filesPick').onclick=()=>$('filesInput').click();$('zipInput').onchange=e=>ingest([...e.target.files]);$('filesInput').onchange=e=>ingest([...e.target.files]);document.querySelectorAll('[data-upload]').forEach(b=>b.onclick=()=>$('filesInput').click());
 function tab(id){$('uploadPane').hidden=id!=='upload';$('guidePane').hidden=id!=='guide';$('tabUpload').setAttribute('aria-selected',id==='upload');$('tabGuide').setAttribute('aria-selected',id==='guide')}
 $('tabUpload').onclick=()=>tab('upload');$('tabGuide').onclick=()=>tab('guide');
 const zone=$('dropzone');zone.ondragover=e=>{e.preventDefault();zone.classList.add('dragover')};zone.ondragleave=()=>zone.classList.remove('dragover');zone.ondrop=e=>{e.preventDefault();zone.classList.remove('dragover');ingest([...e.dataTransfer.files])};
 $('clearSources').onclick=()=>{model=emptyModel();files=[];renderFiles();render();window.dispatchEvent(new Event('returncheck:clear'));feedback('새 ZIP 또는 개별 파일을 추가하세요.')};
 $('reviewYear').onchange=renderReview;$('reviewSearch').oninput=renderReview;
 $('exportCsv').onclick=()=>{const cell=v=>'"'+String(v??'자료 필요').replace(/"/g,'""')+'"',rows=[['연도','추가환급','추징(음수)','순환급','농특세증감(현금부호)','농특세반영후','부족자료'],...result.rows.map(r=>[r.year,r.used+r.otherUsed,-r.recapture,r.refund,-r.rural,r.net,r.missingItems.join(' / ')]),['합계',sum(result.rows.map(r=>r.used+r.otherUsed)),-sum(result.rows.map(r=>r.recapture)),result.gross,-result.rural,result.net,'확보자료 기준 예상']];download('2021-2025_연도별_예상환급.csv','\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8')};
 const sum=a=>a.reduce((s,n)=>s+n,0);
 $('exportJson').onclick=()=>download('전연도_세액공제_검토근거.json',JSON.stringify({schema:3,company:model.company,result,sources:model.taxes,employment:model.employment},null,2),'application/json');$('printResult').onclick=()=>window.print();
 function route(){let id=location.hash.slice(1)||'upload';if(!document.querySelector('[data-view="'+CSS.escape(id)+'"]'))id='upload';document.body.classList.toggle('results-view',id==='results');document.querySelectorAll('[data-view]').forEach(e=>e.hidden=e.dataset.view!==id);document.querySelectorAll('.sidebar nav a[href^="#"]').forEach(a=>{a.classList.toggle('selected',a.hash==='#'+id);if(a.hash==='#'+id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});document.querySelectorAll('[data-view="'+id+'"] iframe[data-src]').forEach(f=>{if(!f.src)f.src=f.dataset.src});$('currentMenu').textContent=document.querySelector('.sidebar nav a[href="#'+id+'"]')?.textContent.trim()||'검토 프로그램';window.scrollTo(0,0)}
 window.addEventListener('hashchange',route);
 if($('resetAll'))$('resetAll').onclick=()=>{if(busy)return;if(!confirm('업로드 자료·법인 Q&A 답변·진행 상태를 모두 지우고 처음부터 시작할까요?\n다른 회사 자료를 올릴 때 사용합니다.'))return;try{localStorage.clear();sessionStorage.clear()}catch(e){}location.hash='#upload';location.reload()};window.ReturnCheckApp={ingest,get files(){return structuredClone(files)},get model(){return structuredClone(model)},get result(){return structuredClone(result)},get busy(){return busy}};render();route();
})();
