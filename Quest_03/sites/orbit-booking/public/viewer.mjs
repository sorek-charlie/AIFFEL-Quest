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
function login(message=''){root.innerHTML=`<section class="login"><h1>Charlie's Scheduler</h1><p>공개 열람 · 읽기 전용</p><p class="muted">PC 앱의 실제 일정·할 일·프로젝트 전체를 실시간으로 볼 수 있습니다. 입력·수정·삭제는 제공하지 않습니다.</p><form><label>열람 비밀번호<input type="password" name="password" required autocomplete="current-password" autofocus></label><button>열람 시작</button><p class="error" role="alert">${escape(message)}</p></form><p class="muted">비밀번호는 GitHub README의 ‘방문자 실행’에서 확인하세요.</p></section>`;root.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api('login',{password:e.target.elements.password.value});signedIn=true;await load();}catch(error){root.querySelector('[role=alert]').textContent=error.message;b.disabled=false;}};}
function render(){
 const complete=state.tasks.filter(t=>t.completed).length;
 const titles={overview:'대시보드',calendar:'일정',tasks:'할 일',projects:'프로젝트',settings:'설정'};
 const content=tab==='overview'?dashboardView(state):tab==='calendar'?calendarView(state.events,calendarState):tab==='tasks'?tasksView(state.tasks,state.projects,taskState):tab==='projects'?projectsView(state.projects,state):'<section class="panel"><h2>연결 정보</h2><p class="viewer-summary">PC 실시간 연결 · 읽기 전용</p><p>Asia/Seoul · 일정 시간 10분 단위</p><p>입력·수정·삭제와 계정 설정 변경은 PC 앱에서만 가능합니다.</p></section>';
 root.innerHTML=`<div class="shell viewer-readonly ${tab==='overview'?'dashboard-shell':tab==='calendar'?'calendar-shell':''}"><aside><a class="brand" href="/viewer.html">Charlie's Scheduler<span>(Google연동)</span></a><nav>${Object.entries(titles).map(([id,label])=>`<button data-tab="${id}" class="nav-item ${tab===id?'active':''}">${navIcon(id)}${label}</button>`).join('')}</nav></aside><main><header><div><p class="eyebrow">나의 계획</p><h1>${titles[tab]}</h1><p class="subtitle connection-summary">PC 실시간 · 읽기 전용</p></div><div class="header-actions"><button id="open-search">검색</button><button id="viewer-logout" class="quiet">열람 종료</button></div></header><div class="stats">${[['calendar','등록한 일정',state.events.length,'▦','나의 모든 계획'],['tasks','남은 할 일',state.tasks.length-complete,'✓',complete+'개 완료'],['projects','프로젝트',state.projects.length,'↗','나의 목표']].map(([id,label,count,icon,caption])=>`<article data-tab="${id}" role="button" tabindex="0"><div class="stat-icon" aria-hidden="true">${icon}</div><div><span>${label}</span><strong>${count}<small>개</small></strong></div><span class="stat-caption">${caption}</span></article>`).join('')}</div><div class="content ${tab==='overview'?'dashboard-content':''}">${content}</div><footer><span>실시간 읽기 전용 · 입력·수정·삭제 불가</span><span>5초마다 확인</span></footer></main></div>`;
 // Reuse PC display components without binding any owner mutation handlers.
 root.querySelectorAll('form,[data-new-kind],[data-edit-event],[data-del-event],[data-edit-task],[data-del-task],[data-edit-project],[data-delete-project]').forEach(el=>el.remove());
 root.querySelectorAll('input[type=checkbox]').forEach(el=>{el.disabled=true;});
 root.querySelectorAll('[data-tab],[data-brief-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab||b.dataset.briefTab;render();});
 root.querySelectorAll('.stats [data-tab]').forEach(b=>b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}});
 if(tab==='calendar'){bindMonth(state.events,calendarState,render,render);const all=root.querySelector('#show-all-events');if(all)all.onclick=()=>{calendarState.selected=null;render();};}
 if(tab==='tasks'){root.querySelectorAll('[data-task-month]').forEach(b=>b.onclick=()=>{taskState.month=b.dataset.taskMonth==='all'?null:b.dataset.taskMonth==='today'?today().slice(0,7):shiftMonth(taskState.month||today().slice(0,7),Number(b.dataset.taskMonth));render();});root.querySelector('#task-month-select').onclick=e=>openMonthPicker(taskState.month||today().slice(0,7),m=>{taskState.month=m;render();},e.currentTarget);}
 bindSearch(state,(kind,item)=>{tab=kind==='event'?'calendar':kind==='task'?'tasks':'projects';if(kind==='event'){calendarState.month=new Date(Date.parse(item.startsAt)+9*3600000).toISOString().slice(0,7);calendarState.selected=null;}if(kind==='task')taskState.month=null;render();});
 root.querySelector('#viewer-logout').onclick=async()=>{await api('logout',{});state=null;signedIn=false;login();};
}
function offline(message){state=null;root.innerHTML=`<section class="login"><h1>Charlie's Scheduler</h1><p role="status">${escape(message)}</p><p class="muted">PC 앱이 연결되면 자동으로 다시 표시합니다. 예시 데이터나 고정 스냅샷은 제공하지 않습니다.</p><button id="retry-live">다시 확인</button></section>`;root.querySelector('#retry-live').onclick=()=>load();}
async function load(){try{const next=await api('state');if(JSON.stringify(next)!==JSON.stringify(state)){state=next;render();}}catch(error){if(error.status===401){signedIn=false;login(error.message);}else offline(error.message);}}
let polling=false;setInterval(async()=>{if(!signedIn||polling||document.hidden)return;polling=true;try{await load();}finally{polling=false;}},5000);
try{if((await api('session')).signedIn){signedIn=true;await load();}else login();}catch(error){login(error.message);}
