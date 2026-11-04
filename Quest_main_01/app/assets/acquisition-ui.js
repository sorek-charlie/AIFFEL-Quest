(function(){'use strict';
const $=id=>document.getElementById(id),C=AcquisitionCore,base=ACQUISITION_ROUTES,native=window.RETURNCHECK_NATIVE,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='returncheck-acquisition-routes-v1';let registry=C.validate(base),pending=null,watching=false,polling=false,imported=new Set(),log=[],activeRoute=null;
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){const checked=C.validate(saved,base.routes.map(r=>r.id));if(C.versionCompare(checked.version,base.version)>=0)registry=checked}}catch{}
function note(s,bad=false){$('acqFeedback').textContent=s;$('acqFeedback').classList.toggle('negative',bad)}
async function request(path,data){if(!native)throw Error('EXE로 실행하면 인증서 확인·다운로드 자동 가져오기를 사용할 수 있습니다.');const r=await fetch(native.base+'api/'+path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json','X-ReturnCheck':native.token},body:data===undefined?undefined:JSON.stringify(data)});if(!r.ok)throw Error('로컬 수집 연결 실패 ('+r.status+')');const result=await r.json();if(result.error)throw Error(result.error);return result}
function save(name,p){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function render(){
 $('collectorDocuments').innerHTML=registry.routes.filter(r=>r.id!=='derived-summary').map(r=>`<label><input type="checkbox" name="collectorRoute" value="${esc(r.id)}" checked><span>${esc(r.name)}<small>${esc(r.agency)}</small></span></label>`).join('');
 $('acqVersion').textContent='수집경로 '+registry.version+' · 확인일 '+registry.publishedAt;
 $('acqRows').innerHTML=registry.routes.map(r=>`<tr><td><b>${esc(r.name)}</b><small>${esc(r.agency)}<br>${esc(r.years)}</small><span class="acq-badge">첨부 ${r.attached.length}개</span>${r.attached.length?`<details><summary>첨부 원본 대응</summary><ul>${r.attached.map(f=>`<li>${esc(f)}</li>`).join('')}</ul></details>`:''}</td><td><ol>${r.menu.map(m=>`<li>${esc(m)}</li>`).join('')}</ol><small>${esc(r.routeStatus)} · ${esc(r.checkedAt)}<br>기관 개편·권한·출력 전용 화면은 수집 창에서 확인</small></td><td>${esc(r.export)}<small>${esc(r.note)}</small><a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">공식 안내 ↗</a></td><td>${native&&r.id!=='derived-summary'?`<button data-native-route="${r.id}">EXE에서 인증·수집</button>`:`<a class="button" data-acq-route="${r.id}" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">공식기관 열기 ↗</a>`}<button data-acq-intent="${r.id}">이 자료 수집 선택</button></td></tr>`).join('');
 $('acqNoticeLinks').innerHTML=registry.notices.map(n=>`<a class="button" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.name)} ↗</a>`).join('');
}
$('acqRows').addEventListener('click',e=>{const id=e.target.dataset.acqIntent||e.target.dataset.acqRoute;if(!id)return;activeRoute=registry.routes.find(r=>r.id===id);$('inputPurpose').value=activeRoute.intent;$('inputYear').value='auto';$('acqSelected').textContent='수집 중: '+activeRoute.agency+' / '+activeRoute.name+' · 귀속은 원문에서 확인';});
async function startCollection(ids){try{if(!ids.length)throw Error('수집할 정부기관 서류를 선택하세요.');const r=await request('institution-collect',{routes:ids.join(','),companyId:window.ReturnCheckApp?.model.companyId||'',companyName:window.ReturnCheckApp?.model.company||'',format:$('institutionCertFormat').value,manifestJson:JSON.stringify(registry)});$('collectorState').textContent='공식기관 인증·수집 창을 여는 중 · 저장 폴더: '+r.folder;await status()}catch(e){$('collectorState').textContent=e.message}}
$('startInstitutionCollect').onclick=()=>startCollection([...document.querySelectorAll('input[name="collectorRoute"]:checked')].map(e=>e.value));
$('acqRows').addEventListener('click',e=>{if(e.target.dataset.nativeRoute)startCollection([e.target.dataset.nativeRoute])});
$('certCheck').onclick=async()=>{
 const f=$('corporateCert').files[0],password=$('corporateCertPassword').value;
 try{if(!f)throw Error('법인 공동인증서 파일을 선택하세요.');if(f.size>1024*1024)throw Error('인증서 파일은 1MB 이하로 선택하세요.');const ext=f.name.split('.').pop().toLowerCase();if(!['pfx','p12','der'].includes(ext))throw Error('PFX·P12 또는 NPKI 공개 인증서 signCert.der를 선택하세요.');
 $('certCheck').disabled=true;const bytes=new Uint8Array(await f.arrayBuffer());let b64='';for(const b of bytes)b64+=String.fromCharCode(b);const result=await request('certificate',{format:ext,data:btoa(b64),password:ext==='der'?'':password});bytes.fill(0);b64='';
 $('certResult').textContent='명의: '+result.subject+' / 발급: '+result.issuer+' / 만료: '+result.expires+'\n'+result.message+'\n기관 인증: 미실행 · 법인번호 일치: 미확인 · 자료 다운로드: 미실행';
 }catch(err){$('certResult').textContent=err.message}finally{$('corporateCertPassword').value='';$('corporateCert').value='';$('certCheck').disabled=!native;}
};
$('corporateCert').onchange=()=>{$('corporateCertPassword').disabled=$('corporateCert').files[0]?.name.toLowerCase().endsWith('.der')===true;$('certResult').textContent=''};
async function status(){const s=await request('status');watching=s.watching;$('acqFolder').textContent=s.folder;$('watchStart').textContent=watching?'자동 가져오기 중지':'이후 다운로드 자동 가져오기';$('acqNativeState').textContent='EXE 수집 연결됨 · 공식기관 인증·수집 창 사용 가능';if(s.collector)$('collectorState').textContent=s.collector.message+(s.collector.document?' · '+s.collector.document+' / '+s.collector.year+'년':'')+' · 확보 파일 '+(s.collector.downloadCount||0)+'개';return s}
$('watchStart').onclick=async()=>{try{await request('watch',{enabled:!watching});await status();note(watching?'수집 시작 이후 이 폴더에 새로 저장되는 ZIP·XLSX·PDF만 자동 분석합니다.':'자동 가져오기를 중지했습니다.')}catch(e){note(e.message,true)}};
$('selectDownloadFolder').onclick=async()=>{try{await request('select-folder',{});await status();note('폴더 선택 후 자동 가져오기를 시작하세요. 기존 파일은 ZIP·개별 파일 넣기로 추가할 수 있습니다.')}catch(e){note(e.message,true)}};
$('openDownloadFolder').onclick=async()=>{try{await request('open-folder',{})}catch(e){note(e.message,true)}};
async function poll(){
 if(!native||polling||document.hidden)return;polling=true;
 try{const s=await status();if(!s.watching||window.ReturnCheckApp?.busy)return;
 for(const item of s.items){if(imported.has(item.id)||window.ReturnCheckApp.busy)continue;imported.add(item.id);
 try{const r=await fetch(native.base+'api/file/'+item.id);if(!r.ok)throw Error('파일 변경·읽기 실패');const blob=await r.blob(),f=new File([blob],item.name);const summary=await window.ReturnCheckApp.ingest([f]);
 log.unshift({name:item.name,status:summary?.errors?'처리됨 · '+summary.errors+'개 확인 필요':'분석 처리됨',agency:activeRoute?.agency||'선택 폴더',at:new Date().toLocaleTimeString('ko-KR')});await request('ack',{id:item.id});
 }catch(e){log.unshift({name:item.name,status:e.message,agency:activeRoute?.agency||'선택 폴더',at:new Date().toLocaleTimeString('ko-KR')});await request('ack',{id:item.id});}
 $('acqDownloads').innerHTML=log.slice(0,50).map(i=>`<div>${esc(i.at)} · ${esc(i.name)} · ${esc(i.status)}<small>수집 분류: ${esc(i.agency)} (기관 발급 진위는 별도 확인)</small></div>`).join('');}
 }catch(e){$('acqNativeState').textContent='EXE 수집 연결 끊김 · EXE를 다시 실행하세요.'}finally{polling=false}
}
$('routeExport').onclick=()=>save('기관별_자료수집경로_'+registry.version+'.json',registry);
$('routeImport').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>256*1024)throw Error('경로 JSON은 256KB 이하로 넣어 주세요.');pending=C.validate(JSON.parse(await f.text()),base.routes.map(r=>r.id));if(C.versionCompare(pending.version,registry.version)<=0)throw Error('현재보다 높은 버전의 경로 파일이 필요합니다.');const diff=C.changes(registry,pending);$('routePreview').textContent=pending.version+' 적용 예정 · 변경 '+diff.length+'개: '+(diff.join(', ')||'경로 동일·확인일 갱신');$('routeApply').hidden=false;note('변경 경로의 공식 근거와 확인일을 검토한 뒤 적용하세요.')}catch(err){pending=null;$('routeApply').hidden=true;note(err.message,true)}finally{e.target.value=''}};
$('routeApply').onclick=()=>{if(!pending)return;try{const previous=registry;localStorage.setItem(key+'-previous',JSON.stringify(previous));localStorage.setItem(key,JSON.stringify(pending));registry=pending;pending=null;render();$('routeApply').hidden=true;$('routePreview').textContent='';note('수집경로를 갱신했습니다. 과거연도 공제율·계산 규정은 변경하지 않았습니다.')}catch(e){note('경로 저장 실패: '+e.message,true)}};
$('routePrevious').onclick=()=>{try{const p=C.validate(JSON.parse(localStorage.getItem(key+'-previous')||'null'),base.routes.map(r=>r.id));save('기관수집경로_이전버전_'+p.version+'.json',p)}catch{note('이 브라우저에 이전 경로 버전이 없습니다.')}};
render();if(native){status().catch(e=>note(e.message,true));setInterval(poll,2500)}else{$('acqNativeState').textContent='HTML 모드 · 공식기관 인증·수집 창은 경정청구.exe로 실행';$('collectorState').textContent='폴더 바로 아래 경정청구.exe를 실행한 뒤 수집을 시작하세요.';['startInstitutionCollect','certCheck','watchStart','selectDownloadFolder','openDownloadFolder','corporateCert','corporateCertPassword'].forEach(id=>$(id).disabled=true)}
window.Acquisition={get registry(){return structuredClone(registry)},get log(){return structuredClone(log)},request,poll};
})();
