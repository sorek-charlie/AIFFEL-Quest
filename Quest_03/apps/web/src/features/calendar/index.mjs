import {dayInfo} from './korean-holidays.mjs';
import {openMonthPicker} from './month-picker.mjs';
import {sourceLink,api,escape,time,act,today} from '../../platform/api/index.mjs';
import {monthCells,shiftMonth,dayEvents,seoulDate,monthEvents} from './month-model.mjs';
const clock=s=>new Date(s).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});
const monthLabel=month=>`${Number(month.slice(0,4))}년 ${Number(month.slice(5))}월`;
export function monthView(events,state,{compact=false}={}) {
 const cells=monthCells(state.month,events),count=events.filter(e=>cells.some(c=>c.inMonth&&c.events.includes(e))).length;
 return `<section class="panel month-panel ${compact?'compact-month':''}" aria-label="월간 일정 달력"><div class="month-toolbar"><div><h2>${monthLabel(state.month)} <span class="month-count">${count}개 일정</span></h2></div><div class="month-controls"><button type="button" class="quiet" data-month="-1" aria-label="이전 달">‹</button><button type="button" class="quiet today-button" data-month="today">오늘</button><button type="button" class="quiet" data-month="1" aria-label="다음 달">›</button>${compact?'':`<button type="button" id="month-picker" class="quiet month-picker-trigger" aria-label="연도와 월 선택" title="연도와 월 선택"><svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><path d="M3 10h18M8 3v5M16 3v5" stroke="#2563eb" stroke-width="2"/><path d="M7 14h3M14 14h3M7 18h3M14 18h3" stroke="#2563eb" stroke-width="2"/></svg></button>`}</div></div><div class="calendar-weekdays" aria-hidden="true">${['일','월','화','수','목','금','토'].map(d=>`<span>${d}</span>`).join('')}</div><div class="month-grid weeks-${cells.length/7}" role="group" aria-label="${monthLabel(state.month)} 달력">${cells.map(c=>`<article class="month-cell ${dayInfo(c.date).color} ${c.inMonth?'':'outside'} ${c.date===today()?'is-today':''} ${state.selected===c.date?'is-selected':''}"><button class="day-number" data-date="${c.date}" aria-label="${c.date} ${escape(dayInfo(c.date).holiday)} ${c.events.length}개 일정" aria-pressed="${state.selected===c.date}">${c.day}${c.date===today()?'<span class="today-dot"></span>':''}</button>${dayInfo(c.date).holiday?`<span class="holiday-name">${escape(dayInfo(c.date).holiday)}</span>`:''}<div class="day-items">${c.events.map(e=>`<button class="calendar-event " data-calendar-event="${e.id}" data-date="${c.date}" title="${escape(e.title)} · ${time(e.startsAt)} → ${time(e.endsAt)}"><span class="event-clock">${seoulDate(e.startsAt)===c.date?clock(e.startsAt):'계속'}</span><span>${escape(e.title)}</span></button>`).join('')}</div></article>`).join('')}</div><div class="calendar-legend"><span><i></i>개인 일정</span><span>${dayInfo(state.month+'-01').known?'대한민국 공휴일 · 일요일 빨강 / 토요일 파랑':'공휴일 자료 미확인 연도 (확인 범위: 2026~2027)'}</span></div></section>`;
}
function eventList(events,state) {
 const filtered=state.selected?dayEvents(monthEvents(events,state.month),state.selected):monthEvents(events,state.month);
 return `<section class="panel all-events-panel"><div class="section-title"><h2>${state.selected?state.selected+' 일정':'전체 일정'} <span class="month-count">${filtered.length}개</span></h2><label class="event-month-picker"><span class="sr-only">목록 월 선택</span><input type="month" id="event-month-picker" value="${state.month}" aria-label="목록 월 선택"></label><div>${state.selected?'<button class="quiet" id="show-all-events">이달 전체 보기</button>':''}</div></div><div id="events" class="event-list" tabindex="0" aria-label="월별 일정 목록">${filtered.length?filtered.map(e=>`<article class="event" id="event-${e.id}" tabindex="-1"><div class="event-mark"></div><div class="grow"><strong>${sourceLink(e)}</strong><p>${time(e.startsAt)} → ${time(e.endsAt)}</p><span>개인 일정</span></div><button class="quiet" data-edit-event="${e.id}">수정</button><button class="quiet" data-del-event="${e.id}">삭제</button></article>`).join(''):`<p class="empty">${state.selected?'선택한 날짜에 일정이 없습니다.':'등록된 일정이 없습니다.'}<br>달력에서 날짜를 선택하고 새 일정을 추가하세요.</p>`}</div></section>`;
}
export function calendarView(events,state) {
 return `<div class="calendar-layout calendar-overview">${monthView(events,state)}${eventList(events,state)}</div>`;
}
export function bindMonth(events,state,refresh,onSelect) {
 document.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>act(async()=>{state.month=b.dataset.month==='today'?today().slice(0,7):shiftMonth(state.month,Number(b.dataset.month));state.selected=null;await refresh();document.querySelector('[data-month="'+b.dataset.month+'"]')?.focus({preventScroll:true});}));
 const monthPicker=document.querySelector('#month-picker');if(monthPicker)monthPicker.onclick=()=>openMonthPicker(state.month,async month=>{state.month=month;state.selected=null;await refresh();},monthPicker);
 document.querySelectorAll('#event-month-picker').forEach(picker=>picker.onchange=()=>act(async()=>{if(/^\d{4}-\d{2}$/.test(picker.value)){state.month=picker.value;state.selected=null;await refresh();}}));
 document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>act(async()=>{state.selected=b.dataset.date;state.month=state.selected.slice(0,7);await onSelect(b.dataset.calendarEvent);if(b.dataset.calendarEvent){const target=document.getElementById('event-'+b.dataset.calendarEvent);target?.focus({preventScroll:true});target?.scrollIntoView({block:'nearest'});}else document.querySelector(`[data-date="${state.selected}"]`)?.focus({preventScroll:true});}));
}
export function bindCalendar(events,reload,state,onEdit) {
 bindMonth(events,state,reload,async()=>reload());
 for(const ev of events) {
 const edit=document.querySelector(`[data-edit-event="${ev.id}"]`),del=document.querySelector(`[data-del-event="${ev.id}"]`);
 if(edit)edit.onclick=()=>onEdit?.(ev);
 if(del)del.onclick=()=>act(async()=>{await api('owner/events/'+ev.id,'DELETE',{expectedVersion:ev.version});await reload();});
 }
 const all=document.querySelector('#show-all-events');if(all)all.onclick=()=>act(async()=>{state.selected=null;await reload();});
}


export {monthCells,shiftMonth,openMonthPicker,dayInfo};
