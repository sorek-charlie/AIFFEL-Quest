import {act} from '../../platform/api/index.mjs';
export function openMonthPicker(value,onSelect,trigger){
 document.querySelector('#month-select-dialog')?.remove();
 let year=Number(value.slice(0,4));const selected=Number(value.slice(5));
 const dialog=document.createElement('dialog');dialog.id='month-select-dialog';dialog.className='month-select-dialog';dialog.setAttribute('aria-labelledby','month-select-title');
 dialog.innerHTML='<div class="section-title"><h2 id="month-select-title">연·월 선택</h2><button type="button" aria-label="월 선택 닫기">×</button></div><div class="year-select"><button type="button" data-year="-1" aria-label="이전 연도">‹</button><label><span class="sr-only">연도</span><input type="number" name="year" min="1900" max="2199" aria-label="연도"></label><button type="button" data-year="1" aria-label="다음 연도">›</button></div><div class="month-select-grid"></div>';
 document.querySelector('.shell').append(dialog);const input=dialog.querySelector('input'),grid=dialog.querySelector('.month-select-grid');
 function render(){input.value=String(year);grid.innerHTML=Array.from({length:12},(_,i)=>`<button type="button" data-select-month="${i+1}" aria-pressed="${year===Number(value.slice(0,4))&&i+1===selected}">${i+1}월</button>`).join('');grid.querySelectorAll('button').forEach(button=>button.onclick=()=>act(async()=>{const month=`${year}-${button.dataset.selectMonth.padStart(2,'0')}`;dialog.close();await onSelect(month);}));}
 input.onchange=()=>{const n=Number(input.value);if(Number.isInteger(n)&&n>=1900&&n<=2199)year=n;render();};
 dialog.querySelectorAll('[data-year]').forEach(button=>button.onclick=()=>{year=Math.max(1900,Math.min(2199,year+Number(button.dataset.year)));render();});
 dialog.querySelector('[aria-label="월 선택 닫기"]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus();},{once:true});render();dialog.showModal();grid.querySelector(`[data-select-month="${selected}"]`).focus();
}
