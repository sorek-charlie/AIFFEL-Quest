import {escape} from '../../platform/api/index.mjs';
export function bindSearch(state,open){
 const trigger=document.querySelector('#open-search');if(!trigger)return;
 trigger.onclick=()=>{
  document.querySelector('#search-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='search-dialog';dialog.setAttribute('aria-labelledby','search-title');
  dialog.innerHTML='<div class="section-title"><h2 id="search-title">검색</h2><button type="button" aria-label="검색 닫기">×</button></div><label>검색어<input type="search" placeholder="일정·할 일·프로젝트" autocomplete="off"></label><p role="status"></p><div class="search-results"></div>';
  document.querySelector('.shell').append(dialog);
  const input=dialog.querySelector('input'),results=dialog.querySelector('.search-results');
  const rows=[...state.events.map(item=>({kind:'event',label:'일정',item})),...state.tasks.map(item=>({kind:'task',label:'할 일',item})),...state.projects.map(item=>({kind:'project',label:'프로젝트',item}))];
  function search(){const query=input.value.trim().toLocaleLowerCase();const matches=query?rows.filter(({item})=>[item.title,item.details,item.notes,item.location,item.participants,item.startsOn,item.endsOn,item.dueDate,item.startsAt].some(v=>String(v||'').toLocaleLowerCase().includes(query))):[];
   dialog.querySelector('[role=status]').textContent=query?`${matches.length}개${matches.length>50?' · 50개까지 표시':''}`:'검색어를 입력하세요.';
   results.innerHTML=matches.slice(0,50).map(({item,label},i)=>`<button type="button" data-search-index="${i}">${label} · ${escape(item.title)}</button>`).join('');
   results.querySelectorAll('button').forEach(b=>b.onclick=()=>{const row=matches[Number(b.dataset.searchIndex)];dialog.close();open(row.kind,row.item);});
  }
  input.oninput=search;dialog.querySelector('[aria-label="검색 닫기"]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();trigger.focus();},{once:true});search();dialog.showModal();input.focus();
 };
}
