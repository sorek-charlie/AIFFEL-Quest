export async function api(path, method='GET',body, key) {
  let response;try{response=await fetch('/api/v1/'+path,{method,signal:AbortSignal.timeout(path==='owner/inputs/upload'?90000:25000),headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});
  }catch(cause){throw new Error(cause.name==='TimeoutError'?'응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.':'PC 앱에 연결하지 못했습니다. 이성진 실행 창이 켜져 있는지 확인하고 새로고침하세요.',{cause});}
  const data=await response.json();if(!response.ok){const error=new Error(data.error?.message||'서버에 연결하지 못했습니다.');error.status=response.status;error.code=data.error?.code;throw error;}return data;
}
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const time=s=>new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'});
export const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
let noticeTimer;
export function notice(message) {
 clearTimeout(noticeTimer);const element=document.querySelector('#notice');if(!element)return;
 const dismiss=()=>{clearTimeout(noticeTimer);element.textContent='';};
 element.textContent=message;element.onclick=dismiss;element.tabIndex=0;element.onkeydown=event=>{if(['Enter',' ','Escape'].includes(event.key)){event.preventDefault();dismiss();}};
 if(message)noticeTimer=setTimeout(dismiss,1000);
}
export async function act(fn) {try {await fn();}catch(e){notice(e.message);}}
export const formObject=f=>Object.fromEntries(new FormData(f));

export function sourceLink(item,label=item.title){
 const m=item.sourceEmail;
 if(!m||typeof m.messageId!=='string'||!/^[a-zA-Z0-9_-]+$/.test(m.messageId))return escape(label);
 const url='https://mail.google.com/mail/u/'+encodeURIComponent(m.account||'')+'/#all/'+encodeURIComponent(m.messageId);
 return `<a class="gmail-source" href="${escape(url)}" target="_blank" rel="noopener noreferrer" title="원본 Gmail 열기 (새 탭)">${escape(label)} ↗</a>`;
}

export {bindTenMinuteTimes} from './time-input.mjs';
