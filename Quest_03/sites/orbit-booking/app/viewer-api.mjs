import {viewerData} from './viewer-data.mjs';
const cookieName='quest03_viewer',password='Quest03-View-2026!';
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0));
async function key(secret){return crypto.subtle.importKey('raw',new TextEncoder().encode('viewer-only:'+secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function issue(secret){const payload=encode(new TextEncoder().encode(JSON.stringify({scope:'quest03-viewer',exp:Date.now()+8*3600000}))),signature=encode(await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(payload)));return payload+'.'+signature;}
async function authorized(request,secret){try{const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token||token.length>1024)return false;const [payload,signature,...rest]=token.split('.');if(rest.length||!payload||!signature)return false;if(!await crypto.subtle.verify('HMAC',await key(secret),decode(signature),new TextEncoder().encode(payload)))return false;const data=JSON.parse(new TextDecoder().decode(decode(payload)));return data.scope==='quest03-viewer'&&Number.isFinite(data.exp)&&data.exp>Date.now();}catch{return false;}}
export async function viewerHandle(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/v1/viewer/'))return null;
 if(!env.CLOUD_SYNC_KEY)return json({error:{message:'열람 화면 연결 준비 중입니다.'}},503);
 const route=url.pathname.slice('/api/v1/viewer/'.length),method=request.method;
 if(method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:{code:'ORIGIN_DENIED',message:'같은 화면에서 로그인하세요.'}},403);
 if(route==='login'&&method==='POST'){if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({error:{message:'로그인 정보를 확인하세요.'}},415);const raw=await request.text();if(raw.length>1024)return json({error:{message:'요청이 큽니다.'}},413);let body;try{body=JSON.parse(raw);}catch{return json({error:{message:'로그인 정보를 확인하세요.'}},400);}if(body.password!==password)return json({error:{message:'열람 비밀번호를 확인하세요.'}},401);return json({ok:true,mode:'read-only'},200,{'Set-Cookie':`${cookieName}=${await issue(env.CLOUD_SYNC_KEY)}; Path=/api/v1/viewer; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`});}
 if(route==='logout'&&method==='POST')return json({ok:true},200,{'Set-Cookie':`${cookieName}=; Path=/api/v1/viewer; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});
 // This namespace has no data write path, including for authenticated viewers.
 if(method!=='GET')return json({error:{code:'READ_ONLY',message:'열람 전용입니다. 입력·수정·삭제할 수 없습니다.'}},403);
 const signedIn=await authorized(request,env.CLOUD_SYNC_KEY);
 if(route==='session')return json({signedIn,mode:'read-only'});
 if(!signedIn)return json({error:{message:'열람 비밀번호로 로그인하세요.'}},401);
 if(route==='state')return json(viewerData);
 return json({error:{message:'찾을 수 없습니다.'}},404);
}
