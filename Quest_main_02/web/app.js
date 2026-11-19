let financeRevision=0;
let financeFilenames={}, writingFilename='';
let activeView="finance";
const SAMPLE_SETS={brief:[['demo-html/finance-brief','데모 결과 · 간략보고서_(주)대한민국']],deep:[['demo-html/finance-deep','데모 결과 · 심층보고서_(주)대한민국']],comprehensive:[['demo-html/finance-comprehensive','데모 결과 · 종합보고서_(주)대한민국']],adjustment:[['demo-html/finance-adjustment','데모 결과 · 세무조정계산서_(주)대한민국']],meeting:[[['demo/meeting-document','demo/meeting-summary'],'회의록 결과 · 문서화 + 요약보고 (참석자 가명)']],document:[['demo/document-summary','문서요약 결과 · 정리노트']],issue:[['demo/daily-news','데모 결과 · Daily News']],policy:[['demo-html/policy','데모 결과 · 정부정책 주간보고']]};
function pageStack(keys,label){const box=document.createElement('div');box.className='page-stack';box.tabIndex=0;box.setAttribute('role','region');box.setAttribute('aria-label',label+' 전체 페이지');const all=[].concat(keys).flatMap(k=>(window.PREVIEW_PAGES||{})[k]||[]);if(!all.length){box.textContent='미리보기 이미지를 불러오지 못했습니다.';return box}all.forEach((src,i)=>{const img=document.createElement('img');img.src=src;img.loading=i<2?'eager':'lazy';img.decoding='async';img.alt=`${label} ${i+1}/${all.length}쪽`;box.append(img)});return box}
function renderPairs(id,setKey){const holder=document.getElementById(id);if(!holder||holder.dataset.set===setKey)return;holder.dataset.set=setKey;holder.replaceChildren();for(const [keys,label] of SAMPLE_SETS[setKey]){const fig=document.createElement('figure'),cap=document.createElement('figcaption');cap.textContent=label;fig.append(cap,pageStack(keys,label));holder.append(fig)}}
let selectedFinance='brief', financePreviews={}, previewIndex=0, financeBusy=false, financeFiles={};
const financeUrls={};
function financePdfUrl(key){if(!financeUrls[key]){const bytes=Uint8Array.from(atob(financeFiles[key+'.pdf']),c=>c.charCodeAt(0));financeUrls[key]=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}))}return financeUrls[key]}
function updateFinanceSave(){const b=document.getElementById('finance-save');if(!b)return;try{b.disabled=!financeFiles[selectedFinance+'.pdf']}catch(e){b.disabled=true}}
function renderFinancePreview(){updateFinanceSave();
  const made=!!financeFiles[selectedFinance+'.pdf'], pages=made?[1]:[], content=document.getElementById('finance-preview-content');
  const labels={brief:'간략보고서',deep:'심층보고서',comprehensive:'종합보고서',adjustment:'세무조정계산서'};const label=labels[selectedFinance];
  
  document.getElementById('preview-tag').textContent=label;
  document.getElementById('preview-sub').textContent=pages.length?'생성한 보고서 전체 · 스크롤해 확인':'데모 결과 전체 · 스크롤해 확인';
  document.getElementById('report-heading').textContent=pages.length?label:SAMPLE_SETS[selectedFinance][0][1].replace('데모 결과 · ','');
  document.getElementById('report-intro').textContent=pages.length?'생성 결과 · 원문 확인 필요':'데모 결과입니다.';
  renderPairs('finance-samples',selectedFinance);content.replaceChildren();if(financeFiles[selectedFinance+'.pdf']){const f=document.createElement('iframe');f.className='finance-result-pdf';f.title=label+' 생성 결과';f.src=financePdfUrl(selectedFinance)+'#view=FitH&navpanes=0';content.append(f)}else{const hk='demo-html/finance-'+selectedFinance,has=!!(window.PREVIEW_PAGES||{})[hk];content.append(pageStack(has?hk:'demo/finance-'+selectedFinance,label+' 데모 결과'))}
  document.getElementById('preview-page').textContent=pages.length?`${pages.length}쪽`:'양식';
  document.getElementById('preview-prev').disabled=!pages.length||previewIndex===0;
  document.getElementById('preview-next').disabled=!pages.length||previewIndex===pages.length-1;
}
/* 간략·심층·종합·세무조정 보고서마다 '필요한 자료'(기업명·첨부·요청사항)와 결과·진행률을 따로 기억한다 */
const financeByType={};
function saveFinanceForm(k){try{financeByType[k]={company:byId('finance-company').value,request:byId('finance-request').value,files:[...(pickedFiles['finance-zip']||[])],result:financeFiles,payload:financePayload,ok:financeReviewOK,pct:byId('finance-progress').value,stage:byId('finance-progress-stage').textContent,status:byId('finance-generate-status').textContent}}catch(e){}}
function loadFinanceForm(k){try{const st=financeByType[k]||{};byId('finance-company').value=st.company||'';byId('finance-request').value=st.request||'';setPicked('finance-zip',st.files||[]);if(!(st.files||[]).length)byId('finance-zip').value='';showAttachments('finance-zip','finance-attachments');
 for(const u in financeUrls){URL.revokeObjectURL(financeUrls[u]);delete financeUrls[u]}financeFiles=st.result||{};financePayload=st.payload||null;financeReviewOK=!!st.ok;setFinanceProgress(st.pct||0,st.stage||'분석 대기 중');byId('finance-generate-status').textContent=st.status||''}catch(e){}}
function selectType(key){if(financeBusy)return;saveFinanceForm(selectedFinance);selectedFinance=key;loadFinanceForm(key);previewIndex=0;document.querySelectorAll('.type-card').forEach(el=>{const on=el.dataset.type===key;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on))});renderFinancePreview()}
const views={meeting:['회의록정리','자필, 스캔문서, 음성, 영상 회의록 정리','음성·메모 입력 → 전사 → 안건과 결정 정리 → 담당자·기한 검토'],document:['요약보고서','자필, 스캔문서, 음성, 영상 회의록 정리','PDF 입력 → 텍스트 추출·OCR → 항목별 요약 → 원문 대조'],issue:['이슈 브리핑','AI·경제·정치·사회·기술·주식을 매일 오전 9시에 확인합니다.','자료 수집 → 출처 확인 → 로컬 모델 요약 → 텔레그램 전달'],policy:['정부정책(중소기업)','전국 · 서울 · 경기 중소기업 지원사업','공고 수집 → 지역·대상 확인 → 로컬 모델 요약 → 텔레그램 전달'],evaluation:['효과 검증','수작업과 AI 작업의 시간과 정확도를 비교합니다.','기준선 기록 → 동일 자료로 실행 → 결과 대조 → 실패 사례 기록'],settings:['연결 설정','로컬 모델·유료 모델·텔레그램의 연결 상태를 관리합니다.','모델 및 채널 설정 → 연결 검증 → 전송할 내용 확인']};
const reportData={policy:{title:'정부정책(중소기업)',desc:'전국 · 서울 · 경기 중소기업 지원사업',fields:[['발송 일정','매주 월요일 09:00 · 한국 시간'],['자료 수집','매일 08:30'],['대상 및 지역','중소기업 · 서울·경기 중심'],['AI 처리','로컬 LLM 기본'],['발송 채널','개인 봇 · 연결 설정 확인'],['출처 · 발송 조건','기업마당 · K-Startup · 판판대로 · 정부24']],process:'공고 수집 → 중복 확인 → 대상·마감·금액·링크 원문 대조 → 요약 → 발송'},issue:{title:'이슈 브리핑',desc:'AI·경제·정치·사회·기술·주식을 매일 오전 9시에 확인',fields:[['발송 일정','매일 09:00 · 한국 시간'],['분야','AI · 경제 · 정치 · 사회 · 기술 · 주식'],['AI 처리','로컬 LLM 기본'],['발송 채널','개인 봇 · 연결 설정 확인'],['출처 · 기준','Bing News RSS · 최근 기사 제목']],process:'기사 수집 → 중복·시간 확인 → 출처 대조 → 분야별 요약 → 발송'}};
function showReport(key){renderHtmlOutput('report-html-output',key,reportData[key].title);loadFinalTelegram(key);renderPairs('report-samples',key);const d=reportData[key];document.getElementById('policy-tools').hidden=true;setupCommand(key);byId('telegram-schedule').textContent=key==='issue'?'매일 09:00 · 한국시간':'월요일 09:00 · 서울·경기 중심';document.getElementById('policy-snapshot').hidden=key!=='policy';document.getElementById('policy-upload').hidden=key!=='policy';document.getElementById('reports-title').textContent=d.title;document.getElementById('reports-desc').textContent=d.desc;document.getElementById('reports').classList.add('title-inline');byId('report-flow').hidden=true;byId('report-settings-tip').hidden=true;document.getElementById('report-process').textContent='수집 → 로컬 LLM → 저장·발송';let info=document.getElementById('report-info');info.replaceChildren();(key==='policy'?[['수집·보고','매일 08:30 · 월 09:00'],['대상','전국·서울·경기 중소기업'],['모델','로컬 LLM · Qwen3.5-4B\n(Q4_K_M, llama-server)'],['채널','개인 텔레그램']]:[['수집·보고','매일 09:00'],['분야','AI·경제·정치·사회·기술·주식'],['모델','로컬 LLM · Qwen3.5-4B\n(Q4_K_M, llama-server)'],['채널','개인 텔레그램']]).forEach(([label,value])=>{let row=document.createElement('div');row.className='report-info-row';let dt=document.createElement('span');dt.textContent=label;let dd=document.createElement('strong');dd.textContent=value;row.append(dt,dd);info.append(row)});refreshReportMonitor();}
/* 오른쪽 위: 실제 텔레그램으로 마지막에 보낸 PDF 첨부(가상 시연 제외). 기록이 없으면 데모 결과를 그대로 둔다. */
let finalMessage=null;
let telegramRecordRevision=0;
let telegramMonitorSignature='';

function showSentArticleLinks(holder, sent) {
 const entries=[];
 const lines=sent.split(/\r?\n/).map(line=>line.trim());
 for(const [index,line] of lines.entries()){
  if(!/^https?:\/\/\S+$/i.test(line))continue;
  let previous=index-1;
  while(previous>=0&&/^(?:출처|소관|마감일)(?:\s|[:：])/.test(lines[previous]))previous--;
  const title=lines[previous];
  if(!title||/^https?:\/\//i.test(title))continue;
  const item=document.createElement('li');
  const link=document.createElement('a');
  link.href=line;link.target='_blank';link.rel='noopener noreferrer';link.className='sent-link-title';link.textContent=title;link.title=title+' · 원문 열기';
  item.append(link);entries.push(item);
 }
 if(!entries.length){holder.textContent=sent;return;}
 const list=document.createElement('ul');
 list.className='telegram-sent-links';
 list.append(...entries);
 holder.replaceChildren(list);
}

async function loadFinalTelegram(key){
 const revision=++telegramRecordRevision;
 const current=()=>activeView===key&&revision===telegramRecordRevision;
 const title=byId('report-html-title'),time=byId('report-html-time'),holder=byId('report-html-output');
 title.textContent='데모 결과';time.textContent='';finalMessage=null;byId('download-briefing').disabled=true;byId('demo-briefing-delivery').textContent='';
 const record=byId('telegram-delivery-record'),body=byId('telegram-sent-body');
 body.textContent='';
 record.textContent='발송 기록 확인 중';
 if(location.protocol==='file:'){record.textContent='작업실 서버에서 발송 기록을 확인할 수 있습니다.';return}
 try{
  const r=await fetch('/api/communication-log',{cache:'no-store'});if(!r.ok)throw Error();
  const d=await r.json();if(!current())return;
  const group=key==='issue'?'Daily News':'정부정책';
  const all=d.groups?.[group]||[];
  const msg=all.find(i=>i.group===group&&!i.demo&&i.status==='전송 확인'&&i.kind==='text'&&i.exact&&/^\/api\/communication-item\?id=\w+$/.test(i.link));
  const latest=all.find(i=>i.group===group&&!i.demo&&i.status==='전송 확인');
  record.textContent=msg?'문자 발송 · '+monitorTimestamp(msg.time)+' KST'
   :latest?'저장된 발송문자 본문이 없습니다.':'발송 기록 없음';
  body.textContent=msg?'문자 본문 불러오는 중':latest?.kind==='file'?'첨부 발송 내역은 최종 첨부에서 확인할 수 있습니다.':'';
  if(msg){
   try{
    const response=await fetch(msg.link,{cache:'no-store'});if(!response.ok)throw Error();
    const sent=await response.text();if(!current())return;
    showSentArticleLinks(body,sent);
   }catch(e){if(current())body.textContent='발송문자 본문을 불러오지 못했습니다.';}
   if(!current())return;
   finalMessage={key,link:msg.link,name:(key==='issue'?'DailyNews':'정부정책')+'_발송문자_'+String(msg.time).slice(0,16).replace(/[-:T]/g,'')+'.txt'};byId('download-briefing').disabled=false;byId('download-briefing').title=msg.title+' · '+String(msg.time).slice(0,16).replace('T',' ')}
  const item=all
   .filter(i=>i.group===group&&!i.demo&&i.status==='전송 확인'&&i.kind==='file'&&/PDF/i.test(i.title)&&/^\/api\/communication-item\?id=\w+$/.test(i.link))
   .sort((a,b)=>String(b.time).localeCompare(String(a.time)))[0];
  if(!item)return;
  const t=String(item.time);
  title.textContent='텔레그램_발송 첨부(최종)';
  time.textContent=t.slice(0,10).replaceAll('-','.')+' '+t.slice(11,16);
  time.title=item.title+' · '+item.status;
  const original=document.createElement('a');
  original.className='telegram-original';
  original.href=item.link;original.target='_blank';original.rel='noopener';
  original.textContent='발송 원본 PDF 열기';
  const loading=document.createElement('p');
  loading.textContent='첨부 페이지 불러오는 중';
  holder.replaceChildren(original,loading);
  try{
   const response=await fetch(item.link+'&preview=info',{cache:'no-store'});
   if(!response.ok)throw Error();
   const {pages}=await response.json();
   if(!Number.isInteger(pages)||pages<1||pages>250)throw Error();
   if(!current())return;
   const stack=document.createElement('div');
   stack.className='page-stack telegram-final-pages';stack.tabIndex=0;
   stack.setAttribute('role','region');stack.setAttribute('aria-label','최종 발송 첨부 전체 페이지');
   for(let number=1;number<=pages;number++){
    const page=document.createElement('img');
    page.loading=number===1?'eager':'lazy';
    page.alt=`최종 발송 첨부 ${number}/${pages}쪽`;
    page.src=item.link+'&preview='+number;
    stack.append(page);
   }
   loading.replaceWith(stack);
  }catch(e){if(current())loading.textContent='미리보기를 불러오지 못했습니다. 발송 원본 PDF를 열어 주세요.';}
 }catch(e){if(current())record.textContent='발송 기록을 불러오지 못했습니다.'}
}
/* 텔레그램 명령 내리기: 텔레그램 봇에 문자를 보낸 것과 같은 명령(/api/command → app/commands.py) */
const COMMAND_EXAMPLE={issue:'지금 이 시각 기준으로 이슈브리핑 해줘',policy:'지금 이 시각 기준으로 정부정책 정리해 줘'};
let commandPoll=null;
function setupCommand(key){const t=byId('command-text');t.value='';t.placeholder=COMMAND_EXAMPLE[key]||'';byId('command-status').textContent=''}
function bindCommand(){
 const t=byId('command-text'),send=byId('command-send'),status=byId('command-status');
 t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'&&!t.value){e.preventDefault();t.value=t.placeholder;t.setSelectionRange(t.value.length,t.value.length)}
  else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send.click()}});
 send.addEventListener('click',async()=>{
  const text=t.value.trim();if(!text){status.textContent='명령을 입력하거나 → 키로 예시 문장을 넣어 주세요.';t.focus();return}
  if(location.protocol==='file:'){status.textContent='명령 실행은 실행 파일로 연 화면에서 사용할 수 있습니다.';return}
  send.disabled=true;status.textContent='명령을 보내는 중입니다.';
  try{const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});const d=await r.json().catch(()=>({}));if(r.status===404)throw Error('지금 켜진 서버에 명령 기능이 아직 없습니다. 서버를 껐다가 다시 켜 주세요.');if(!r.ok)throw Error(d.error||'명령을 실행하지 못했습니다.');
   status.textContent=d.message;t.value='';
   if(d.kind&&d.kind!==activeView)status.textContent+=' (다른 보고 명령입니다. 해당 화면의 작업 현황에서 확인하세요.)';
   clearInterval(commandPoll);let n=0;refreshReportMonitor();commandPoll=setInterval(()=>{refreshReportMonitor();if(++n>200)clearInterval(commandPoll)},3000)}
  catch(e){status.textContent=e.message}finally{send.disabled=false}});
}
function monitorTimestamp(value){if(!value)return '시간 미확인';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})}
async function refreshReportMonitor(){
 const kind=activeView;if(!['issue','policy'].includes(kind))return;
 const model=document.getElementById('monitor-model-status'),jobs=document.getElementById('monitor-jobs'),events=document.getElementById('monitor-events'),stamp=document.getElementById('monitor-time');
 try{const response=await fetch('/api/report-monitor?kind='+kind,{cache:'no-store'});if(!response.ok)throw new Error('unavailable');const data=await response.json();if(activeView!==kind)return;
  model.textContent=data.model_running?'서버 연결됨':'대기 · 꺼짐';jobs.replaceChildren();
  if(!data.jobs.length){jobs.textContent='기록된 작업 단계가 없습니다. 다음 예약 실행부터 진행률이 표시됩니다.'}
  for(const job of data.jobs){const item=document.createElement('div');item.className='monitor-job';const title=document.createElement('strong');title.textContent=job.task==='policy-collection'?'정책 수집':job.task==='policy-report'?'주간 보고':job.task==='issue-collection'?'뉴스 수집':'뉴스 보고';const phase=document.createElement('span');phase.className='monitor-stage';phase.textContent=job.status==='complete'&&job.updated_at?'보고완료('+monitorTimestamp(job.updated_at)+')':(job.stage||'상태 확인 필요');const top=document.createElement('div');top.className='monitor-job-top';top.append(title,phase);item.append(top);if(typeof job.percent==='number'){const track=document.createElement('div');track.className='dog-track monitor-dog'+(job.status==='running'?' running':'');track.style.setProperty('--p',job.percent);const bar=document.createElement('progress');bar.max=100;bar.value=job.percent;bar.setAttribute('aria-label',title.textContent+' 진행률');const dog=byId('finance-dog-track').querySelector('.run-dog').cloneNode(true);track.append(bar,dog);const pct=document.createElement('span');pct.className='monitor-percent';pct.textContent=job.percent+'%';const row=document.createElement('div');row.className='monitor-progress-row';row.append(track,pct);item.append(row)}else{const unknown=document.createElement('span');unknown.className='monitor-percent';unknown.textContent='진행률 미확인';item.append(unknown)}if(job.status!=='complete'&&job.updated_at){const when=document.createElement('small');when.textContent=monitorTimestamp(job.updated_at)+(job.status==='unknown'?' · 이전 기록':'');item.append(when)}jobs.append(item)}
  events.replaceChildren();if(!data.telegram.length){events.textContent='기록된 발송 내역이 없습니다.'}for(const e of [...data.telegram].reverse()){const row=document.createElement('div');row.className='monitor-event';const a=document.createElement('strong'),b=document.createElement('span');a.textContent=e.event+' · '+(e.status==='sent'?'전송 확인':e.status==='unknown'?'결과 확인 필요':e.status);b.textContent=monitorTimestamp(e.time);row.append(a,b);events.append(row)}
  {const box=events.closest('.monitor-telegram');if(box)box.scrollTop=0}
  stamp.textContent='조회 '+monitorTimestamp(data.checked_at);
  const signature=JSON.stringify([kind,data.telegram.map(({time,event,status})=>[time,event,status])]);
  if(telegramMonitorSignature && telegramMonitorSignature!==signature &&
      JSON.parse(telegramMonitorSignature)[0]===kind)loadFinalTelegram(kind);
  telegramMonitorSignature=signature;
 }catch(e){if(activeView!==kind)return;model.textContent='확인 불가';jobs.textContent='작업 기록을 읽지 못했습니다. 실행 파일로 다시 열어 주세요.';events.textContent='발송 기록을 확인할 수 없습니다.';stamp.textContent=''}
}
setInterval(()=>{if(!document.hidden)refreshReportMonitor()},10000);
function renderHtmlOutput(id,key,label){const holder=document.getElementById(id);if(!holder)return;holder.replaceChildren();const P=window.PREVIEW_PAGES||{},html='demo-html/'+key,best=P[html]?html:[].concat((SAMPLE_SETS[key]||[[null]])[0][0]).filter(x=>x&&P[x]);if(best&&best.length){holder.append(pageStack(best,label+' 데모 결과'))}else{const p=document.createElement('p');p.className='html-output-empty';p.textContent='데모자료 폴더에 이 업무의 HTML이 아직 없습니다. HTML을 넣고 scripts/render_demo_html.py를 실행하면 여기에 표시됩니다.';holder.append(p)}}
const DEMO_VERSIONS={meeting:[['demo/meeting-document','원본문서화'],['demo/meeting-summary','회의록정리']],document:[['demo/document-summary','요약보고서']]};
let demoVersion=0;
function writingName(view){return views[view][0]}
function showDemoVersion(view,i){const list=DEMO_VERSIONS[view]||[];if(!list.length)return;demoVersion=Math.max(0,Math.min(i,list.length-1));const [key,what]=list[demoVersion],name=writingName(view)+' 데모버전_'+String(demoVersion+1).padStart(2,'0');
 const holder=byId('writing-html-output');holder.replaceChildren();holder.append((window.PREVIEW_PAGES||{})[key]?pageStack(key,name):Object.assign(document.createElement('p'),{className:'html-output-empty',textContent:'데모 화면 이미지를 찾을 수 없습니다.'}));
 byId('writing-html-title').textContent=name+' · '+what;byId('writing-result-sub').textContent=name;
 byId('writing-demo-versions').querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-pressed',String(j===demoVersion)))}
function showWritingDemo(view){byId('writing-html-block').hidden=false;byId('writing-mode').textContent='데모';showDemoVersion(view,demoVersion)}
function renderWritingDemo(view){byId('writing-result-title').textContent=writingName(view)+' 결과';demoVersion=0;
 const vbox=byId('writing-demo-versions');vbox.replaceChildren();(DEMO_VERSIONS[view]||[]).forEach(([,what],i)=>{const b=document.createElement('button');b.type='button';b.className='demo-version';b.textContent='데모버전_'+String(i+1).padStart(2,'0');b.title=what;b.addEventListener('click',()=>showDemoVersion(view,i));vbox.append(b)});vbox.hidden=!(DEMO_VERSIONS[view]||[]).length;byId('real-writing').textContent=view==='meeting'?'회의록정리':'요약보고서';
 showWritingDemo(view);
}
function sourceTitle(){const files=[...(byId('media-file').files||[])].map(f=>f.name.replace(/\.[^.]+$/,''));if(!files.length)return '직접 입력 원문';return files[0]+(files.length>1?' 외 '+(files.length-1)+'건':'')}
function openView(view){
 const isFinance=view==='finance',isReport=view==='policy'||view==='issue',isWriting=view==='meeting'||view==='document',isSettings=view==='settings',isEval=view==='evaluation';
 document.querySelectorAll('.nav-item[data-view]').forEach(el=>{const on=el.dataset.view===view;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
 activeView=view;document.body.dataset.view=view;for(const [id,show] of Object.entries({finance:isFinance,reports:isReport,writing:isWriting,settings:isSettings,evaluation:isEval,other:!(isFinance||isReport||isWriting||isSettings||isEval)}))document.getElementById(id).hidden=!show;
 document.getElementById('breadcrumb').textContent=isFinance?'재무분석':views[view][0];
 if(isFinance)renderFinancePreview();else if(isReport)showReport(view);else if(isWriting){renderWritingDemo(view);document.getElementById('writing-title').textContent=views[view][0];document.getElementById('writing-desc').textContent=views[view][1];resetWriting()}
 else if(isSettings)refreshConfig();else if(!(isFinance||isEval)){['other-title','other-desc','other-flow'].forEach((id,i)=>document.getElementById(id).textContent=views[view][i])}
 document.title=`업무 작업실 | ${isFinance?'재무분석':views[view][0]}`;window.dispatchEvent(new CustomEvent('viewchange',{detail:view}));
}
document.querySelectorAll('.type-card').forEach(el=>el.addEventListener('click',()=>selectType(el.dataset.type)));document.querySelectorAll('.nav-item[data-view]').forEach(el=>el.addEventListener('click',()=>openView(el.dataset.view)));document.getElementById('back').addEventListener('click',()=>openView('finance'));selectType('brief');const requestedView=new URLSearchParams(location.search).get('view');
const byId=id=>document.getElementById(id);
function deliveryText(d){return d?`PC 저장 · 텔레그램 ${d.status} (${d.sent}/${d.total})`:'';}
async function saveDemo(kind,text,statusId){const status=byId(statusId);if(location.protocol==='file:'){status.textContent='자동 저장·텔레그램 전송은 실행 파일로 연 화면에서 사용할 수 있습니다.';return}status.textContent='가상 결과를 PC에 저장하고 텔레그램으로 보내는 중입니다.';try{const r=await fetch('/api/demo-output',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,text})});const result=await r.json();if(!r.ok)throw new Error(result.error);status.textContent='가상 결과 · '+deliveryText(result.delivery)}catch(e){status.textContent='가상 결과 저장 또는 전송 상태를 확인해 주세요.'}}
let writingResult='', writingPdf='', writingIncomplete=false, financeResult='';
let writingBusy=false, writingRevision=0, writingSourceExtracted=false;
const writingTrack=byId('writing-dog-track');
writingTrack.append(byId('finance-dog-track').querySelector('.run-dog').cloneNode(true));

function setWritingProgress(percent, stage, {running=false, done=false}={}) {
  byId('writing-progress-panel').hidden=false;
  byId('writing-progress').value=percent;
  byId('writing-progress-value').textContent=`${percent}%`;
  byId('writing-progress-stage').textContent=stage;
  writingTrack.style.setProperty('--p',percent);
  writingTrack.classList.toggle('running',running);
  writingTrack.classList.toggle('done',done);
}

function clearWritingProgress() {
  writingRevision++;
  writingTrack.classList.remove('running','done');
  writingTrack.style.setProperty('--p',0);
  byId('writing-progress').value=0;
  byId('writing-progress-value').textContent='0%';
  byId('writing-progress-stage').textContent='대기 중';
}
function invalidateWriting(){clearWritingProgress();writingResult='';writingPdf='';writingFilename='';byId('writing-output').textContent='입력 자료가 바뀌었습니다. 다시 분석해 주세요.';showWritingDemo(activeView);byId('writing-mode').textContent='재분석 필요';byId('download-writing').disabled=true;}
byId('source-text').addEventListener('input',invalidateWriting);
for(const [id,step] of [['source-up',-3],['source-down',3]])byId(id).addEventListener('click',()=>{const t=byId('source-text');t.rows=Math.max(3,Math.min(30,t.rows+step));byId('source-up').disabled=t.rows<=3});byId('source-up').disabled=true;
byId('media-file').addEventListener('change',()=>{showAttachments('media-file','writing-attachments');if(writingSourceExtracted)byId('source-text').value='';writingSourceExtracted=false;invalidateWriting();writingIncomplete=false;searchableOutputs=[];renderSearchable()});
function resetWriting(){clearWritingProgress();writingSourceExtracted=false;writingResult='';writingPdf='';writingFilename='';writingIncomplete=false;searchableOutputs=[];renderSearchable();byId('source-text').value='';byId('media-file').value='';showAttachments('media-file','writing-attachments');byId('writing-output').textContent='';showWritingDemo(activeView);byId('download-writing').disabled=true;byId('writing-status').textContent='선택한 서비스의 API 키와 인터넷 연결이 필요합니다.';}
function download(name,content){const blob=new Blob([content],{type:'text/markdown;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
byId('download-writing').addEventListener('click',()=>downloadPdf(writingPdf,writingFilename||(activeView==='meeting'?'meeting-summary.pdf':'document-summary.pdf')));
async function encodeFile(file){return await new Promise((ok,fail)=>{const reader=new FileReader();reader.onload=()=>ok(reader.result.split(',')[1]);reader.onerror=()=>fail(new Error('파일을 읽을 수 없습니다.'));reader.readAsDataURL(file)})}
let financePayload=null,financeReviewOK=false;
function setFinanceProgress(value,stage){byId('finance-progress').value=value;const t=byId('finance-dog-track');t.style.setProperty('--p',value);t.classList.toggle('running',financeBusy&&value<100);t.classList.toggle('done',value>=100);byId('finance-progress-value').textContent=`${value}%`;byId('finance-progress-stage').textContent=stage;}
function invalidateFinance(){financeRevision++;for(const k in financeUrls){URL.revokeObjectURL(financeUrls[k]);delete financeUrls[k]}financePayload=null;financeReviewOK=false;financeFiles={};financeFilenames={};financePreviews={};previewIndex=0;byId('finance-save').disabled=true;setFinanceProgress(0,'분석 대기 중');renderFinancePreview()}
for(const id of ['finance-zip','finance-company','finance-request'])byId(id).addEventListener(id==='finance-zip'?'change':'input',invalidateFinance);
// The browser picker replaces the previous selection; keep every picked file until removed.
const pickedFiles={};
const fileKey=f=>f.name+'|'+f.size+'|'+f.lastModified;
function setPicked(pickerId,list){pickedFiles[pickerId]=list;try{const dt=new DataTransfer();list.forEach(f=>dt.items.add(f));byId(pickerId).files=dt.files}catch(e){}}
function mergePicked(pickerId){const input=byId(pickerId),now=[...input.files];if(!now.length){pickedFiles[pickerId]=[];return}
 const seen=new Set((pickedFiles[pickerId]||[]).map(fileKey)),merged=[...(pickedFiles[pickerId]||[])];for(const f of now)if(!seen.has(fileKey(f))){seen.add(fileKey(f));merged.push(f)}
 if(merged.length!==now.length)setPicked(pickerId,merged);else pickedFiles[pickerId]=merged}
function showAttachments(pickerId, holderId) {
  const files = [...byId(pickerId).files];
  const holder = byId(holderId);
  holder.replaceChildren();
  holder.hidden = files.length === 0;
  if (!files.length) return;
  const head = document.createElement('div');
  head.className = 'attachment-head';
  const heading = document.createElement('strong');
  heading.textContent = `첨부 파일 ${files.length}개`;
  const clear = document.createElement('button');
  clear.type = 'button';clear.className = 'attachment-clear';clear.textContent = '모두 지우기';
  clear.addEventListener('click', () => {setPicked(pickerId, []);byId(pickerId).value='';byId(pickerId).dispatchEvent(new Event('change'))});
  head.append(heading, clear);
  const list = document.createElement('ol');
  list.className = 'attachment-list';
  files.forEach((file, i) => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = file.name;
    const del = document.createElement('button');
    del.type = 'button';del.className = 'attachment-remove';del.textContent = '✕';
    del.setAttribute('aria-label', file.name + ' 빼기');
    del.addEventListener('click', () => {const rest = files.filter((_, j) => j !== i);setPicked(pickerId, rest);if(!rest.length)byId(pickerId).value='';byId(pickerId).dispatchEvent(new Event('change'))});
    item.append(name, del);
    list.append(item);
  });
  holder.append(head, list);
}
for (const id of ['media-file','finance-zip']) byId(id).addEventListener('change', () => mergePicked(id), true);
byId('finance-zip').addEventListener('change', () => showAttachments('finance-zip','finance-attachments'));

byId('preview-prev').addEventListener('click',()=>{if(previewIndex>0){previewIndex--;renderFinancePreview()}});byId('preview-next').addEventListener('click',()=>{if(previewIndex+1<(financePreviews[selectedFinance]||[]).length){previewIndex++;renderFinancePreview()}});
async function prepareFinance(){const files=Array.from(byId('finance-zip').files),company=byId('finance-company').value.trim(),status=byId('finance-generate-status');if(!company||!files.length){status.textContent='기업명과 재무자료를 입력하세요.';return false}if(files.some(f=>f.size>25000000)||files.reduce((n,f)=>n+f.size,0)>45000000){status.textContent='각 25MB, 합계 45MB 이하로 선택하세요.';return false}if(location.protocol==='file:'){status.textContent='실행 파일로 프로그램을 시작해 주세요.';return false}invalidateFinance();const revision=financeRevision;status.textContent='';setFinanceProgress(0,'원자료 읽는 중 · 연도·단위·계정 확인');try{const payload={company,representative:'',business:'',plan_note:'',funding_note:'',request_note:byId('finance-request').value,files:await Promise.all(files.map(async f=>({name:f.name,data:await encodeFile(f)})))};let r=await fetch('/api/finance-prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let data=await r.json();if(!r.ok)throw Error(data.error);if(revision!==financeRevision)return false;
financePayload=data.review_ticket?{review_id:data.review_id,review_ticket:data.review_ticket}:{...payload,review_id:data.review_id};financeReviewOK=!data.data.rows.some(row=>Object.values(row.checks).includes(false));if(!financeReviewOK){status.textContent='검산이 맞지 않아 보고서를 만들지 않았습니다. 원자료를 확인한 뒤 다시 선택하세요.';setFinanceProgress(0,'검산 불일치 · 생성 중단');return false}setFinanceProgress(0,'검산 일치 · 분석 준비');return true}catch(e){status.textContent=e.message||'자료를 확인하지 못했습니다.';setFinanceProgress(0,'자료 확인 실패');return false}}
byId('finance-generate').addEventListener('click',async()=>{if(financeBusy)return;if(selectedFinance==='adjustment'){byId('finance-generate-status').textContent='세무조정계산서 분석은 아직 연결되지 않았습니다. 지금은 데모 미리보기만 제공합니다.';return}financeBusy=true;byId('finance-generate').disabled=true;document.querySelectorAll('.type-card').forEach(e=>e.disabled=true);try{if(!(financePayload&&financeReviewOK)&&!(await prepareFinance()))return;const revision=financeRevision;setFinanceProgress(0,'분석 준비 중');const r=await fetch('/api/finance-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...financePayload,provider:byId('finance-provider').value,early_result:true})});if(!r.ok||!r.body||!(r.headers.get('content-type')||'').includes('application/x-ndjson'))throw Error('최신 프로그램을 실행한 뒤 다시 시도해 주세요.');const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',complete=false,reportNotice='';while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});let chunks=buffer.split('\n');buffer=chunks.pop();if(done&&buffer.trim()){chunks.push(buffer);buffer=''}for(const line of chunks){if(!line.trim())continue;const event=JSON.parse(line);if(revision!==financeRevision)continue;if(event.type==='progress')setFinanceProgress(event.percent,event.stage);else if(event.type==='error')throw Error(event.error);else if(event.type==='ready'||event.type==='complete'){const data=event.data;
if(data.files){financeFiles=data.files;financeFilenames=data.filenames||{};financePreviews=data.previews||{};previewIndex=0;byId('finance-save').disabled=!financeFiles[selectedFinance+'.pdf'];renderFinancePreview();reportNotice=data.notice||'';}
if(event.type==='ready'){setFinanceProgress(90,'PDF 저장 완료 · 텔레그램 전송 중');byId('finance-generate-status').textContent=reportNotice;continue;}
setFinanceProgress(100,'결과 생성 및 저장 완료');const notice=[reportNotice,deliveryText(data.delivery)].filter(Boolean).join(' · ');byId('finance-generate-status').textContent=notice;byId('finance-complete-message').textContent=notice+' 필요한 파일을 저장하세요.';complete=true}}if(done)break}if(revision!==financeRevision)return;if(!complete)throw Error('완료 응답을 받지 못했습니다. PC 저장 폴더와 텔레그램을 확인하세요.')}catch(e){financePayload=null;financeReviewOK=false;byId('finance-progress-stage').textContent=Object.keys(financeFiles).length?'PDF 저장 완료 · 전송 결과 확인 필요':'분석 중단';byId('finance-generate-status').textContent=e.message||'보고서 생성에 실패했습니다.'}finally{financeBusy=false;document.querySelectorAll('.type-card').forEach(e=>e.disabled=false);byId('finance-generate').disabled=false;byId('finance-dog-track').classList.remove('running')}});
function downloadBinary(name){let raw=financeFiles[name];if(!raw)return;let bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));let blob=new Blob([bytes],{type:'application/pdf'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=financeFilenames[name]||name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
byId('download-input').addEventListener('click',()=>downloadBinary('normalized-input.pdf'));byId('download-audit').addEventListener('click',()=>downloadBinary('reconciliation.pdf'));byId('finance-save').addEventListener('click',()=>{if(!byId('finance-save').disabled)downloadBinary(selectedFinance+'.pdf')});
byId('policy-scan').addEventListener('click',async()=>{const file=byId('policy-html').files[0];if(!file){byId('policy-scan-status').textContent='정책 안내 HTML을 선택하세요.';return}if(file.size>15000000||location.protocol==='file:'){byId('policy-scan-status').textContent='실행 파일에서 열고 15MB 이하 HTML을 선택하세요.';return}byId('policy-scan').disabled=true;try{let r=await fetch('/api/policy-html',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:await encodeFile(file)})});let data=await r.json();if(!r.ok)throw new Error(data.error);let holder=byId('policy-results');holder.replaceChildren();for(const item of data.items){let article=document.createElement('article'),title=document.createElement('strong'),meta=document.createElement('p');title.textContent=item.title;meta.textContent=`${item.region} · ${item.category||'분야 확인 필요'} · 마감 ${item.deadline||'확인 필요'}`;article.append(title,meta);if(item.url){let a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='공고 원문 열기';article.append(a)}holder.append(article)}byId('policy-scan-status').textContent=`저장된 공고 ${data.total_in_view}건 중 ${data.items.length}건 표시, 마감 ${data.expired_excluded}건 제외. 원문 자격 및 최신성 미확인. ${deliveryText(data.delivery)}`}catch(e){byId('policy-scan-status').textContent=e.message||'스캔에 실패했습니다.'}finally{byId('policy-scan').disabled=false}});
const MEDIA_FILE = /\.(wav|mp3|m4a|ogg|flac|aac|mp4|mov|mkv|webm|avi)$/i;
async function extractWritingFile(file, progress) {
  if (!MEDIA_FILE.test(file.name)) return submitFile(file, '/api/extract');
  if (!file.size || file.size > 200_000_000) throw Error('음성·영상 파일은 200MB 이하여야 합니다.');
  progress(0, '음성·영상 업로드 중');
  const extension = file.name.match(MEDIA_FILE)[0];
  const response = await fetch('/api/extract-media-stream', {
    method: 'POST',
    headers: {'Content-Type':'application/octet-stream', 'X-File-Extension':'file'+extension},
    body: file,
  });
  return readWritingStream(response, progress);
}
async function submitFile(file,endpoint){if(file.size>25000000)throw new Error('파일은 25MB 이하만 처리합니다.');const data=await encodeFile(file);const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,data,task:activeView})});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;}
let searchableOutputs=[];
function renderSearchable(){const holder=byId('searchable-results');holder.replaceChildren();if(!searchableOutputs.length)return;const title=document.createElement('strong');title.textContent='검색 가능한 원본 PDF';holder.append(title);for(const item of searchableOutputs){const row=document.createElement('div');row.className='searchable-row';const name=document.createElement('span');name.textContent=item.name+' · '+deliveryText(item.delivery);const button=document.createElement('button');button.className='secondary';button.textContent='PDF 저장';button.addEventListener('click',()=>downloadPdf(item.pdf,item.filename||item.name.replace(/\.[^.]+$/,'')+'-searchable.pdf'));row.append(name,button);holder.append(row)}}
const SCANNABLE=/\.(pdf|png|jpe?g|tiff?|bmp|webp)$/i;
async function makeSearchable(files,onStep=()=>{}){const allowed=SCANNABLE;let failures=[];for(const f of files.filter(x=>allowed.test(x.name))){onStep(f);const key=`${f.name}|${f.size}|${f.lastModified}`;if(searchableOutputs.some(x=>x.key===key))continue;try{const r=await submitFile(f,'/api/searchable');searchableOutputs.push({key,name:f.name,pdf:r.pdf,delivery:r.delivery,filename:r.filename});renderSearchable()}catch(e){failures.push(`${f.name}: ${e.message}`)}}return failures}
function downloadPdf(raw,name){if(!raw)return;const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'application/pdf'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
byId('extract-file').addEventListener('click',async()=>{const files=Array.from(byId('media-file').files);if(!files.length){byId('writing-status').textContent='먼저 파일을 선택해 주세요.';return}if(location.protocol==='file:'){byId('writing-status').textContent='파일 처리는 실행 파일로 시작하세요.';return}let task=activeView;byId('extract-file').disabled=true;byId('media-file').disabled=true;byId('writing-status').textContent='여러 파일에서 원문을 추출하고 스캔 자료를 검색 PDF로 만들고 있습니다.';let results=[],errors=[];writingIncomplete=false;const steps=files.length+files.filter(f=>SCANNABLE.test(f.name)).length;let step=0;const tick=(stage)=>{if(task===activeView)setWritingProgress(Math.round(step++/steps*100),stage,{running:true})};byId('writing-mode').textContent='원본문서화 중';try{for(const f of files){tick(`원문 추출 · ${f.name}`);try{const r=await extractWritingFile(f,(percent,stage)=>{if(task===activeView)setWritingProgress(percent,stage,{running:true})});if(r.truncated)writingIncomplete=true;results.push(`[파일: ${f.name}]\n${r.text}${r.truncated?'\n(60,000자로 잘림: 원본 확인 필요)':''}`)}catch(e){writingIncomplete=true;errors.push(`${f.name}: ${e.message}`)}}const scanErrors=await makeSearchable(files,f=>tick(`검색 PDF · ${f.name}`));if(task!==activeView)return;byId('source-text').value=results.join('\n\n');writingSourceExtracted=true;invalidateWriting();setWritingProgress(100,`원본문서화 완료 · 추출 ${results.length}/${files.length}개`,{done:true});byId('writing-mode').textContent='원본문서화 완료';byId('writing-status').textContent=`${results.length}개 파일 추출 · 검색 PDF ${searchableOutputs.length}개 생성. `+(errors.length||scanErrors.length?`확인 필요: ${errors.concat(scanErrors).join(' / ')}`:'인식 결과를 원문과 대조해 주세요.');}finally{byId('extract-file').disabled=false;byId('media-file').disabled=false}});
async function runWritingAnalysis(payload, onProgress, onReady) {
  const response=await fetch('/api/analyze-stream',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),
  });
  return readWritingStream(response, onProgress, onReady);
}

async function readWritingStream(response, onProgress, onReady = () => {}) {
  if(!response.ok){
    const detail=await response.json().catch(()=>null);
    if(response.status===400&&detail?.error)throw Error(detail.error);
  }
  if(!response.ok||!response.body||!response.headers.get('content-type')?.includes('application/x-ndjson')){
    throw new Error('최신 프로그램을 실행한 뒤 다시 시도해 주세요.');
  }
  const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer='';
  try {
    while (true) {
      const {value,done}=await reader.read();
      buffer+=value||'';
      const lines=buffer.split('\n');
      buffer=done?'':lines.pop();
      for(const line of lines){
        if(!line.trim())continue;
        const event=JSON.parse(line);
        if(event.type==='error')throw new Error(event.error);
        if(event.type==='complete')return event.data;
        if(event.type==='progress')onProgress(event.percent,event.stage);
        if(event.type==='ready')onReady(event.data);
      }
      if(done)throw new Error('분석 완료 응답을 받지 못했습니다.');
    }
  } finally {
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}

byId('real-writing').addEventListener('click',async()=>{
  if(writingBusy||byId('extract-file').disabled)return;
  if(location.protocol==='file:'){
    byId('writing-status').textContent='실제 분석은 실행 파일을 시작한 뒤 사용할 수 있습니다.';
    return;
  }
  if(writingIncomplete){
    byId('writing-status').textContent='추출하지 못했거나 잘린 파일이 있습니다. 파일을 나누거나 다시 선택해 전체 자료를 확인하세요.';
    return;
  }
  const files=Array.from(byId('media-file').files);
  const source=byId('source-text');
  if(!source.value.trim()&&!files.length){
    byId('writing-status').textContent='분석할 파일을 첨부하거나 원문을 입력하세요.';
    return;
  }
  const task=activeView, revision=++writingRevision;
  const current=()=>task===activeView&&revision===writingRevision;
  const status=byId('writing-status');
  const button=byId('real-writing');
  const download=byId('download-writing');
  writingBusy=true;
  button.disabled=true;
  byId('media-file').disabled=true;
  byId('extract-file').disabled=true;
  source.readOnly=true;
  download.disabled=true;
  status.textContent='';
  let percent=0;
  byId('writing-mode').textContent='분석 중';
  setWritingProgress(percent,'분석 요청 중',{running:true});
  byId('writing-progress-panel').scrollIntoView({block:'nearest'});
  try {
    if(files.length&&(!writingSourceExtracted||!source.value.trim())){
      const note=source.value.trim();
      const texts=[];
      for(const [index,file] of files.entries()){
        setWritingProgress(0,`원문 추출 중 · ${index+1}/${files.length} · ${file.name}`,{running:true});
        const result=await extractWritingFile(file,(value,stage)=>{
          if(current()){percent=value;setWritingProgress(value,stage,{running:true});}
        });
        if(!current())return;
        if(result.truncated||!result.text?.trim())throw Error(`${file.name}의 전체 원문을 추출하지 못했습니다. 파일을 나누거나 원문을 입력하세요.`);
        texts.push(`[파일: ${file.name}]\n${result.text}`);
      }
      source.value=(note?note+'\n\n':'')+texts.join('\n\n');
      writingSourceExtracted=true;
    }
    percent=0;
    setWritingProgress(percent,'AI 분석 요청 중',{running:true});
    const data=await runWritingAnalysis({
      task,text:source.value,provider:byId('writing-provider').value,early_result:true,
      source_names:files.map(file=>file.name),
    },(value,stage)=>{
      if(!current())return;
      percent=value;
      setWritingProgress(percent,stage,{running:true});
    },data=>{
      if(!current())return;
      showWritingResult(data);
      percent=90;
      setWritingProgress(percent,'PDF 저장 완료 · 텔레그램 전송 중',{running:true});
    });
    if(!current())return;
    if(data.pdf)showWritingResult(data);
    status.textContent='요약 PDF 생성. 원문과 대조해 주세요. '+deliveryText(data.delivery);
    setWritingProgress(100,deliveryText(data.delivery)||'요약 PDF 생성 완료',{done:true});
  }catch(error){
    if(current()){
      status.textContent=error.message||'분석에 실패했습니다.';
      if(!writingPdf)byId('writing-mode').textContent='분석 중단';
      setWritingProgress(percent,writingPdf?'PDF 저장 완료 · 전송 결과 확인 필요':'분석 중단 · '+status.textContent);
    }
  }finally{
    writingBusy=false;
    button.disabled=false;
    byId('media-file').disabled=false;
    byId('extract-file').disabled=false;
    source.readOnly=false;
  }
  function showWritingResult(data){
    writingResult=data.result;
    writingPdf=data.pdf;
    writingFilename=data.filename||'';
    byId('writing-output').textContent=writingResult;
    byId('writing-mode').textContent='AI 분석 결과';
    byId('writing-html-block').hidden=true;
    byId('writing-result-sub').textContent=sourceTitle()+' 결과';
    download.disabled=false;
  }
});
byId('download-briefing').addEventListener('click',async()=>{const m=finalMessage,status=byId('demo-briefing-delivery');if(!m||m.key!==activeView){status.textContent='발송된 문자 기록이 없습니다.';return}try{const r=await fetch(m.link,{cache:'no-store'});if(!r.ok)throw Error();const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=m.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);status.textContent=''}catch(e){status.textContent='발송문자를 내려받지 못했습니다.'}});

byId('finance-close').addEventListener('click',()=>byId('finance-complete').close());
byId('modal-download-deep').addEventListener('click',()=>downloadBinary('deep.pdf'));
byId('modal-download-comprehensive').addEventListener('click',()=>downloadBinary('comprehensive.pdf'));

byId('modal-download-brief').addEventListener('click',()=>downloadBinary('brief.pdf'));

async function refreshConfig(){const labels={true:'설정 확인됨',false:'설정 필요'};try{if(location.protocol==='file:')throw Error();const response=await fetch('/api/config-status');if(!response.ok)throw Error();const data=await response.json();byId('local-model-status').textContent=data.local_model_running?'실행 중':'대기 중';byId('telegram-status').textContent=labels[data.telegram_configured];byId('openai-status').textContent=labels[data.provider_configured.openai];byId('claude-status').textContent=labels[data.provider_configured.claude]}catch{for(const id of ['local-model-status','telegram-status','openai-status','claude-status'])byId(id).textContent='실행 파일에서 확인'}}
byId('refresh-config').addEventListener('click',refreshConfig);
byId('eval-save').addEventListener('click',async()=>{if(location.protocol==='file:'){byId('eval-status').textContent='실행 파일에서 열어 주세요.';return}const payload={category:byId('eval-category').value,before:byId('eval-before').value,after:byId('eval-after').value,correct:byId('eval-correct').value,total:byId('eval-total').value,notes:byId('eval-notes').value,ready_seconds:byId('eval-ready').value,demo_quality:byId('eval-demo-quality').value};byId('eval-save').disabled=true;try{const r=await fetch('/api/evaluation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw Error(d.error);byId('eval-result').textContent=`${d.result.verdict} · 결과 준비 ${d.result.ready_seconds??'미측정'}${d.result.ready_seconds==null?'':'초'} / 180초 · 데모 품질 ${d.result.demo_quality_label} · 시간 절감 ${d.result.time_saving_percent}% · 정확도 ${d.result.accuracy_percent}%`;byId('eval-status').textContent=deliveryText(d.delivery)}catch(e){byId('eval-status').textContent=e.message||'기록을 저장하지 못했습니다.'}finally{byId('eval-save').disabled=false}});

bindCommand();
openView(['finance','meeting','document','issue','policy','evaluation','settings'].includes(requestedView)?requestedView:'finance');
