const params=new URLSearchParams(location.hash.slice(1));
let token=params.get('type')==='recovery'?params.get('access_token'):null;
const expired=params.has('error')||params.has('error_code');
history.replaceState(null,'','/reset-password');
const status=document.querySelector('#status'),form=document.querySelector('form');
if(!token||expired){token=null;status.textContent='유효한 재설정 링크가 없습니다. Supabase Users에서 비밀번호 재설정 메일을 다시 보내고, 가장 최근 메일의 링크를 클릭하세요. 주소를 직접 입력하면 변경할 수 없습니다.';}
else{form.hidden=false;status.textContent='새 비밀번호를 두 번 입력하고 저장하세요.';}
form.onsubmit=async event=>{
 event.preventDefault();const password=form.elements.password.value;
 if(password!==form.elements.confirmation.value){status.textContent='두 비밀번호가 다릅니다.';return;}
 if(!token)return;const button=form.querySelector('button');button.disabled=true;status.textContent='저장 중입니다.';
 try{
  const configResponse=await fetch('/recovery-config',{cache:'no-store'});if(!configResponse.ok)throw Error('PC 앱의 Supabase 연결 설정을 확인하세요.');
  const config=await configResponse.json();
  const response=await fetch(config.url+'/auth/v1/user',{method:'PUT',redirect:'error',signal:AbortSignal.timeout(20000),headers:{apikey:config.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password})});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.code==='weak_password'?'더 강한 비밀번호를 입력하세요.':data.code==='same_password'?'기존과 다른 새 비밀번호를 입력하세요.':'재설정 링크가 만료됐거나 변경을 완료하지 못했습니다. 새 메일의 링크로 다시 시도하세요.');}
  token=null;form.reset();form.hidden=true;status.textContent='비밀번호를 변경했습니다. 이 창을 닫고 이성진 앱에서 본인 이메일과 새 비밀번호로 클라우드 로그인하세요.';
 }catch(error){status.textContent=error.message||'연결을 확인하고 다시 시도하세요.';}finally{button.disabled=false;}
};
window.addEventListener('pagehide',()=>{token=null;form.reset();},{once:true});
