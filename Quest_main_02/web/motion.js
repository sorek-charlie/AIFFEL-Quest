/* 다섯 업무 화면의 떠 있는 위젯과 스프링 모션.
   위젯 내용은 화면에 이미 있는 사실(형식·일정)만 사용한다. GSAP가 없거나
   움직임을 줄이면 위젯은 완성된 숫자로 정지 상태에서 보인다. */
(function(){
  const HERO={
    finance:{icon:'nav-finance',host:'#finance>.page-head',docs:[
      ['brief','간략보고서','PDF'],
      ['deep','심층보고서','8쪽 PDF'],
      ['comprehensive','종합보고서','PDF'],
      ['adjustment','세무조정계산서','분석보고서']]},
    meeting:{icon:'nav-meeting',host:'#writing>.page-head',chips:[
      ['✍️','ico-pink',null,'자필 · 스캔','OCR'],
      ['🎙️','ico-sky',null,'음성 · 영상','받아쓰기'],
      ['📝','ico-yellow',null,'통합 회의록','PDF']]},
    document:{icon:'nav-document',host:'#writing>.page-head',chips:[
      ['🎬','ico-yellow',null,'영상 · PDF','원문'],
      ['🔎','ico-sky',null,'검색 가능','PDF'],
      ['✨','ico-pink',null,'요약보고서','PDF']]},
    issue:{icon:'nav-issue',host:'#reports>.page-head',chips:[
      ['⏰','ico-mint','09:00','매일','브리핑'],
      ['🗞️','ico-yellow',6,'개 분야','AI · 경제 등'],
      ['✈️','ico-sky',null,'개인 텔레그램','발송']]},
    policy:{icon:'nav-policy',host:'#reports>.page-head',chips:[
      ['🌅','ico-lilac','08:30','매일','수집'],
      ['📬','ico-pink','09:00','월요일','주간 보고'],
      ['📍','ico-yellow',null,'전국 · 서울 · 경기','중소기업']]}
  };
  const root=document.documentElement;
  const reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const motionOn=()=>!reduceQuery.matches&&!!window.gsap;
  const floats=[];

  /* 재무 히어로의 보고서 그림(장식). 문서 종류와 형식만 표현하고 수치는 넣지 않는다. */
  const DOC_ART={
    brief:'<circle cx="48" cy="38" r="30" fill="#e3f0ff"/><path d="M30 8h28l10 10v46a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z" fill="#fff" stroke="#9cc4f0" stroke-width="1.5"/><path d="M58 8v8a2 2 0 0 0 2 2h8" fill="#d7eaff" stroke="#9cc4f0" stroke-width="1.5"/><rect x="32" y="16" width="18" height="4" rx="2" fill="#2563b8"/><rect x="32" y="24" width="28" height="2.5" rx="1.25" fill="#cfe0f5"/><rect x="34" y="44" width="6" height="12" rx="1.5" fill="#9ccaff"/><rect x="43" y="37" width="6" height="19" rx="1.5" fill="#5b9be6"/><rect x="52" y="31" width="6" height="25" rx="1.5" fill="#2563b8"/><rect x="18" y="50" width="22" height="13" rx="6.5" fill="#e5484d"/><text x="29" y="59.5" text-anchor="middle" font-size="8" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">PDF</text>',
    deep:'<circle cx="48" cy="38" r="30" fill="#ffe4ee"/><rect x="26" y="12" width="50" height="32" rx="5" fill="#ffd3e4"/><rect x="21" y="19" width="50" height="32" rx="5" fill="#ffb8d1"/><rect x="16" y="26" width="50" height="34" rx="5" fill="#fff" stroke="#f3a3c2" stroke-width="1.5"/><rect x="21" y="31" width="14" height="3.5" rx="1.75" fill="#c0306c"/><polyline points="22,53 31,46 39,49 48,39 59,42" fill="none" stroke="#c0306c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="48" cy="39" r="2.6" fill="#fff" stroke="#c0306c" stroke-width="1.8"/><circle cx="70" cy="58" r="11" fill="#c0306c"/><text x="70" y="61.5" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">8</text>',
    comprehensive:'<circle cx="48" cy="38" r="30" fill="#fff3cc"/><rect x="14" y="10" width="68" height="44" rx="6" fill="#fff" stroke="#f2cf6a" stroke-width="1.5"/><rect x="14" y="10" width="68" height="9" rx="6" fill="#ffd36b"/><rect x="14" y="15" width="68" height="4" fill="#ffd36b"/><circle cx="34" cy="37" r="10" fill="#ffe9a6"/><path d="M34 37V27a10 10 0 0 1 9.5 13z" fill="#e0a100"/><path d="M34 37l9.5 3A10 10 0 0 1 28 45z" fill="#8a5a00"/><rect x="52" y="27" width="22" height="3" rx="1.5" fill="#f2dc9a"/><rect x="52" y="34" width="18" height="3" rx="1.5" fill="#f2dc9a"/><rect x="52" y="41" width="14" height="3" rx="1.5" fill="#f2dc9a"/><path d="M48 54v8M40 66l8-4 8 4" stroke="#c9a24a" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
    adjustment:'<circle cx="48" cy="38" r="30" fill="#ece7ff"/><rect x="22" y="8" width="44" height="58" rx="5" fill="#fff" stroke="#b9a9ff" stroke-width="1.5"/><rect x="27" y="14" width="20" height="4" rx="2" fill="#5b44c9"/><g fill="#e9e4ff"><rect x="27" y="24" width="34" height="7" rx="2"/><rect x="27" y="34" width="34" height="7" rx="2"/><rect x="27" y="44" width="34" height="7" rx="2"/></g><text x="31" y="30" font-size="7" font-weight="800" fill="#137a4f" font-family="system-ui,sans-serif">+</text><text x="31" y="40" font-size="7" font-weight="800" fill="#c0306c" font-family="system-ui,sans-serif">−</text><text x="31" y="50" font-size="7" font-weight="800" fill="#137a4f" font-family="system-ui,sans-serif">+</text><rect x="27" y="55" width="34" height="7" rx="2" fill="#5b44c9"/><text x="31" y="61" font-size="7" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">=</text><rect x="56" y="40" width="22" height="26" rx="5" fill="#7c66e0"/><rect x="59" y="43" width="16" height="6" rx="1.5" fill="#e2dbff"/><g fill="#fff"><circle cx="62" cy="54" r="1.8"/><circle cx="67" cy="54" r="1.8"/><circle cx="72" cy="54" r="1.8"/><circle cx="62" cy="60" r="1.8"/><circle cx="67" cy="60" r="1.8"/><circle cx="72" cy="60" r="1.8"/></g>'
  };
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
  function buildArt(view){
    const cfg=HERO[view];if(!cfg)return null;const host=document.querySelector(cfg.host);if(!host)return null;
    host.querySelector('.hero-art')?.remove();
    const art=el('div','hero-art');art.setAttribute('aria-hidden','true');const artBox=art;
    if(cfg.docs){cfg.docs.forEach(([key,label,sub],i)=>{
      const card=el('div','float doc-card doc-'+key+' d'+(i+1));
      const art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.setAttribute('viewBox','0 0 96 72');art.setAttribute('class','doc-art');art.innerHTML=DOC_ART[key];
      card.append(art,el('b',null,label),el('small',null,sub));artBox.append(card)});
      ['float spark s1','float spark s2'].forEach(c=>artBox.append(el('span',c)));host.append(artBox);return artBox}
    const orb=el('div','float orb');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');
    const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#'+cfg.icon);svg.append(use);orb.append(svg);art.append(orb);
    cfg.chips.forEach(([emoji,ico,num,label,sub],i)=>{
      const chip=el('div','float chip c'+(i+1));chip.append(el('span','chip-ico '+ico,emoji));
      const txt=el('span');
      if(num!=null){const line=el('b');const n=el('span','num',String(num));if(typeof num==='number')n.dataset.count=num;line.append(n,el('span','unit',label));txt.append(line,document.createTextNode(sub))}
      else{txt.append(el('b',null,label),document.createTextNode(sub))}
      chip.append(txt);art.append(chip)});
    ['float spark s1','float spark s2','float dotty'].forEach(c=>art.append(el('span',c)));
    host.append(art);return art;
  }
  function killFloats(){while(floats.length)floats.pop().kill()}
  function animate(view){
    const cfg=HERO[view];const host=cfg&&document.querySelector(cfg.host);const art=host&&host.querySelector('.hero-art');
    killFloats();if(!art||!motionOn())return;
    const g=window.gsap,wide=innerWidth>1000;
    g.from(host.querySelectorAll('h1,h1+p'),{y:26,opacity:0,duration:.7,ease:'back.out(1.8)',stagger:.08,clearProps:'transform,opacity'});
    const items=art.querySelectorAll('.float');
    g.from(items,{y:46,scale:.55,opacity:0,rotation:()=>g.utils.random(-14,14),duration:1.1,ease:'elastic.out(1,.55)',stagger:.09,delay:.1});
    art.querySelectorAll('.num[data-count]').forEach(n=>{const end=+n.dataset.count,o={v:0};n.textContent='0';floats.push(g.to(o,{v:end,duration:1.2,delay:.35,ease:'power2.out',onUpdate:()=>{n.textContent=Math.round(o.v)},onComplete:()=>{n.textContent=String(end)},onInterrupt:()=>{n.textContent=String(end)}}))});
    if(wide)items.forEach((item,i)=>{floats.push(g.to(item,{y:i%2?6:-6,rotation:'+='+(i%2?2:-2),duration:2.4+i*.35,ease:'sine.inOut',yoyo:true,repeat:-1,delay:1.2+i*.15}))});
    const view$=document.querySelector('.view:not([hidden])');
    if(view$){const panels=view$.querySelectorAll('.type-card,.panel,.report-policy-note');
      g.from(panels,{y:36,opacity:0,scale:.98,duration:.8,ease:'back.out(1.6)',stagger:.07,delay:.15,clearProps:'transform,opacity'})}
    if(window.ScrollTrigger&&view$){window.ScrollTrigger.getAll().forEach(t=>t.kill());
      view$.querySelectorAll('.report-pages,.report-policy-note').forEach(t=>{if(t.getBoundingClientRect().top>innerHeight)g.from(t,{y:60,opacity:0,rotation:-1,duration:.9,ease:'back.out(1.5)',clearProps:'transform,opacity',scrollTrigger:{trigger:t,start:'top 92%',once:true}})});
      window.ScrollTrigger.refresh()}
  }
  /* 떠 있는 위젯·카드에 손을 대면 통통 기울어지는 스프링 */
  function bindSpring(){
    document.addEventListener('pointerover',e=>{if(!motionOn())return;const t=e.target.closest('.hero-art .float, .demo-action');if(!t||t.contains(e.relatedTarget))return;
      window.gsap.to(t,{scale:1.08,rotation:'+='+(Math.random()>.5?4:-4),duration:.6,ease:'elastic.out(1.1,.4)',overwrite:'auto'})});
    document.addEventListener('pointerout',e=>{if(!motionOn())return;const t=e.target.closest('.hero-art .float, .demo-action');if(!t||t.contains(e.relatedTarget))return;
      window.gsap.to(t,{scale:1,duration:.7,ease:'elastic.out(1,.35)',overwrite:'auto'})});
  }
  function stopAll(){killFloats();if(window.gsap){document.querySelectorAll('.hero-art .float').forEach(f=>window.gsap.set(f,{clearProps:'all'}));document.querySelectorAll('.num[data-count]').forEach(n=>n.textContent=n.dataset.count)}}
  function render(view){const art=buildArt(view);if(art)animate(view)}

  window.addEventListener('viewchange',e=>{render(e.detail);revealNav()});
  /* 모바일 가로 메뉴: 선택한 메뉴를 보이게, 끝에 닿으면 흐림 해제 */
  const nav=document.querySelector('.sidebar nav');
  function navEdge(){if(nav)nav.classList.toggle('at-end',nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-4)}
  function revealNav(){if(!nav||nav.scrollWidth<=nav.clientWidth)return;const a=nav.querySelector('.nav-item.active');if(a)nav.scrollTo({left:Math.max(0,a.offsetLeft-nav.offsetLeft-16),behavior:motionOn()?'smooth':'auto'});setTimeout(navEdge,400)}
  nav?.addEventListener('scroll',navEdge,{passive:true});revealNav();
  function updateMotionPreference(){
    root.classList.toggle('motion-off',reduceQuery.matches);
    if(reduceQuery.matches)stopAll();
    else render(document.body.dataset.view||'finance');
  }
  reduceQuery.addEventListener?.('change',updateMotionPreference);
  if(window.gsap&&window.ScrollTrigger)window.gsap.registerPlugin(window.ScrollTrigger);
  root.classList.toggle('motion-off',reduceQuery.matches);bindSpring();
  /* 둥근 제목 글꼴을 실제로 받았을 때만 표시(오프라인이면 시스템 굵은 글꼴) */
  try{document.fonts.load('400 1em Jua').then(f=>{if(f.length)root.classList.add('jua')}).catch(()=>{})}catch(e){}
  render(document.body.dataset.view||'finance');

  /* 데모 결과 페이지 확대 보기: 클릭(또는 페이지 선택 후 Enter)으로 크게 보고, 화살표로 넘기고, Esc로 닫는다 */
  const box=document.createElement('dialog');box.className='zoom-dialog';box.setAttribute('aria-label','데모 결과 크게 보기');
  box.innerHTML='<div class="zoom-bar"><span class="zoom-count" aria-live="polite"></span><button type="button" class="zoom-prev" aria-label="이전 쪽">‹</button><button type="button" class="zoom-next" aria-label="다음 쪽">›</button><button type="button" class="zoom-close">닫기</button></div><div class="zoom-body"><img alt=""></div>';
  document.body.append(box);
  let list=[],idx=0;const zimg=box.querySelector('img');
  function show(i){idx=Math.max(0,Math.min(list.length-1,i));const im=list[idx];zimg.src=im.currentSrc||im.src;zimg.alt=im.alt;box.querySelector('.zoom-count').textContent=(idx+1)+' / '+list.length;box.querySelector('.zoom-prev').disabled=idx===0;box.querySelector('.zoom-next').disabled=idx===list.length-1;box.querySelector('.zoom-body').scrollTop=0}
  function open(img){list=[...img.closest('.page-stack').querySelectorAll('img')];show(list.indexOf(img));if(!box.open){box.showModal();box.querySelector('.zoom-close').focus()}}
  document.addEventListener('click',e=>{const img=e.target.closest('.page-stack img');if(img)open(img)});
  document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const st=e.target.closest&&e.target.closest('.page-stack');if(!st)return;const imgs=[...st.querySelectorAll('img')];if(!imgs.length)return;const top=st.getBoundingClientRect().top;const vis=imgs.find(i=>i.getBoundingClientRect().bottom>top+20)||imgs[0];e.preventDefault();open(vis)});
  box.querySelector('.zoom-close').addEventListener('click',()=>box.close());
  box.querySelector('.zoom-prev').addEventListener('click',()=>show(idx-1));
  box.querySelector('.zoom-next').addEventListener('click',()=>show(idx+1));
  box.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(idx-1);if(e.key==='ArrowRight')show(idx+1)});
  box.addEventListener('click',e=>{if(e.target===box)box.close()});
})();
