"""Exercise actual Cloudflare authentication with a temporary invented account.
The password stays in memory. The exact test ID is recorded only in ignored
build output, so its user/session rows can be removed after verification.
"""
from pathlib import Path
import argparse,json,re,secrets,time
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--url',required=True);args=parser.parse_args()
 base=args.url.rstrip('/');username='qa_'+secrets.token_hex(8);password=secrets.token_urlsafe(24)
 out=ROOT/'dev/build/auth-qa';out.mkdir(parents=True,exist_ok=True)
 (out/'account.json').write_text(json.dumps({'username':username,'url':base}),encoding='utf8')
 (out/(username+'.json')).write_text(json.dumps({'username':username,'url':base}),encoding='utf8')
 checks=[]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='msedge',headless=True)
  # Virtual clock verifies the real production 2–3 minute trigger, without waiting.
  context=browser.new_context(viewport={'width':1450,'height':1000})
  page=context.new_page();page.clock.install();page.goto(base+'/app/')
  page.wait_for_url(re.compile(r'/login(?:\.html)?$'));page.locator('#loginForm').wait_for()
  assert not page.locator('#signupDialog').is_visible()
  page.clock.fast_forward(119000);assert not page.locator('#signupDialog').is_visible()
  page.clock.fast_forward(61001);page.locator('#signupDialog').wait_for(state='visible')
  checks.append('unauthenticated entry redirects; signup prompt absent at119s and visible by180s (virtual clock)')
  page.locator('#closeSignup').click();assert not page.locator('#signupDialog').is_visible()
  context.close()
  context=browser.new_context(viewport={'width':1450,'height':1000},accept_downloads=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/login.html');page.locator('#loginForm').wait_for()
  page.screenshot(path=str(out/'login.png'))
  page.locator('#openSignup').click();page.locator('#signupId').fill(username)
  page.locator('#signupPassword').fill(password);page.locator('#signupConfirm').fill(password+'x')
  page.locator('#signupForm button').click()
  assert '일치하지' in page.locator('#signupStatus').inner_text()
  page.locator('#signupConfirm').fill(password)
  start=time.monotonic();page.locator('#signupForm button').click()
  page.wait_for_function('document.getElementById("signupForm").hidden')
  page.screenshot(path=str(out/'registered-countdown.png'))
  # Early login is denied even if the browser timer is bypassed.
  response=context.request.post(base+'/api/auth/login',headers={'Origin':base},data={'username':username,'password':password})
  assert response.status==425,response.text()
  page.wait_for_url('**/app/',timeout=25000)
  assert time.monotonic()-start>=10
  page.locator('#accountLogout').wait_for();assert username in page.locator('.account-actions').inner_text()
  checks.append('password confirmation; registration; server denies login before10s; automatic login after10s')
  # Cookie persists through reload; session reset must not delete authentication.
  page.reload();page.locator('#accountLogout').wait_for()
  assert page.url.endswith('/app/');checks.append('session survives reload; app starts with no uploaded data')
  cookie=next(c for c in context.cookies() if c['name']=='__Host-returncheck')
  assert cookie['httpOnly'] and cookie['secure'] and cookie['sameSite']=='Lax'
  bad=context.request.post(base+'/api/auth/logout',headers={'Origin':'https://unrelated.invalid'},data={})
  assert bad.status==403;checks.append('Secure HttpOnly session cookie; cross-origin mutation denied')
  page.locator('#filesPick').click()
  with page.expect_file_chooser() as fc:page.locator('[data-document-attach="derived-summary:auto"]').click()
  fc.value.set_files(str(ROOT/'outputs/main-quest/synthetic-tax-summary.xlsx'))
  page.wait_for_function('!ReturnCheckApp.busy && Object.keys(ReturnCheckApp.model.taxes).length===5')
  page.locator('[data-intake-close]').click();page.evaluate('location.hash="#results"')
  for n in (1,2,3,4):
   page.locator(f'[data-report="{n}"]').click()
   page.frame_locator('.session-report iframe').locator('h1').wait_for()
   with page.expect_download() as dl:page.locator('.session-report [data-save]').click()
   dl.value.save_as(str(out/f'report-{n}.html'))
   page.locator('.session-report [data-close]').click()
  checks.append('authenticated five-year upload; reports1–4 and HTML downloads')
  page.on('dialog',lambda d:d.accept())
  page.evaluate('document.getElementById("resetAll").click()')
  page.wait_for_function('!!window.ReturnCheckApp && document.body.classList.contains("no-data")')
  page.locator('#accountLogout').wait_for();assert page.evaluate('ReturnCheckApp.files.length')==0
  checks.append('Reset clears uploads while authentication remains active')
  page.locator('#accountLogout').click();page.wait_for_url(re.compile(r'/login(?:\.html)?$'))
  page.goto(base+'/app/');page.wait_for_url(re.compile(r'/login(?:\.html)?$'))
  page.locator('#loginId').fill(username);page.locator('#loginPassword').fill(password+'wrong')
  page.locator('#loginForm button').click();page.locator('#loginStatus.error').wait_for()
  assert re.search(r'/login(?:\.html)?$',page.url)
  page.locator('#loginPassword').fill(password);page.locator('#loginForm button').click()
  page.wait_for_url('**/app/');page.locator('#accountLogout').wait_for()
  page.locator('#accountLogout').click();page.wait_for_url(re.compile(r'/login(?:\.html)?$'))
  checks.append('logout blocks direct entry; wrong password rejected; new ID/PW login succeeds')
  duplicate=context.request.post(base+'/api/auth/register',headers={'Origin':base},data={'username':username,'password':password})
  assert duplicate.status==409,duplicate.text()
  assert not errors,errors
  browser.close()
 result={'url':base,'checks':checks,'browser_errors':errors}
 (out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(result,ensure_ascii=True,indent=2))
if __name__=='__main__':main()
