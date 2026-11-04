"""Verify the delivered fictional workbook through the local browser flow."""
from pathlib import Path
import argparse, base64, hashlib, json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--url');args=parser.parse_args()
 print('Starting local browser sample QA',flush=True)
 screenshots=ROOT/'docs/submission/screenshots';screenshots.mkdir(parents=True,exist_ok=True)
 generated=ROOT/'dev/build/submission';generated.mkdir(parents=True,exist_ok=True)
 sample=ROOT/'outputs/main-quest/synthetic-tax-summary.xlsx'
 checks=[]
 if True:
  with sync_playwright() as pw:
   print('Launching Edge',flush=True)
   browser=pw.chromium.launch(channel='msedge',headless=True)
   page=browser.new_page(viewport={'width':1500,'height':1000},accept_downloads=True)
   page.set_default_timeout(15000)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(args.url or (ROOT/'app/index.html').as_uri())
   print('Local page loaded',flush=True)
   page.wait_for_function('!!window.SingleFileIntake')
   assert page.evaluate('document.body.classList.contains("no-data")');checks.append('empty local browser startup')
   page.locator('#filesPick').click()
   assert page.locator('[data-document-id]').count()==18
   with page.expect_file_chooser() as fc:page.locator('[data-document-attach="derived-summary:auto"]').click()
   fc.value.set_files(str(sample))
   print('Workbook selected',flush=True)
   page.wait_for_function('!ReturnCheckApp.busy && Object.keys(ReturnCheckApp.model.taxes).length===5')
   model=page.evaluate('ReturnCheckApp.model')
   assert model['companyId']=='0000000000',model['companyId']
   for i,y in enumerate(range(2021,2026)):
    assert model['taxes'][str(y)]['base']==80000000+i*20000000
    assert model['taxes'][str(y)]['burden']==7200000+i*1800000
   assert not model['employment'];checks.append('five annual values and dummy identifier imported exactly; employment absent')
   page.locator('#otherDocumentName').fill('가상 증빙 설명')
   page.locator('#otherDocumentAgency').fill('가상 회계팀')
   page.locator('#otherDocumentYear').select_option('2025')
   with page.expect_file_chooser() as fc:page.locator('#otherDocumentForm button').click()
   fc.value.set_files(str(ROOT/'samples/synthetic-note.txt'))
   page.wait_for_function('!ReturnCheckApp.busy && ReturnCheckApp.files.length===2')
   assert not any(f.get('error') for f in page.evaluate('ReturnCheckApp.files'))
   page.locator('#otherDocumentFiles').get_by_text('가상 증빙 설명',exact=True).wait_for()
   page.screenshot(path=str(screenshots/'01-individual-upload.png'))
   page.locator('[data-intake-close]').click()
   page.evaluate('location.hash="#results"');page.locator('#annualCombinedRows tr').first.wait_for()
   assert page.locator('#annualCombinedRows tr').count()==6
   page.screenshot(path=str(screenshots/'02-year-results.png'))
   checks.append('individual slots and reference-only metadata; six annual/total rows')
   print('Uploaded samples; opening reports',flush=True)
   for n in (1,2,3,4):
    page.locator(f'[data-report="{n}"]').click()
    body=page.frame_locator('.session-report iframe').locator('body');body.locator('h1').wait_for()
    assert body.locator('table').count()>0
    if n==4:
     text=body.inner_text()
     for needle in ('synthetic-tax-summary.xlsx','synthetic-note.txt','가상 증빙 설명','가상 회계팀','2025'):assert needle in text,needle
     page.screenshot(path=str(screenshots/'03-upload-report.png'))
    with page.expect_download() as dl:page.locator('.session-report [data-save]').click()
    target=generated/f'report-{n}.html';dl.value.save_as(str(target))
    assert '<html' in target.read_text('utf8').lower()
    page.locator('.session-report [data-close]').click()
   checks.append('reports 1–4 opened and HTML downloaded; report 4 contains both filenames and metadata')
   # Re-ingest same fictional data under a different identity; current model must survive.
   page.evaluate("""async(encoded)=>{const original=SourceReader.summaryTax;
    try{SourceReader.summaryTax=(...a)=>original(...a).map(t=>({...t,companyId:'1111111111'}));
     const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
     await ReturnCheckApp.ingest([new File([bytes],'synthetic-different-company.xlsx')]);
    }finally{SourceReader.summaryTax=original}}
   """,base64.b64encode(sample.read_bytes()).decode())
   assert page.evaluate('ReturnCheckApp.files.at(-1).error')
   assert page.evaluate('ReturnCheckApp.model.companyId')=='0000000000'
   assert page.evaluate('ReturnCheckApp.model.taxes[2025].base')==160000000
   checks.append('different-company identity rejected without replacing current values (parser substitution test)')
   page.on('dialog',lambda d:d.accept())
   page.evaluate('document.getElementById("resetAll").click()')
   page.wait_for_function('!!window.ReturnCheckApp && document.body.classList.contains("no-data")')
   assert page.evaluate('ReturnCheckApp.files.length')==0
   assert not errors,errors
   checks.append('Reset clears current inputs; no browser JavaScript errors')
   browser.close()
 result={'date':'2026-11-04','environment':('Public HTTPS '+args.url if args.url else 'Local file URL')+' / Microsoft Edge headless / Windows',
  'sample_sha256':hashlib.sha256(sample.read_bytes()).hexdigest(),'checks':checks,
  'not_verified':['tax-law correctness','real institution collection','video recording']+([] if args.url else ['public deployment'])}
 (generated/'qa-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(result,ensure_ascii=True,indent=2))
if __name__=='__main__':main()
