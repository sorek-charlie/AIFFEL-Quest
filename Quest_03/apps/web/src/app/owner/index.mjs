import {bindSearch} from '../../features/settings/search.mjs';
import {bindTenMinuteTimes,api,act,escape,notice,today} from '../../platform/api/index.mjs';
import {tasksView,bindTasks} from '../../features/tasks/index.mjs';
import {calendarView,bindCalendar,bindMonth} from '../../features/calendar/index.mjs';
import {settingsView,bindSettings} from '../../features/settings/index.mjs';
import {inputMenus,inputsView,bindInputMenus,bindInputs} from '../../features/settings/inputs.mjs';
import {showDaily} from './daily.mjs';
import {projectsView,bindProjects,openEntry} from '../../features/settings/entry.mjs';
import {dashboardView} from './dashboard.mjs';
import {demoState} from './demo-state.mjs';
import {bindBriefTasks} from './three-day.mjs';
export async function mountOwner({showDailyOnLogin=false}={}) {
 let demoMode=sessionStorage.getItem('orbit-today-demo')==='on';
 const briefingState=s=>demoMode?demoState():s;
 let tab=['todo','google','gmail','inputs','calendar','projects','tasks','settings'].includes(new URLSearchParams(location.search).get('view'))?new URLSearchParams(location.search).get('view'):'overview',lastFingerprint='',dirty=false,refreshing=false,currentState;const calendarState={month:today().slice(0,7),selected:null};
 async function reflectEntry(kind){demoMode=false;sessionStorage.setItem('orbit-today-demo','off');if(kind==='project')tab='projects';await render();}
 let proposalPageNumber=1;
 async function render() {
  const [s,proposals,integration]=await Promise.all([api('owner/state'),api('owner/inputs'),api('owner/integrations')]);
  s.projects??=[];currentState=s;lastFingerprint=JSON.stringify([s,proposals,today()]);dirty=false;
  const complete=s.tasks.filter(t=>t.completed).length;
  const title={overview:'대시보드',calendar:'일정',tasks:'할 일',google:'Google 캘린더',gmail:'Gmail',todo:'Todo 저장소',settings:'설정',inputs:'입력·연결',projects:'프로젝트'}[tab];
  document.querySelector('#app').innerHTML=`<div class="shell ${tab==='overview'?'dashboard-shell':''}"><aside><a class="brand" href="${location.protocol==='https:'?'/owner':'/'}">◉ 이성진<span>나의 시간 공간</span></a><nav>${[['overview','◫','대시보드'],['calendar','▦','일정'],['tasks','✓','할 일'],['projects','◇','프로젝트'],['settings','⚙','설정']].map(([id,icon,label])=>`<button data-tab="${id}" class="nav-item ${id===tab?'active':''}"><span>${icon}</span>${label}</button>`).join('')}</nav></aside><main><header><div><p class="eyebrow">나의 계획</p><h1>${title}</h1><p class="subtitle">${escape(s.settings.displayName)}님의 일정 공간</p></div><div class="header-actions">${inputMenus(proposals.length)}</div></header><div class="stats"><article><div class="stat-icon" aria-hidden="true">▦</div><div><span>등록한 일정</span><strong>${s.events.length}<small>개</small></strong></div><span class="stat-caption">나의 모든 계획</span></article><article><div class="stat-icon" aria-hidden="true">✓</div><div><span>남은 할 일</span><strong>${s.tasks.length-complete}<small>개</small></strong></div><span class="stat-caption">${complete}개 완료</span></article><article><div class="stat-icon" aria-hidden="true">↗</div><div><span>프로젝트</span><strong>${s.projects.length}<small>개</small></strong></div><span class="stat-caption">나의 목표</span></article></div><div class="content ${tab==='overview'?'dashboard-content':''}">${tab==='overview'?dashboardView(briefingState(s),calendarState):tab==='calendar'?calendarView(s.events,calendarState,s.projects):tab==='tasks'?tasksView(s.tasks,s.projects):tab==='inputs'?inputsView(proposals,integration,s.projects,proposalPageNumber):tab==='projects'?projectsView(s.projects,s):tab==='settings'?settingsView(s.settings):''}</div><footer><span>직접 입력 · Google 연결</span><span>이성진</span></footer></main></div>`;
  document.querySelectorAll('[data-tab], [data-shortcut]').forEach(el=>el.onclick=()=>act(async()=>{tab=el.dataset.tab||el.dataset.shortcut;history.replaceState(null,'',location.pathname);if(tab==='calendar')calendarState.selected=null;await render();document.querySelector('h1').setAttribute('tabindex','-1');document.querySelector('h1').focus({preventScroll:true});}));
  document.querySelector('#logout')?.addEventListener('click',()=>act(async()=>{await api('auth/logout','POST',{});location.reload();}));
  document.querySelector('#demo-toggle')?.addEventListener('click',()=>act(async()=>{demoMode=!demoMode;sessionStorage.setItem('orbit-today-demo',demoMode?'on':'off');await render();}));
  if(tab==='overview')bindBriefTasks(briefingState(s),render);
  if(tab==='tasks')bindTasks(s.tasks,render,t=>openEntry(s,reflectEntry,{kind:'task',item:t}));
  if(tab==='overview')bindMonth(s.events,calendarState,render,async()=>{tab='calendar';await render();});
  if(tab==='calendar')bindCalendar(s.events,render,calendarState);
  if(tab==='settings')bindSettings(render);
  if(tab==='gmail'){const {mountMailReview}=await import('../../features/settings/mail-review.mjs');await mountMailReview('.content');}
  if(tab==='google'){const {mountGoogleImport}=await import('../../features/calendar/google-import.mjs');await mountGoogleImport('.content');}
  if(tab==='todo'){const {mountTodo}=await import('../../features/tasks/todo-workspace.mjs');await mountTodo('.content');}
  bindSearch(s,(kind,item)=>openEntry(s,reflectEntry,{kind,item}));
  bindInputMenus(async(next)=>{tab=next;await render();},render);
  if(tab==='inputs')bindInputs(proposals,render,async page=>{proposalPageNumber=page;await render();document.querySelector('.proposal-list')?.scrollIntoView({block:'start'});});
  if(tab==='projects')bindProjects(s,reflectEntry);
  document.querySelectorAll('[data-brief-tab]').forEach(b=>b.onclick=()=>act(async()=>{tab=b.dataset.briefTab;await render();}));
  document.querySelectorAll('[data-entry-kind]').forEach(b=>b.onclick=()=>{document.querySelectorAll('details[open]').forEach(d=>d.open=false);openEntry(s,reflectEntry,{kind:b.dataset.entryKind});});
  document.querySelector('#show-daily')?.addEventListener('click',()=>act(async()=>showDaily(briefingState(await api('owner/state')),async(next)=>{tab=next;await render();})));
  bindTenMinuteTimes(document.querySelector('#app'));
  document.querySelector('#app').oninput=()=>{dirty=true;};
 }
 const updates=setInterval(async()=>{if(['todo','google','gmail'].includes(tab)||refreshing||dirty||document.hidden||document.querySelector('dialog[open],details[open]'))return;refreshing=true;try{const values=await Promise.all([api('owner/state'),api('owner/inputs')]);if(JSON.stringify([...values,today()])!==lastFingerprint)await render();}catch{}finally{refreshing=false;}},15000);
 window.addEventListener('pagehide',()=>clearInterval(updates),{once:true});
 try {await render();if(showDailyOnLogin&&!['todo','google','gmail'].includes(tab))showDaily(briefingState(currentState),async(next)=>{tab=next;await render();});} catch(e) {if(e.status===401){clearInterval(updates);const {mountAuth}=await import('../auth/index.mjs');await mountAuth(()=>mountOwner({showDailyOnLogin:true}));return;}document.querySelector('#app').innerHTML='<main class="locked"><div class="brand">◉ 이성진</div><h1>개인 화면이 잠겨 있습니다.</h1><p>이성진 실행 프로그램의 ‘개인 화면 열기’를 눌러 주세요.</p><button id="retry">다시 시도</button></main>';document.querySelector('#retry').onclick=()=>act(render);notice(e.message);}
}




