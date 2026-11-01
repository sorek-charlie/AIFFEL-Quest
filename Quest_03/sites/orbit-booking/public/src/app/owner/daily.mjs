import {api,today} from '../../platform/api/index.mjs';
import {threeDayView,bindBriefTasks} from './three-day.mjs';
export function showDaily(state,navigate){
 document.querySelector('#daily-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='daily-dialog';dialog.className='daily-dialog three-day-dialog today-only-dialog';dialog.setAttribute('aria-labelledby','daily-title');
 dialog.innerHTML=`<div class="daily-header"><div><p class="panel-kicker">MY THREE DAYS · ASIA/SEOUL</p><h2 id="daily-title">오늘의 일정 · 할 일 · 프로젝트 ${state._demo?'<span class="demo-badge">예시 데이터</span>':''}</h2></div><button class="quiet" id="daily-close" aria-label="브리핑 닫기" autofocus>×</button></div>${threeDayView(state,today(),{todayOnly:true})}<div class="daily-footer"><p>오늘 날짜의 일정·할 일과 오늘 진행하는 프로젝트를 보여줍니다.</p><button id="daily-start">대시보드 보기 →</button></div>`;
 document.querySelector('.shell').append(dialog);
 dialog.querySelector('#daily-close').onclick=()=>dialog.close();dialog.querySelector('#daily-start').onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-brief-tab]').forEach(b=>b.onclick=async()=>{dialog.close();await navigate(b.dataset.briefTab);});
 dialog.addEventListener('close',()=>document.querySelector('#show-daily')?.focus({preventScroll:true}),{once:true});bindBriefTasks(state,async()=>showDaily(await api('owner/state'),navigate),dialog);dialog.showModal();
}
