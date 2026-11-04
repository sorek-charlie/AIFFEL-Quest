(()=>{'use strict';
 const $=id=>document.getElementById(id),dialog=$('signupDialog');let pending=false,countdown=null,signupSucceeded=false;
 const notify=(id,message,error=false)=>{const el=$(id);el.textContent=message;el.classList.toggle('error',error);el.classList.toggle('success',!error&&!!message)};
 async function api(action,data){
  const r=await fetch('/api/auth/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  let value;try{value=await r.json()}catch{throw Error('로그인 서비스에 연결하지 못했습니다.')}
  if(!r.ok)throw Error(value.error||'다시 시도해 주세요.');return value;
 }
 function lock(form,value){form.querySelectorAll('input,button').forEach(e=>e.disabled=value)}
 function openSignup(automatic=false){if(pending||signupSucceeded||dialog.open)return;notify('signupStatus','');$('signupIntro').textContent=automatic?'아직 계정이 없으신가요? 가입을 완료하면 10초 후 자동 로그인합니다.':'계정을 만들고 10초 후 자동으로 로그인합니다.';dialog.showModal();$('signupId').focus()}
 $('openSignup').onclick=()=>openSignup();
 function closeSignup(){if(pending)return;clearInterval(countdown);countdown=null;$('signupPassword').value='';$('signupConfirm').value='';dialog.close()}
 $('closeSignup').onclick=closeSignup;
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeSignup()});
 $('loginForm').onsubmit=async e=>{
  e.preventDefault();if(pending)return;pending=true;lock(e.currentTarget,true);notify('loginStatus','로그인 중입니다…');
  try{await api('login',{username:$('loginId').value,password:$('loginPassword').value});$('loginPassword').value='';location.replace('/app/')}catch(error){notify('loginStatus',error.message,true)}finally{pending=false;lock($('loginForm'),false)}
 };
 $('signupForm').onsubmit=async e=>{
  e.preventDefault();if(pending)return;
  if($('signupPassword').value!==$('signupConfirm').value){notify('signupStatus','비밀번호 확인이 일치하지 않습니다.',true);$('signupConfirm').focus();return}
  pending=true;lock($('signupForm'),true);notify('signupStatus','계정을 등록하고 있습니다…');
  let password=$('signupPassword').value;
  try{
   const result=await api('register',{username:$('signupId').value,password});signupSucceeded=true;
   $('signupPassword').value='';$('signupConfirm').value='';$('loginId').value=result.username;
   $('signupForm').hidden=true;$('signupIntro').textContent='회원가입이 완료되었습니다.';
   const deadline=Date.now()+result.availableInSeconds*1000;
   const tick=async()=>{
    const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
    notify('signupStatus',`${seconds}초 후 새 ID로 자동 로그인합니다.`);
    if(seconds>0)return;clearInterval(countdown);countdown=null;
    try{await api('login',{username:result.username,password});location.replace('/app/')}
    catch(error){notify('loginStatus','가입은 완료되었습니다. '+error.message,true);dialog.close();pending=false;signupSucceeded=false;$('signupForm').hidden=false;lock($('signupForm'),false)}
    finally{password=''}
   };
   tick();countdown=setInterval(tick,250);
  }catch(error){password='';notify('signupStatus',error.message,true);pending=false;lock($('signupForm'),false)}
 };
 // Once per page visit, between 2 and 3 minutes; never interrupt active submission.
 setTimeout(()=>openSignup(true),120000+Math.floor(Math.random()*60001));
 fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.user)location.replace('/app/')}).catch(()=>{});
})();
