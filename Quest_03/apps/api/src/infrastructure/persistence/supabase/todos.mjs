import {requireValue} from '../../../../../../packages/domain/src/index.mjs';
export function validateSupabaseConfig({url,key}){
 requireValue(typeof url==='string'&&/^https:\/\/[a-z0-9]{10,40}\.supabase\.co$/.test(url),'Supabase Project URL(https://프로젝트.supabase.co)을 입력하세요.');
 requireValue(typeof key==='string'&&key.length>=20&&key.length<3000,'Publishable 또는 anon 키를 입력하세요.');
 let role;try{role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url')).role;}catch{}
 requireValue(key.startsWith('sb_publishable_')||role==='anon','service_role/secret 키는 사용할 수 없습니다. Publishable 또는 anon 키를 사용하세요.');
 return {url,key};
}
export function createSupabaseTodos(config,transport=fetch){
 const {url,key}=validateSupabaseConfig(config);
 async function request(path,{token,method='GET',body,prefer}={}){
  const r=await transport(url+path,{method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>null);
  if(!r.ok){const e=new Error(r.status===401?'Supabase에 다시 로그인하세요.':r.status===403?'Supabase 권한 또는 RLS 정책을 확인하세요.':data?.code==='42P01'?'SQL migration을 먼저 적용하세요.':'Supabase 요청이 실패했습니다. 계정·SQL·연결 설정을 확인하세요.');e.status=r.status===401?401:502;e.providerStatus=r.status;e.code=data?.code;throw e;}return data;
 }
 async function login(email,password){requireValue(typeof email==='string'&&email.includes('@')&&typeof password==='string','이메일과 비밀번호를 입력하세요.');const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});requireValue(s?.user?.id&&s.access_token,'Supabase 로그인 응답을 확인하세요.',502);return {token:s.access_token,userId:s.user.id,email:s.user.email};}
 const select='id,title,completed,version';
 const endpoint=(suffix='')=>'/rest/v1/orbit_todos?select='+select+suffix;
 const dto=r=>({id:r.id,title:r.title,completed:r.completed,version:r.version});
 return {request,login,
  async list(s){return (await request(endpoint('&order=created_at.asc,id.asc'),{token:s.token})).map(dto);},
  async create(s,b){return dto((await request(endpoint(),{method:'POST',token:s.token,body:{...(b.id?{id:b.id}:{}),owner_id:s.userId,title:b.title,completed:b.completed??false},prefer:'return=representation'}))[0]);},
  async update(s,id,b){const rows=await request(endpoint('&id=eq.'+encodeURIComponent(id)+'&version=eq.'+b.expectedVersion),{method:'PATCH',token:s.token,body:{title:b.title,completed:b.completed,version:b.expectedVersion+1},prefer:'return=representation'});requireValue(rows.length===1,'다른 변경이 있거나 항목이 없습니다. 새로고침하세요.',409);return dto(rows[0]);},
  async remove(s,id,b){const rows=await request(endpoint('&id=eq.'+encodeURIComponent(id)+'&version=eq.'+b.expectedVersion),{method:'DELETE',token:s.token,prefer:'return=representation'});requireValue(rows.length===1,'다른 변경이 있거나 항목이 없습니다.',409);return {ok:true};}
 };
}
