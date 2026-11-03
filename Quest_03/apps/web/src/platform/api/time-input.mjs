export const tenMinuteTimes=Array.from({length:144},(_,i)=>`${String(Math.floor(i/6)).padStart(2,'0')}:${String(i%6*10).padStart(2,'0')}`);
export function bindTenMinuteTimes(root=document){
 for(const input of root.querySelectorAll('input[type="datetime-local"]')){
  if(input.closest('[hidden]'))continue;
  const label=input.parentElement.textContent.trim(),required=input.required;
  const native=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  input.type='hidden';input.required=false;
  const group=document.createElement('span');group.className='ten-minute-picker';
  const date=document.createElement('input');date.type='date';date.required=required;date.setAttribute('aria-label',label+' 날짜');
  const time=document.createElement('select');time.required=required;time.setAttribute('aria-label',label+' 시각 (10분 단위)');
  for(const value of tenMinuteTimes)time.add(new Option(value,value));
  function refresh(){const value=native.get.call(input),clock=value.slice(11,16);date.value=value.slice(0,10);time.querySelector('[data-original]')?.remove();if(clock&&!tenMinuteTimes.includes(clock)){const option=new Option(clock+' (기존 시간)',clock);option.dataset.original='true';time.add(option);}time.value=clock||'09:00';}
  Object.defineProperty(input,'value',{configurable:true,get(){return native.get.call(this);},set(value){native.set.call(this,value);refresh();}});
  function update(){native.set.call(input,date.value?date.value+'T'+time.value:'');input.dispatchEvent(new Event('input',{bubbles:true}));}
  date.addEventListener('change',update);time.addEventListener('change',update);
  input.form?.addEventListener('reset',()=>queueMicrotask(refresh));
  group.append(date,time);input.after(group);refresh();
 }
}
