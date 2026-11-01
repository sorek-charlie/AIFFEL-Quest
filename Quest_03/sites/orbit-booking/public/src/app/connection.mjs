import {api,escape} from '../platform/api/index.mjs';
export function showConnectionError(error,recover){
 document.body.classList.add('auth-screen');
 const remote=location.protocol==='https:';
 document.querySelector('#app').innerHTML=`<main class="auth-card"><div class="brand">◉ 이성진<span>나의 시간 공간</span></div><h1>${remote?'PC와 다시 연결하는 중입니다.':'프로그램에 연결할 수 없습니다.'}</h1><p>${remote?'이 화면은 PC 앱의 일정과 연결됩니다. PC에서 최신 이성진-Scheduler.exe를 실행하고 인터넷 연결을 유지해 주세요.':'프로그램 실행 창을 확인한 뒤 다시 연결해 주세요.'}</p><p id="connection-state" role="status" aria-live="polite">${escape(error.message||'연결 응답을 기다리고 있습니다.')}</p><button id="connection-retry">지금 다시 연결</button>${remote?'<p>PC가 연결되면 로그인 화면이 자동으로 열립니다. 일정은 삭제되지 않습니다.</p><a href="/booking">고객 신청 화면</a>':''}</main>`;
 let busy=false,stopped=false;const button=document.querySelector('#connection-retry');
 async function retry(){if(busy||stopped)return;busy=true;button.disabled=true;try{await api('auth/session');stopped=true;clearInterval(timer);document.body.classList.remove('auth-screen');await recover();}catch(e){const status=document.querySelector('#connection-state');if(status)status.textContent=e.message;}finally{busy=false;if(button.isConnected)button.disabled=false;}}
 button.onclick=retry;const timer=setInterval(retry,5000);
 window.addEventListener('pagehide',()=>{stopped=true;clearInterval(timer);},{once:true});
 button.focus();
}
