"""Verify real media playback instead of relying on GitHub/default Windows apps."""
from pathlib import Path
import argparse,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
def main():
 p=argparse.ArgumentParser();p.add_argument('--url');p.add_argument('--root',type=Path,default=ROOT);a=p.parse_args()
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='msedge',headless=True)
  page=browser.new_page(viewport={'width':1920,'height':1080});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  response=page.goto(a.url or (a.root/'demo/index.html').resolve().as_uri())
  if response:assert response.ok,response.status
  page.wait_for_function('document.getElementById("demoVideo").readyState>=1',timeout=30000)
  info=page.evaluate('''()=>{const v=document.getElementById('demoVideo');return{duration:v.duration,width:v.videoWidth,height:v.videoHeight,error:v.error?.code||0}}''')
  assert 169<info['duration']<180 and info['width']==1920 and info['height']==1080 and info['error']==0,info
  page.locator('#playButton').click();page.wait_for_function('document.getElementById("demoVideo").currentTime>1.5',timeout=15000)
  assert page.evaluate('!document.getElementById("demoVideo").paused')
  page.locator('#playButton').click();assert page.evaluate('document.getElementById("demoVideo").paused')
  page.evaluate('document.getElementById("demoVideo").currentTime=125')
  page.wait_for_function('Math.abs(document.getElementById("demoVideo").currentTime-125)<0.1 && !document.getElementById("demoVideo").seeking',timeout=20000)
  out=ROOT/'dev/build/demo-playback-qa';out.mkdir(parents=True,exist_ok=True)
  assert page.locator('#demoVideo').bounding_box()['width']>1700
  page.evaluate('''()=>{const v=document.getElementById('demoVideo');v.currentTime=v.duration-.4;return v.play()}''')
  page.wait_for_function('document.getElementById("demo").hidden && location.hash==="#readme"',timeout=15000)
  assert page.evaluate('document.activeElement.id')=='readmeHeading'
  assert page.locator('#documents details').count()==5
  page.locator('#document-report summary').click()
  assert page.locator('#document-report').evaluate('e=>e.open')
  page.locator('#document-prd summary').click()
  assert page.locator('#document-prd').evaluate('e=>e.open')
  assert not page.locator('#document-report').evaluate('e=>e.open')
  assert page.locator('details.document[open]').count()==1
  page.wait_for_function("(()=>{const d=document.getElementById('document-prd');const a=d.querySelector('article');const y=a.getBoundingClientRect().top;return y>=0 && y<=32 && document.activeElement===a})()")
  page.locator('#document-ai summary').click()
  page.wait_for_function("(()=>{const d=document.getElementById('document-ai');const a=d.querySelector('article');const y=a.getBoundingClientRect().top;return d.open && y>=0 && y<=32 && document.activeElement===a})()")
  assert not page.locator('#document-prd').evaluate('e=>e.open')
  page.locator('#document-ai summary').click()
  page.locator('#readmeHeading').scroll_into_view_if_needed()
  page.screenshot(path=str(out/('online-readme.png' if a.url else 'local-readme.png')),full_page=True)
  page.locator('#replayButton').click()
  page.wait_for_function('!document.getElementById("demo").hidden && document.getElementById("demoVideo").currentTime>.4',timeout=15000)
  page.locator('#playButton').click()
  page.screenshot(path=str(out/('online.png' if a.url else 'local.png')),full_page=True)
  assert not errors,errors;browser.close()
 print(json.dumps({'mode':a.url or str(a.root),'play_pause_seek':'PASS','enlarged_player':'PASS','ended_to_readme':'PASS','exclusive_documents':'PASS','document_start_scroll':'PASS','replay':'PASS','media':info,'javascript_errors':errors},ensure_ascii=True))
if __name__=='__main__':main()
