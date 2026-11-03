import {inputMenus} from '/src/features/settings/inputs.mjs';
import {openEntry} from '/src/features/settings/entry.mjs';
export {inputMenus};
const hint='열람 전용 화면입니다. 입력·파일첨부·저장·Google 연결 변경은 PC 앱에서만 가능합니다.';
function closeMenus(){document.querySelectorAll('.action-dropdown[open]').forEach(d=>d.open=false);}
function modal(title,body){
 document.querySelector('#viewer-preview')?.remove();const dialog=document.createElement('dialog');dialog.id='viewer-preview';dialog.setAttribute('aria-labelledby','preview-title');dialog.innerHTML=`<div class="section-title"><h2 id="preview-title">${title}</h2><button type="button" class="quiet" aria-label="미리보기 닫기">×</button></div><p class="readonly-notice">${hint}</p>${body}`;
 document.querySelector('.shell').append(dialog);dialog.querySelector('[aria-label="미리보기 닫기"]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
function entry(state,kind){
 openEntry(state,()=>{}, {kind});const d=document.querySelector('#entry-dialog');
 d.querySelectorAll('input,textarea,select,button:not(#entry-close)').forEach(e=>e.disabled=true);
 d.querySelector('form').onsubmit=e=>e.preventDefault();d.querySelector('#entry-title').textContent+=' · 열람 전용';
 const p=document.createElement('p');p.className='readonly-notice';p.textContent=hint;d.querySelector('form').prepend(p);
}
function attachment(kind,type){const label={event:'일정',task:'할 일',project:'프로젝트'}[kind];modal(`${label} · ${type==='image'?'이미지첨부':'문서첨부'}`,`<label>파일첨부<input type="file" disabled accept="${type==='image'?'image/*':'.pdf,.docx,.txt,.md,.csv,.json'}"></label><p class="hint">문서·이미지 내용은 아래 표에서 검토 후 반영합니다.</p><div style="overflow:auto"><table><thead><tr>${['구분','제목','날짜','시간','장소','참석자','주요내용','확정'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody><tr><td colspan="8">열람 전용에서는 파일을 업로드하지 않습니다.</td></tr></tbody></table></div><button disabled>확정</button>`);}
function google(kind){const gmail=kind==='gmail';modal(gmail?'Gmail':'Google 캘린더',`<ol class="google-steps"><li>① 계정 연결</li><li>② 기간 선택</li><li>③ ${gmail?'분류·검토':'선택·저장'}</li></ol><section class="panel"><h3>1. 계정 연결</h3><p>개인 계정·연결 정보는 공개하지 않습니다.</p><label>클라이언트 ID<input disabled placeholder="PC 앱에서 설정"></label><label>클라이언트 시크릿<input type="password" disabled autocomplete="off"></label><button disabled>연결 설정 저장</button><button disabled>Google 연결</button></section><section class="panel"><h3>2. 기간 선택</h3><div class="columns"><label>시작일<input type="date" disabled></label><label>종료일<input type="date" disabled></label></div><button disabled>${gmail?'메일 확인·분류':'일정 미리보기'}</button></section><section class="panel"><h3>3. ${gmail?'분류·검토':'선택·저장'}</h3><p>${gmail?'일정 · 할 일 · 프로젝트 · 기타 · 스팸 후보를 검토합니다.':'기간별 일정을 선택하고 중복·충돌을 검토합니다.'}</p><button disabled>확인·저장</button></section>`);}
export function bindViewerMenus(state){
 document.querySelector('#input-file')?.remove();
 document.querySelectorAll('[data-settings-preview]').forEach(b=>b.onclick=()=>{if(b.dataset.settingsPreview==='inputs')modal('연결 설정·검토함','<section class="panel"><h3>Google 연결</h3><label>클라이언트 ID<input disabled placeholder="PC 앱에서 확인"></label><label>클라이언트 시크릿<input type="password" disabled></label><button disabled>연결 설정 저장</button></section><section class="panel"><h3>검토함</h3><p>개인 문서·Gmail 검토 자료는 PC 앱에서 확인합니다.</p></section>');else modal('Todo 저장소','<div class="columns"><section class="panel"><h3>할 일 목록</h3><label>새 할 일<input disabled></label><button disabled>추가</button></section><section class="panel"><h3>저장소 전환</h3><label>저장 방식<select disabled><option>길 A · 로컬 SQLite / 길 B · Supabase</option></select></label><label>프로젝트 URL<input disabled></label><label>공개 키<input disabled></label><button disabled>저장소 적용</button></section></div>');});
 document.querySelectorAll('.entry-submenu').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)document.querySelectorAll('.entry-submenu').forEach(other=>{if(other!==menu)other.open=false;});}));
 document.querySelectorAll('.action-dropdown').forEach(menu=>{let timer;menu.addEventListener('pointerenter',()=>clearTimeout(timer));menu.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')timer=setTimeout(()=>{if(menu.isConnected&&!menu.matches(':hover'))menu.open=false;},menu.dataset.menu==='input'?800:500);});menu.addEventListener('keydown',e=>{if(e.key==='Escape'){clearTimeout(timer);menu.open=false;menu.querySelector('summary').focus();e.stopPropagation();}});});
 document.querySelectorAll('[data-entry-kind]').forEach(b=>b.onclick=()=>{closeMenus();entry(state,b.dataset.entryKind);});
 document.querySelectorAll('[data-file-kind]').forEach(b=>b.onclick=()=>{closeMenus();attachment(b.dataset.entryTarget,b.dataset.fileKind);});
 document.querySelectorAll('[data-input-action]').forEach(b=>b.onclick=()=>{closeMenus();if(b.dataset.inputAction==='review')modal('문서함','<p>문서·이미지 검토 화면입니다. 개인 문서 원본과 미확정 검토 자료는 공개하지 않습니다.</p>');else google(b.dataset.inputAction);});
}
