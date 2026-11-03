import {inputMenus,bindViewerMenus} from '/viewer-preview.mjs';
import {monthCells,shiftMonth} from '/src/features/calendar/month-model.mjs';
import {calendarView,bindMonth,openMonthPicker} from '/src/features/calendar/index.mjs';
import {tasksView} from '/src/features/tasks/index.mjs';
import {projectsView} from '/src/features/settings/entry.mjs';
import {dashboardView} from '/src/app/owner/dashboard.mjs';
import {navIcon} from '/src/app/owner/nav-icons.mjs';
import {bindSearch} from '/src/features/settings/search.mjs';
import {today} from '/src/platform/api/index.mjs';
const calendarState={month:today().slice(0,7),selected:null},taskState={month:today().slice(0,7)};
import {weekGroups} from '/src/features/tasks/week-model.mjs';
const root=document.querySelector('#viewer'),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state,signedIn=false,tab='overview',month=new Date(Date.now()+9*3600000).toISOString().slice(0,7);
async function api(path,body){const r=await fetch('/api/v1/viewer/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok){const error=new Error(data.error?.message||'연결을 확인하세요.');error.status=r.status;throw error;}return data;}
function render(){
 const complete=state.tasks.filter(t=>t.completed).length;
 const titles={overview:'대시보드',calendar:'일정',tasks:'할 일',projects:'프로젝트',settings:'설정'};
 const content=tab==='overview'?dashboardView(state):tab==='calendar'?calendarView(state.events,calendarState):tab==='tasks'?tasksView(state.tasks,state.projects,taskState):tab==='projects'?projectsView(state.projects,state):'<section class="panel"><h2>연결 정보</h2><p class="viewer-summary">마지막 업데이트 자료 전체 · 읽기 전용</p><p>Asia/Seoul · 일정 시간 10분 단위</p><p>입력·수정·삭제와 계정 설정 변경은 PC 앱에서만 가능합니다.</p></section>';
 root.innerHTML=`<div class="shell viewer-readonly ${tab==='overview'?'dashboard-shell':tab==='calendar'?'calendar-shell':''}"><aside><a class="brand" href="/viewer.html">Charlie's Scheduler<span>(Google연동)</span></a><nav>${Object.entries(titles).map(([id,label])=>`<button data-tab="${id}" class="nav-item ${tab===id?'active':''}">${navIcon(id)}${label}</button>`).join('')}</nav></aside><main><header><div><p class="eyebrow">나의 계획</p><h1>${titles[tab]}</h1><p class="subtitle connection-summary">Local PC에서 마지막으로 업데이트 된 자료들이 반영되어 있습니다.</p></div><div class="header-actions">${inputMenus(0)}</div></header><div class="stats">${[['calendar','등록한 일정',state.events.length,'▦','나의 모든 계획'],['tasks','남은 할 일',state.tasks.length-complete,'✓',complete+'개 완료'],['projects','프로젝트',state.projects.length,'↗','나의 목표']].map(([id,label,count,icon,caption])=>`<article data-tab="${id}" role="button" tabindex="0"><div class="stat-icon" aria-hidden="true">${icon}</div><div><span>${label}</span><strong>${count}<small>개</small></strong></div><span class="stat-caption">${caption}</span></article>`).join('')}</div><div class="content ${tab==='overview'?'dashboard-content':''}">${content}</div><footer><span>실시간 읽기 전용 · 입력·수정·삭제 불가</span><span>열람 비밀번호 입력 비활성화</span></footer></main></div>`;
 // Reuse PC display components without binding any owner mutation handlers.
 root.querySelectorAll('form,[data-new-kind],[data-edit-event],[data-del-event],[data-edit-task],[data-del-task],[data-edit-project],[data-delete-project]').forEach(el=>el.remove());
 root.querySelectorAll('input[type=checkbox]').forEach(el=>{el.disabled=true;});
 root.querySelectorAll('[data-tab],[data-brief-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab||b.dataset.briefTab;render();});
 root.querySelectorAll('.stats [data-tab]').forEach(b=>b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}});
 if(tab==='calendar'){bindMonth(state.events,calendarState,render,render);const all=root.querySelector('#show-all-events');if(all)all.onclick=()=>{calendarState.selected=null;render();};}
 if(tab==='tasks'){root.querySelectorAll('[data-task-month]').forEach(b=>b.onclick=()=>{taskState.month=b.dataset.taskMonth==='all'?null:b.dataset.taskMonth==='today'?today().slice(0,7):shiftMonth(taskState.month||today().slice(0,7),Number(b.dataset.taskMonth));render();});root.querySelector('#task-month-select').onclick=e=>openMonthPicker(taskState.month||today().slice(0,7),m=>{taskState.month=m;render();},e.currentTarget);}
 bindViewerMenus(state);
 bindSearch(state,(kind,item)=>{tab=kind==='event'?'calendar':kind==='task'?'tasks':'projects';if(kind==='event'){calendarState.month=new Date(Date.parse(item.startsAt)+9*3600000).toISOString().slice(0,7);calendarState.selected=null;}if(kind==='task')taskState.month=null;render();});

}
function offline(message){state=null;root.innerHTML=`<section class="login"><h1>Charlie's Scheduler</h1><p role="status">${escape(message)}</p><p class="muted">마지막으로 반영된 자료 전체를 읽기 전용으로 제공합니다. 잠시 후 다시 확인해 주세요.</p><button id="retry-live">다시 확인</button></section>`;root.querySelector('#retry-live').onclick=()=>load();}
async function load(){try{const next=await api('state');if(!document.querySelector('dialog[open],.action-dropdown[open]')&&JSON.stringify(next)!==JSON.stringify(state)){state=next;render();}}catch(error){if(!state)offline(error.message);}}
let polling=false;setInterval(async()=>{if(polling||document.hidden)return;polling=true;try{await load();}finally{polling=false;}},5000);
await load();
