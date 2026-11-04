(()=>{'use strict';
 if(!/^https?:$/.test(location.protocol)||location.hostname==='127.0.0.1'||location.hostname==='localhost')return;
 fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(async response=>{
  if(response.status===401){location.replace('/login.html');return}
  if(!response.ok)return;const data=await response.json();if(!data.user)return;
  const box=document.createElement('div');box.className='account-actions';
  const user=document.createElement('span');user.textContent=data.user.username+' 님';
  const button=document.createElement('button');button.type='button';button.textContent='로그아웃';button.id='accountLogout';
  button.onclick=async()=>{button.disabled=true;try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',credentials:'same-origin'});if(!r.ok)throw Error();try{localStorage.clear();sessionStorage.clear()}catch{}location.replace('/login.html')}catch{button.disabled=false;button.textContent='다시 로그아웃'}};
  box.append(user,button);document.querySelector('.app-top')?.append(box);
 }).catch(()=>{});
})();
