import {api,act,escape,notice,today} from '../../platform/api/index.mjs';
import {tasksView,bindTasks} from '../../features/tasks/index.mjs';
import {calendarView,bindCalendar,bindMonth} from '../../features/calendar/index.mjs';
import {inboxView,bindInbox} from '../../features/booking-inbox/index.mjs';
import {settingsView,bindSettings} from '../../features/settings/index.mjs';
import {inputMenus,inputsView,bindInputMenus,bindInputs} from '../../features/settings/inputs.mjs';
import {showDaily} from './daily.mjs';
import {projectsView,bindProjects,openEntry} from '../../features/settings/entry.mjs';
import {dashboardView} from './dashboard.mjs';
import {demoState} from './demo-state.mjs';
import {bindBriefTasks} from './three-day.mjs';
export async function mountOwner({showDailyOnLogin=false}={}) {
 let demoMode=sessionStorage.getItem('orbit-today-demo')!=='off';
 const briefingState=s=>demoMode?demoState():s;
 let tab='overview',lastFingerprint='',dirty=false,refreshing=false,currentState;const calendarState={month:today().slice(0,7),selected:null};
 async function render() {
  const [s,proposals,integration]=await Promise.all([api('owner/state'),api('owner/inputs'),api('owner/integrations')]),pending=s.bookings.filter(b=>b.status==='pending').length;
  s.projects??=[];currentState=s;lastFingerprint=JSON.stringify([s,proposals,today()]);dirty=false;
  const complete=s.tasks.filter(t=>t.completed).length;
  const title={overview:'좋은 하루를 설계하세요.',calendar:'내 일정',tasks:'하나씩, 가볍게.',inbox:'새로운 만남의 시작.',settings:'나에게 맞는 ORBIT.',inputs:'입력 · 연동',projects:'프로젝트'}[tab];
  document.querySelector('#app').innerHTML=`<div class="shell ${tab==='overview'?'dashboard-shell':''}"><aside><a class="brand" href="${location.protocol==='https:'?'/owner':'/'}">◉ ORBIT<span>나의 시간 공간</span></a><nav>${[['overview','◫','대시보드'],['calendar','▦','내 일정'],['tasks','✓','할 일'],['projects','◇','프로젝트'],['inbox','↗','예약 승인함'],['inputs','⇄','입력 · 연동'],['settings','⚙','설정']].map(([id,icon,label])=>`<button data-tab="${id}" class="nav-item ${id===tab?'active':''}"><span>${icon}</span>${label}${id==='inbox'&&pending?`<b>${pending}</b>`:''}</button>`).join('')}</nav><div class="sidebar-note"><div class="sidebar-orb" aria-hidden="true">✦</div><strong>조금 더 가볍게,<br>나만의 리듬으로.</strong><p>시간을 채우는 대신<br>가능성을 펼쳐 보세요.</p></div><div class="aside-footer"><span class="online"></span> 내 PC에 안전하게 저장<p>Asia/Seoul · PC와 연결됨</p><button id="logout" class="quiet">개인 화면 잠그기</button></div></aside><main><header><div><p class="eyebrow">A LITTLE MORE POSSIBILITY</p><h1>${title}</h1><p class="subtitle">${escape(s.settings.displayName)}님의 일정 공간</p></div><div class="header-actions">${inputMenus(proposals.length)}${tab==='overview'?`<button id="demo-toggle" class="quiet demo-toggle">${demoMode?'예시 · 실제 데이터 보기':'실제 · 예시 데이터 보기'}</button>`:''}${tab==='overview'?'<button id="show-daily" class="quiet">오늘 브리핑</button>':''}<div class="date-chip">${new Date().toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'long'})}</div><button id="new-entry" data-entry-kind="task" class="primary-button">＋ 구분 선택 입력</button></div></header>${tab!=='overview'?'<button id="show-daily" class="quiet daily-reopen">오늘 브리핑 보기</button>':''}${tab==='overview'?`<section class="dashboard-welcome"><div><span class="welcome-tag">MY DAILY ORBIT</span><strong>나의 시간에, 새로운 색을 더하세요.</strong><span class="welcome-sub">일정부터 할 일과 예약까지 한눈에.</span></div><div class="welcome-art" aria-hidden="true"><i></i><i></i><i></i><span>✦</span></div><button class="welcome-action">오늘 브리핑 보기 ↗</button></section>`:''}<div class="stats"><article><div class="stat-icon" aria-hidden="true">▦</div><div><span>등록한 일정</span><strong>${s.events.length}<small>개</small></strong></div><span class="stat-caption">나의 모든 계획</span></article><article><div class="stat-icon" aria-hidden="true">✓</div><div><span>남은 할 일</span><strong>${s.tasks.length-complete}<small>개</small></strong></div><span class="stat-caption">${complete}개 완료</span></article><article><div class="stat-icon" aria-hidden="true">↗</div><div><span>승인 대기</span><strong>${pending}<small>건</small></strong></div><span class="stat-caption">새로운 만남</span></article></div><div class="content ${tab==='overview'?'dashboard-content':''}">${tab==='overview'?dashboardView(briefingState(s),calendarState):tab==='calendar'?calendarView(s.events,calendarState,s.projects):tab==='tasks'?tasksView(s.tasks,s.projects):tab==='inbox'?inboxView(s.bookings):tab==='inputs'?inputsView(proposals,integration):tab==='projects'?projectsView(s.projects,s):settingsView(s.settings)}</div><footer><span>고객이 신청하고, 내가 승인해야 확정됩니다.</span><span>MAKE TIME FOR YOU ✦</span></footer></main></div>`;
  document.querySelectorAll('[data-tab], [data-shortcut]').forEach(el=>el.onclick=()=>act(async()=>{tab=el.dataset.tab||el.dataset.shortcut;if(tab==='calendar')calendarState.selected=null;await render();document.querySelector('h1').setAttribute('tabindex','-1');document.querySelector('h1').focus({preventScroll:true});}));
  document.querySelector('#logout').onclick=()=>act(async()=>{await api('auth/logout','POST',{});location.reload();});
  document.querySelector('#demo-toggle')?.addEventListener('click',()=>act(async()=>{demoMode=!demoMode;sessionStorage.setItem('orbit-today-demo',demoMode?'on':'off');await render();}));
  if(tab==='overview')bindBriefTasks(briefingState(s),render);
  if(tab==='tasks')bindTasks(s.tasks,render,t=>openEntry(s,render,{kind:'task',item:t}));
  if(tab==='overview')bindMonth(s.events,calendarState,render,async()=>{tab='calendar';await render();});
  if(tab==='calendar')bindCalendar(s.events,render,calendarState);
  if(['overview','inbox'].includes(tab))bindInbox(s.bookings,render);
  if(tab==='settings')bindSettings(render);
  bindInputMenus(async(next)=>{tab=next;await render();},render);
  if(tab==='inputs')bindInputs(proposals,render);
  if(tab==='projects')bindProjects(s,render);
  document.querySelectorAll('[data-brief-tab]').forEach(b=>b.onclick=()=>act(async()=>{tab=b.dataset.briefTab;await render();}));
  document.querySelectorAll('[data-entry-kind]').forEach(b=>b.onclick=()=>{document.querySelectorAll('details[open]').forEach(d=>d.open=false);openEntry(s,render,{kind:b.dataset.entryKind});});
  document.querySelector('#show-daily').onclick=()=>act(async()=>showDaily(briefingState(await api('owner/state')),async(next)=>{tab=next;await render();}));
  document.querySelector('#app').oninput=()=>{dirty=true;};
 }
 const updates=setInterval(async()=>{if(refreshing||dirty||document.hidden||document.querySelector('dialog[open],details[open]'))return;refreshing=true;try{const values=await Promise.all([api('owner/state'),api('owner/inputs')]);if(JSON.stringify([...values,today()])!==lastFingerprint)await render();}catch{}finally{refreshing=false;}},15000);
 window.addEventListener('pagehide',()=>clearInterval(updates),{once:true});
 try {await render();if(showDailyOnLogin)showDaily(briefingState(currentState),async(next)=>{tab=next;await render();});} catch(e) {if(e.status===401){clearInterval(updates);const {mountAuth}=await import('../auth/index.mjs');await mountAuth(()=>mountOwner({showDailyOnLogin:true}));return;}document.querySelector('#app').innerHTML='<main class="locked"><div class="brand">◉ ORBIT</div><h1>개인 화면이 잠겨 있습니다.</h1><p>ORBIT 실행 프로그램의 ‘개인 화면 열기’를 눌러 주세요.</p><button id="retry">다시 시도</button><a href="/book/local">예약 페이지</a></main>';document.querySelector('#retry').onclick=()=>act(render);notice(e.message);}
}




