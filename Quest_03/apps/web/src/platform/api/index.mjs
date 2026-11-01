export async function api(path, method='GET',body, key) {
  const response=await fetch('/api/v1/'+path,{method,headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok){const error=new Error(data.error?.message||'서버에 연결하지 못했습니다.');error.status=response.status;error.code=data.error?.code;throw error;}return data;
}
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const time=s=>new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'});
export const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
export function notice(message) {document.querySelector('#notice').textContent=message;}
export async function act(fn) {try {await fn();}catch(e){notice(e.message);}}
export const formObject=f=>Object.fromEntries(new FormData(f));
