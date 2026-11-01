import {api} from '../platform/api/index.mjs';
const launchToken=new URLSearchParams(location.hash.slice(1)).get('launch');
if(launchToken)history.replaceState(null,'',location.pathname);
async function boot(){try {
 if(location.pathname.startsWith('/book/')){const {mountPublic}=await import('./public/index.mjs');await mountPublic();}
 else {
  const {mountOwner}=await import('./owner/index.mjs'),{mountAuth}=await import('./auth/index.mjs');
  const s=await api('auth/session');if(s.authenticated&&!launchToken)await mountOwner();else await mountAuth(()=>mountOwner({showDailyOnLogin:true}),launchToken);
 }
}catch(error){const {showConnectionError}=await import('./connection.mjs');showConnectionError(error,boot);}}
await boot();
