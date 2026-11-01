import {api,escape,time,act,formObject,today} from '../../platform/api/index.mjs';
import {monthCells,shiftMonth,dayEvents,seoulDate} from './month-model.mjs';
const clock=s=>new Date(s).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});
const monthLabel=month=>`${Number(month.slice(0,4))}년 ${Number(month.slice(5))}월`;
export function monthView(events,state,{compact=false}={}) {
 const cells=monthCells(state.month,events),count=events.filter(e=>cells.some(c=>c.inMonth&&c.events.includes(e))).length;
 return `<section class="panel month-panel ${compact?'compact-month':''}" aria-label="월간 일정 달력"><div class="month-toolbar"><div><p class="panel-kicker">MY CALENDAR</p><h2>${monthLabel(state.month)} <span class="month-count">${count}개 일정</span></h2></div><div class="month-controls"><button type="button" class="quiet" data-month="-1" aria-label="이전 달">‹</button><button type="button" class="quiet today-button" data-month="today">오늘</button><button type="button" class="quiet" data-month="1" aria-label="다음 달">›</button>${compact?'':`<label class="month-picker"><span class="sr-only">이동할 월</span><input type="month" id="month-picker" value="${state.month}" aria-label="이동할 월"></label>`}</div></div><div class="calendar-weekdays" aria-hidden="true">${['일','월','화','수','목','금','토'].map(d=>`<span>${d}</span>`).join('')}</div><div class="month-grid weeks-${cells.length/7}" role="group" aria-label="${monthLabel(state.month)} 달력">${cells.map(c=>`<article class="month-cell ${c.inMonth?'':'outside'} ${c.date===today()?'is-today':''} ${state.selected===c.date?'is-selected':''}"><button class="day-number" data-date="${c.date}" aria-label="${c.date} ${c.events.length}개 일정" aria-pressed="${state.selected===c.date}">${c.day}${c.date===today()?'<span class="today-dot"></span>':''}</button><div class="day-items">${c.events.map(e=>`<button class="calendar-event ${e.requestId?'reservation':''}" data-calendar-event="${e.id}" data-date="${c.date}" title="${escape(e.title)} · ${time(e.startsAt)} → ${time(e.endsAt)}"><span class="event-clock">${seoulDate(e.startsAt)===c.date?clock(e.startsAt):'계속'}</span><span>${escape(e.title)}</span></button>`).join('')}</div></article>`).join('')}</div><div class="calendar-legend"><span><i></i>개인 일정</span><span><i></i>확정 예약</span><span>날짜를 선택해 일정을 확인하세요</span></div></section>`;
}
function eventEditor(date) {return `<section class="panel event-editor"><div class="section-title"><h2>일정 만들기</h2><span>Asia/Seoul</span></div><form id="event-form"><label>일정 이름<input name="title" maxlength="160" required placeholder="새로운 일정"></label><div class="columns"><label>시작<input type="datetime-local" name="start" value="${date}T09:00" required></label><label>종료<input type="datetime-local" name="end" value="${date}T10:00" required></label></div><div class="actions"><button>일정 저장</button><button type="button" id="reset-event" class="quiet">새 일정</button></div></form></section>`;}
function eventList(events,state) {
 const filtered=state.selected?dayEvents(events,state.selected):events.slice().sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
 return `<section class="panel all-events-panel"><div class="section-title"><h2>${state.selected?state.selected+' 일정':'전체 일정'} <span class="month-count">${filtered.length}개</span></h2><div>${state.selected?'<button class="quiet" id="show-all-events">전체 일정 보기</button>':''}<button id="flat-view" class="quiet" aria-pressed="true">2D</button><button id="space-view" class="quiet" aria-pressed="false">공간 보기</button></div></div><div id="events" class="event-list">${filtered.length?filtered.map(e=>`<article class="event" id="event-${e.id}" tabindex="-1"><div class="event-mark"></div><div class="grow"><strong>${escape(e.title)}</strong><p>${time(e.startsAt)} → ${time(e.endsAt)}</p><span>${e.requestId?'확정 예약':'개인 일정'}</span></div>${e.requestId?'<span class="hint">승인함에서 취소</span>':`<button class="quiet" data-edit-event="${e.id}">수정</button><button class="quiet" data-del-event="${e.id}">취소</button>`}</article>`).join(''):`<p class="empty">${state.selected?'선택한 날짜에 일정이 없습니다.':'등록된 일정이 없습니다.'}<br>달력에서 날짜를 선택하고 새 일정을 추가하세요.</p>`}</div></section>`;
}
export function calendarView(events,state) {
 return `<div class="calendar-layout"><div class="calendar-main">${monthView(events,state)}${eventList(events,state)}</div><div class="calendar-sidebar">${eventEditor(state.selected||today())}<section class="calendar-tip"><span aria-hidden="true">✦</span><h3>하루를 한눈에, 여유를 더 넓게.</h3><p>달력에서 모든 일정을 살펴보세요. 여러 날에 걸친 일정도 날짜별로 표시됩니다.</p></section></div></div>`;
}
export function bindMonth(events,state,refresh,onSelect) {
 document.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>act(async()=>{state.month=b.dataset.month==='today'?today().slice(0,7):shiftMonth(state.month,Number(b.dataset.month));state.selected=null;await refresh();document.querySelector('[data-month="'+b.dataset.month+'"]')?.focus({preventScroll:true});}));
 const picker=document.querySelector('#month-picker');if(picker)picker.onchange=()=>act(async()=>{if(/^\d{4}-\d{2}$/.test(picker.value)){state.month=picker.value;state.selected=null;await refresh();}});
 document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>act(async()=>{state.selected=b.dataset.date;state.month=state.selected.slice(0,7);await onSelect(b.dataset.calendarEvent);if(b.dataset.calendarEvent){const target=document.getElementById('event-'+b.dataset.calendarEvent);target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});}else document.querySelector(`[data-date="${state.selected}"]`)?.focus({preventScroll:true});}));
}
export function bindCalendar(events,reload,state) {
 bindMonth(events,state,reload,async()=>reload());
 const form=document.querySelector('#event-form');let editing;
 function reset(){editing=null;form.reset();form.querySelector('button').textContent='일정 저장';}
 form.onsubmit=e=>{e.preventDefault();act(async()=>{const b=formObject(form);await api('owner/events'+(editing?'/'+editing.id:''),editing?'PATCH':'POST',{title:b.title,startsAt:new Date(b.start+':00+09:00').toISOString(),endsAt:new Date(b.end+':00+09:00').toISOString(),...(editing?{expectedVersion:editing.version}:{})});state.month=b.start.slice(0,7);await reload();});};
 document.querySelector('#reset-event').onclick=reset;
 for(const ev of events.filter(e=>!e.requestId)) {
 const edit=document.querySelector(`[data-edit-event="${ev.id}"]`),del=document.querySelector(`[data-del-event="${ev.id}"]`);
 if(edit)edit.onclick=()=>{editing=ev;form.elements.title.value=ev.title;for(const [k,v] of [['start',ev.startsAt],['end',ev.endsAt]])form.elements[k].value=new Date(Date.parse(v)+9*3600000).toISOString().slice(0,16);form.querySelector('button').textContent='일정 수정 저장';form.elements.title.focus();};
 if(del)del.onclick=()=>act(async()=>{await api('owner/events/'+ev.id,'DELETE',{expectedVersion:ev.version});await reload();});
 }
 const all=document.querySelector('#show-all-events');if(all)all.onclick=()=>act(async()=>{state.selected=null;await reload();});
 document.querySelector('#space-view').onclick=()=>act(async()=>{const {setSpatial}=await import('../../scene/calendar/index.mjs');setSpatial(true);});
 document.querySelector('#flat-view').onclick=()=>act(async()=>{const {setSpatial}=await import('../../scene/calendar/index.mjs');setSpatial(false);});
}

