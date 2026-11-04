"""Build a self-contained demo + README document viewer from submission sources."""
from pathlib import Path
import base64,html,re
import markdown

ROOT=Path(__file__).resolve().parents[2]
DOCS=[('report','제출보고서','제출보고서.md'),('prd','PRD · 요구사항','PRD.md'),
 ('retrospective','회고록','retrospective.md'),('ai','AI 협업 기록','docs/submission/AI_COLLABORATION.md'),
 ('verification','기능 검증 기록','docs/submission/VERIFICATION.md')]
LOOKUP={(ROOT/p).resolve():key for key,_,p in DOCS}
GITHUB='https://github.com/sorek-charlie/AIFFEL-Quest/blob/main/Quest_main_01/'

def render(source,text=None):
 content=markdown.markdown(text if text is not None else source.read_text('utf8'),extensions=['tables','fenced_code','sane_lists'])
 def link(m):
  href=html.unescape(m[1])
  if href=='https://tax-return-review-quest.pages.dev/demo/':return 'href="#demo" data-demo-link'
  if href.startswith(('https://','http://','mailto:','#')):return m[0]
  path=(source.parent/href.split('#')[0]).resolve()
  if path in LOOKUP:return f'href="#document-{LOOKUP[path]}" data-doc-link="{LOOKUP[path]}"'
  if path.is_relative_to(ROOT):return 'href="'+GITHUB+path.relative_to(ROOT).as_posix()+'" target="_blank" rel="noopener"'
  return m[0]
 content=re.sub(r'href="([^"]+)"',link,content)
 def image(m):
  path=(source.parent/html.unescape(m[1])).resolve()
  if path.is_relative_to(ROOT) and path.is_file():
   data=path.read_bytes();mime='image/jpeg' if data[:2]==b'\xff\xd8' else 'image/png'
   return 'src="data:'+mime+';base64,'+base64.b64encode(data).decode()+'"'
  return m[0]
 return re.sub(r'src="([^"]+)"',image,content)

PAGE=r'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>데모 · README · 경정청구 도우미</title>
<style>
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#eef3f9;color:#19344e;font:16px/1.75 "Malgun Gothic",system-ui,sans-serif}a{color:#2953b4}button,.button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:8px 16px;background:#315cd3;color:#fff;text-decoration:none;cursor:pointer}.secondary{background:#e2eaf5;color:#284263}.shell{width:min(1920px,calc(100% - 32px));margin:auto}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;flex-wrap:wrap}.top h1{font-size:20px;margin:0}.top nav{display:flex;gap:8px;align-items:center}.top nav a{font-size:14px}.player{background:#101c2a;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px #17324d20}video{display:block;width:100%;aspect-ratio:16/9;max-height:calc(100dvh - 116px);object-fit:contain;background:#101c2a}.toolbar{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 0;flex-wrap:wrap}.toolbar>div{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#status{font-size:13px;color:#536b84}#error{background:#fff0f0;color:#a32c3f;padding:14px;border-radius:10px}.readme{max-width:1150px;margin:42px auto 60px;scroll-margin-top:16px}.readme-title{display:flex;gap:16px;align-items:center;justify-content:space-between}.readme-title h2{font-size:26px;margin:0}.card{background:#fff;border:1px solid #dbe5f0;border-radius:12px;padding:clamp(20px,3vw,38px);margin:18px 0}.card h1{font-size:27px}.card h2{font-size:23px}.card p{margin:12px 0}article img{max-width:100%;height:auto}article table{display:block;overflow:auto;border-collapse:collapse;max-width:100%;font-size:14px}article th,article td{border:1px solid #d9e2ed;padding:9px 12px;text-align:left}article th{background:#eff4fb}article pre{overflow:auto;padding:18px;background:#f2f5fa;border-radius:8px}article code{font-family:Consolas,monospace}details.document{background:white;border:1px solid #d5e0ed;border-radius:12px;margin:12px 0;overflow:hidden}summary{color:#2458c9;text-decoration:underline;text-underline-offset:4px;cursor:pointer;list-style:none;padding:19px 24px;font-size:18px;font-weight:700;display:flex;justify-content:space-between;gap:16px}summary::-webkit-details-marker{display:none}summary::after{content:'＋';color:#315cd3}details[open] summary::after{content:'−'}details[open] summary{background:#edf3ff;border-bottom:1px solid #d5e0ed}.document article{padding:24px 30px;scroll-margin-top:16px}.subtle{font-size:14px;color:#61768d}.notice{background:#e6f5ec;color:#246445;border-radius:8px;padding:10px 16px;margin:12px 0}.document-navigation{border-top:1px solid #d5e0ed;margin-top:28px;padding-top:20px}.document-navigation h3{margin:0 0 12px;font-size:18px}.document-navigation a{display:block;color:#2458c9;text-decoration:underline;text-underline-offset:3px;padding:7px 0}.source{font-size:13px;text-align:right}.reading .top{max-width:1150px;margin:auto}.reading .readme{margin-top:18px}footer{font-size:13px;color:#657a90;padding:20px 0 30px;text-align:center}[hidden]{display:none!important}button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #5b89ed;outline-offset:3px}@media(max-width:650px){.shell{width:calc(100% - 20px)}.top h1{font-size:17px}.top nav{flex-wrap:wrap}.top nav a{padding:5px 9px}video{max-height:none}.toolbar{align-items:flex-start}.readme-title{align-items:flex-start;flex-direction:column}.document article{padding:18px}summary{font-size:16px;padding:16px}}
</style></head><body><main class="shell">
<header class="top"><h1>경정청구 도우미 · 메인퀘스트</h1><nav><a class="button secondary" href="#demo" data-demo-link>데모</a><a class="button secondary" href="#readme" data-readme-link>README</a><a class="button" href="https://tax-return-review-quest.pages.dev/" target="_blank" rel="noopener">프로그램 실행 ↗</a></nav></header>
<section id="demo" aria-label="확대 데모 영상">
<div class="player"><video id="demoVideo" controls playsinline preload="metadata" poster="../outputs/main-quest/video/preview-presenter.png?v=robot-v4" aria-label="남성 발표자와 로봇 도우미 AI 시연"><source src="../outputs/main-quest/video/main-quest-capture-introduction-1080p.mp4?v=robot-lipsync-v4-20261105" type="video/mp4">HTML5 동영상 재생을 지원하는 브라우저를 사용하세요.</video></div>
<div class="toolbar"><div><button id="playButton" type="button">▶ 데모 재생</button><button id="fullscreenButton" type="button" class="secondary">전체 화면</button><span id="status" role="status" aria-live="polite">영상 정보를 불러오는 중입니다.</span></div><a href="../outputs/main-quest/video/main-quest-capture-introduction-1080p.mp4?v=robot-lipsync-v4-20261105" download>MP4 다운로드</a></div>
<p id="error" role="alert" hidden>영상을 불러오지 못했습니다. 인터넷 연결이나 파일 위치를 확인해 주세요.</p>
<p class="subtle">2분50초 · 1920×1080 · AI 남성 발표자·한국어 음성·로봇 포인터 안내. 영상이 끝나면 README로 자동 이동합니다.</p>
</section>
<section id="readme" class="readme" aria-labelledby="readmeHeading">
<div class="readme-title"><h2 id="readmeHeading" tabindex="-1">README · 제출 안내</h2><button id="replayButton" class="secondary" type="button">영상 다시 보기</button></div>
<p id="readmeStatus" class="notice" role="status" hidden>데모 시청을 마쳤습니다. 아래에서 프로그램 실행과 제출 문서를 확인하세요.</p>
<article id="readmeBody" class="card">@@README@@</article>
<h2>제출 문서</h2><p class="subtle">제목을 누르면 문서가 펼쳐집니다. 다른 문서를 열면 이전 문서는 자동으로 접힙니다.</p>
<div id="documents">@@DOCUMENTS@@</div>
<footer>표시 금액은 전문가 확인이 필요한 잠정 계산입니다. 회사명·계정정보는 비식별 처리했습니다.<br>로봇은 실제 앱 화면 위에 합성한 안내 포인터이며, 실제 자동 조작 기능을 뜻하지 않습니다.</footer>
</section></main>
<script>
(()=>{'use strict';const video=document.getElementById('demoVideo'),button=document.getElementById('playButton'),status=document.getElementById('status'),error=document.getElementById('error'),demo=document.getElementById('demo'),readme=document.getElementById('readme'),heading=document.getElementById('readmeHeading'),notice=document.getElementById('readmeStatus');
function ready(){if(Number.isFinite(video.duration))status.textContent=`재생 준비 완료 · ${Math.floor(video.duration/60)}분 ${Math.round(video.duration%60)}초`;}
function showReadme(ended=false){if(!video.paused)video.pause();demo.hidden=true;document.body.classList.add('reading');notice.hidden=!ended;history.replaceState(null,'','#readme');readme.scrollIntoView({behavior:'auto',block:'start'});heading.focus({preventScroll:true});}
async function showDemo(play=false){demo.hidden=false;document.body.classList.remove('reading');history.replaceState(null,'','#demo');demo.scrollIntoView({behavior:'auto',block:'start'});if(video.ended)video.currentTime=0;if(play){try{await video.play()}catch{status.textContent='영상 안의 재생 버튼을 눌러 주세요.'}}}
video.addEventListener('loadedmetadata',ready);if(video.readyState>=1)ready();video.addEventListener('playing',()=>{button.textContent='Ⅱ 일시정지';status.textContent='재생 중입니다.';error.hidden=true});video.addEventListener('pause',()=>{button.textContent='▶ 계속 재생';status.textContent='일시정지했습니다.'});video.addEventListener('error',()=>{error.hidden=false;status.textContent='영상 연결을 확인해 주세요.'});video.addEventListener('ended',async()=>{button.textContent='↻ 다시 보기';if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}}showReadme(true)});
button.addEventListener('click',()=>video.paused?showDemo(true):video.pause());document.getElementById('replayButton').addEventListener('click',()=>showDemo(true));document.getElementById('fullscreenButton').addEventListener('click',async()=>{try{if(video.requestFullscreen)await video.requestFullscreen();else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen()}catch{status.textContent='영상의 전체 화면 아이콘을 눌러 주세요.'}});
document.querySelectorAll('[data-demo-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showDemo(false)}));document.querySelectorAll('[data-readme-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showReadme(false)}));
const docs=[...document.querySelectorAll('details.document')];let documentNavigation=0;
function documentStart(d){const navigation=++documentNavigation;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(navigation!==documentNavigation||!d.open)return;const article=d.querySelector('article');article.focus({preventScroll:true});article.scrollIntoView({behavior:'auto',block:'start'});history.replaceState(null,'','#'+d.id)}))}
docs.forEach(d=>d.addEventListener('toggle',()=>{if(d.open){docs.forEach(other=>{if(other!==d)other.open=false});documentStart(d)}}));document.querySelectorAll('[data-doc-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showReadme(false);const d=document.getElementById('document-'+a.dataset.docLink);if(d){docs.forEach(other=>other.open=other===d);documentStart(d)}}));
if(location.hash==='#readme')showReadme(false);if(location.hash.startsWith('#document-')){const d=document.getElementById(location.hash.slice(1));showReadme(false);if(d){d.open=true;documentStart(d)}}
})();
</script></body></html>'''

def main():
 readme=render(ROOT/'README.md',(ROOT/'README.md').read_text('utf8').split('## 제출 문서')[0])
 documents=[]
 for key,title,path in DOCS:
  other_links=''.join(f'<a href="#document-{other_key}" data-doc-link="{other_key}">{html.escape(other_title)}</a>' for other_key,other_title,_ in DOCS if other_key!=key)
  navigation='<nav class="document-navigation" aria-label="다른 제출서류"><h3>다른 제출서류</h3>'+other_links+'</nav>'
  documents.append(f'<details class="document" id="document-{key}" name="submission-docs"><summary>{html.escape(title)}</summary><article tabindex="-1">'+render(ROOT/path)+f'<p class="source"><a href="{GITHUB+path}" target="_blank" rel="noopener">GitHub 원문 보기 ↗</a></p>'+navigation+'</article></details>')
 (ROOT/'demo/index.html').write_text(PAGE.replace('@@README@@',readme).replace('@@DOCUMENTS@@','\n'.join(documents)),encoding='utf8')
 print('Built enlarged demo / README / five exclusive document panels')

if __name__=='__main__':main()
