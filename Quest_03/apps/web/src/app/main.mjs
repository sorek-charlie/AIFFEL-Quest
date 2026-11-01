import {api,notice} from '../platform/api/index.mjs';
const launchToken=new URLSearchParams(location.hash.slice(1)).get('launch');
if(launchToken)history.replaceState(null,'',location.pathname);
try {
 if(location.pathname.startsWith('/book/')){const {mountPublic}=await import('./public/index.mjs');await mountPublic();}
 else {
  const {mountOwner}=await import('./owner/index.mjs'),{mountAuth}=await import('./auth/index.mjs');
  const s=await api('auth/session');if(s.authenticated&&!launchToken)await mountOwner();else await mountAuth(()=>mountOwner({showDailyOnLogin:true}),launchToken);
 }
}catch(error){document.querySelector('#app').innerHTML='<main class="auth-card"><div class="brand">◉ ORBIT</div><h1>프로그램 연결을 확인해 주세요.</h1><p>PC 실행 창이 켜져 있는지 확인하고 다시 시도하세요.</p><button id="connection-retry">다시 시도</button></main>';document.querySelector('#connection-retry').onclick=()=>location.reload();notice(error.message);}

