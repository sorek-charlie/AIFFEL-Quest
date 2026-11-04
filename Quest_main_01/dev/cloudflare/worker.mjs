const COOKIE='__Host-returncheck',TTL=8*60*60;
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const random=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...extra}});
const fail=(message,status=400)=>json({error:message},status);
function token(request){return (request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
async function session(request,db){
 const value=token(request);if(!/^[a-f0-9]{64}$/.test(value))return null;
 return db.prepare('SELECT users.id, users.username FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').bind(await digest(value),Date.now()).first();
}
async function passwordHash(password,salt){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
function equal(a,b){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function publicDemoVideo(request,env){
 const assetHeaders=new Headers(request.headers);assetHeaders.delete('Range');assetHeaders.delete('If-Range');assetHeaders.set('Accept-Encoding','identity');
 const full=await env.ASSETS.fetch(new Request(request.url,{method:'GET',headers:assetHeaders}));
 if(!full.ok)return full;
 const resultHeaders=new Headers(full.headers);resultHeaders.set('Content-Type','video/mp4');resultHeaders.set('Accept-Ranges','bytes');resultHeaders.set('Cache-Control','public, max-age=600');
 const range=request.headers.get('Range'),ifRange=request.headers.get('If-Range');
 if(!range||(ifRange&&ifRange!==full.headers.get('ETag')&&ifRange!==full.headers.get('Last-Modified'))){
  return new Response(request.method==='HEAD'?null:full.body,{status:200,headers:resultHeaders});
 }
 const bytes=await full.arrayBuffer(),length=bytes.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
 let start=0,end=length-1;
 if(match&&(match[1]||match[2])){
  if(!match[1])start=Math.max(0,length-Number(match[2]));
  else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
 }
 if(!match||(!match[1]&&!match[2])||(!match[1]&&Number(match[2])===0)||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=length||start>end){
  resultHeaders.set('Content-Range',`bytes */${length}`);resultHeaders.delete('Content-Length');return new Response(null,{status:416,headers:resultHeaders});
 }
 resultHeaders.set('Content-Range',`bytes ${start}-${end}/${length}`);resultHeaders.set('Content-Length',String(end-start+1));
 return new Response(request.method==='HEAD'?null:bytes.slice(start,end+1),{status:206,headers:resultHeaders});
}
async function limited(db,key,max,seconds){
 const now=Date.now(),expiry=now+seconds*1000;
 const row=await db.prepare('INSERT INTO auth_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(key,expiry,now,now).first();
 return row.count>max;
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/outputs/main-quest/video/main-quest-capture-introduction-1080p.mp4'&&['GET','HEAD'].includes(request.method))return publicDemoVideo(request,env);
  if(!path.startsWith('/api/auth/')){
   if(path==='/'||path==='/index'||path==='/index.html'||/^\/app(?:\/(?:index(?:\.html)?)?)?\/?$/.test(path)||path.startsWith('/docs/')){
    if(!env.AUTH_DB)return new Response('로그인 서비스를 준비 중입니다. 잠시 후 다시 접속하세요.',{status:503});
    if(!await session(request,env.AUTH_DB))return new Response(null,{status:302,headers:{Location:'/login.html','Cache-Control':'no-store'}});
   }
   const response=await env.ASSETS.fetch(request);
   if(path.endsWith('.html')||path==='/app/'||path==='/'){
    const copy=new Response(response.body,response);copy.headers.set('Cache-Control','no-store');return copy;
   }
   return response;
  }
  if(!env.AUTH_DB)return fail('로그인 서비스를 준비 중입니다.',503);
  const db=env.AUTH_DB;
  try{
   if(request.method==='GET'&&path==='/api/auth/session'){
    const user=await session(request,db);return user?json({user:{username:user.username}}):json({user:null},401);
   }
   if(request.method!=='POST')return fail('지원하지 않는 요청입니다.',405);
   if(request.headers.get('Origin')!==url.origin)return fail('요청 출처를 확인할 수 없습니다.',403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return fail('JSON 요청이 필요합니다.',415);
   if(Number(request.headers.get('Content-Length')||0)>4096)return fail('요청이 너무 큽니다.',413);
   const text=await request.text();if(text.length>4096)return fail('요청이 너무 큽니다.',413);
   let input;try{input=JSON.parse(text)}catch{return fail('입력 내용을 확인해 주세요.')}
   if(path==='/api/auth/logout'){
    await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token(request))).run();
    return json({ok:true},200,{'Set-Cookie':`${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`});
   }
   if(!['/api/auth/register','/api/auth/login'].includes(path))return fail('경로를 찾을 수 없습니다.',404);
   const username=String(input.username||'').trim().toLowerCase(),password=input.password;
   if(!/^[a-z0-9][a-z0-9_-]{3,31}$/.test(username))return fail('ID는 영문·숫자로 시작하는 4~32자(영문·숫자·_·-)로 입력하세요.');
   if(typeof password!=='string'||password.length<10||password.length>128)return fail('비밀번호는 10~128자로 입력하세요.');
   const purpose=path.endsWith('register')?'register':'login';
   const ip=request.headers.get('CF-Connecting-IP')||'local';
   if(await limited(db,await digest(purpose+':'+ip),purpose==='register'?10:30,900))return fail('요청이 많습니다. 15분 후 다시 시도하세요.',429);
   if(purpose==='register'){
    const salt=random(24),now=Date.now();
    const hash=await passwordHash(password,salt);
    const result=await db.prepare('INSERT OR IGNORE INTO users(id,username,password_hash,salt,created_at,available_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),username,hash,salt,now,now+10000).run();
    if(!result.meta.changes)return fail('이미 사용 중인 ID입니다.',409);
    return json({ok:true,username,availableInSeconds:10},201);
   }
   if(await limited(db,await digest('account:'+username),15,900))return fail('로그인 시도가 많습니다. 15분 후 다시 시도하세요.',429);
   const user=await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
   const hash=await passwordHash(password,user?.salt||'unregistered-account-fixed-padding');
   if(!user||!equal(hash,user.password_hash))return fail('ID 또는 비밀번호를 확인해 주세요.',401);
   if(user.available_at>Date.now())return json({error:'회원가입 처리 중입니다. 잠시 후 다시 로그인하세요.',retryAfter:Math.ceil((user.available_at-Date.now())/1000)},425);
   const value=random(32);
   await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await digest(value),user.id,Date.now()+TTL*1000).run();
   ctx.waitUntil(Promise.all([
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(Date.now()).run(),
    db.prepare('DELETE FROM auth_limits WHERE expires_at<=?').bind(Date.now()).run()
   ]));
   return json({ok:true,user:{username}},200,{'Set-Cookie':`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${TTL}`});
  }catch{
   return fail('서비스에 연결하지 못했습니다. 잠시 후 다시 시도하세요.',503);
  }
 }
};
