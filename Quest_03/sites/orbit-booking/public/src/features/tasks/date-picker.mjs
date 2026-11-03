import {escape,today} from '../../platform/api/index.mjs';
import {monthCells,shiftMonth,openMonthPicker} from '../calendar/index.mjs';
export function bindTaskDatePicker(input,{label='할 일 날짜',clearable=true}={}){
 if(!input||input.dataset.customDate)return;input.dataset.customDate='true';input.type='hidden';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='task-date-trigger';
 const update=()=>{trigger.textContent=input.value?input.value.replaceAll('-',' / '):'날짜 선택';trigger.setAttribute('aria-label',label+' 선택 '+(input.value||'미지정'));};update();input.after(trigger);input.addEventListener('input',update);input.form?.addEventListener('reset',()=>queueMicrotask(update));
 trigger.onclick=()=>{
  document.querySelector('#task-date-dialog')?.remove();let month=(input.value||today()).slice(0,7);
  const dialog=document.createElement('dialog');dialog.id='task-date-dialog';dialog.className='task-date-dialog';dialog.setAttribute('aria-labelledby','task-date-title');document.querySelector('.shell').append(dialog);
  function pick(value){input.value=value;update();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));dialog.close();}
  function render(){dialog.innerHTML=`<div class="section-title"><h2 id="task-date-title">${escape(label)}</h2><button type="button" aria-label="날짜 선택 닫기">×</button></div><div class="task-date-nav"><button type="button" data-date-step="-1" aria-label="이전 달">‹</button><button type="button" id="task-date-month">${month.slice(0,4)}년 ${Number(month.slice(5))}월</button><button type="button" data-date-step="1" aria-label="다음 달">›</button></div><div class="task-date-week">${['일','월','화','수','목','금','토'].map(x=>`<span>${x}</span>`).join('')}</div><div class="task-date-grid">${monthCells(month,[]).map(c=>c.inMonth?`<button type="button" data-pick-date="${c.date}" aria-label="${c.date}" aria-pressed="${c.date===input.value}" class="${c.date===today()?'today':''}">${c.day}</button>`:'<span></span>').join('')}</div><div class="actions"><button type="button" id="task-date-today">오늘</button>${clearable?'<button type="button" id="task-date-clear">날짜 없음</button>':''}</div>`;
   dialog.querySelector('[aria-label="날짜 선택 닫기"]').onclick=()=>dialog.close();dialog.querySelectorAll('[data-date-step]').forEach(b=>b.onclick=()=>{month=shiftMonth(month,Number(b.dataset.dateStep));render();});
   dialog.querySelector('#task-date-month').onclick=e=>openMonthPicker(month,async value=>{month=value;render();},e.currentTarget);
   dialog.querySelectorAll('[data-pick-date]').forEach(b=>{b.onclick=()=>pick(b.dataset.pickDate);b.onkeydown=e=>{const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};if(!(e.key in offsets))return;e.preventDefault();const value=new Date(Date.parse(b.dataset.pickDate+'T12:00:00Z')+offsets[e.key]*86400000).toISOString().slice(0,10);month=value.slice(0,7);render();dialog.querySelector(`[data-pick-date="${value}"]`)?.focus();};});
   dialog.querySelector('#task-date-today').onclick=()=>pick(today());const clear=dialog.querySelector('#task-date-clear');if(clear)clear.onclick=()=>pick('');
  }
  render();dialog.addEventListener('close',()=>{dialog.remove();trigger.focus();},{once:true});dialog.showModal();(dialog.querySelector(`[data-pick-date="${input.value||today()}"]`)||dialog.querySelector('[data-pick-date]')).focus();
 };
}
