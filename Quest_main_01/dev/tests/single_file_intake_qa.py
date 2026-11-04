"""Exercise per-document and other-file intake with invented in-memory files."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from e2e_qa import workbook

ROOT=Path(__file__).resolve().parents[2]
def main():
 with sync_playwright() as pw:
  b=pw.chromium.launch(channel='msedge',headless=True)
  pg=b.new_page(viewport={'width':1500,'height':1000});errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.goto((ROOT/'app/index.html').as_uri());pg.wait_for_function('!!window.SingleFileIntake')
  pg.locator('#filesPick').click();assert pg.locator('#singleFileDialog').is_visible()
  assert pg.locator('[data-document-id]').count()==18
  assert pg.locator('[data-document-id^="tax-return:"]').count()==5
  assert pg.locator('[data-document-id^="insurance-rate:"]').count()==7
  with pg.expect_file_chooser() as fc:pg.locator('[data-document-attach="derived-summary:auto"]').click()
  fc.value.set_files({'name':'synthetic-summary.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':workbook('0000000000')})
  pg.wait_for_function('!ReturnCheckApp.busy && ReturnCheckApp.files.length===1')
  pg.locator('[data-document-id="derived-summary:auto"] [data-document-status]').get_by_text('synthetic-summary.xlsx',exact=True).wait_for()
  f=pg.evaluate('ReturnCheckApp.files[0]');assert f['documentName']=='법인세 종합정보(요약)' and f['declaredYear']=='auto'
  assert pg.evaluate('Analysis2.state.inputs.length')==1
  # Other requires a label before it opens a file chooser.
  pg.locator('#otherDocumentForm button').click();assert pg.evaluate('!document.getElementById("otherDocumentName").checkValidity()')
  pg.locator('#otherDocumentName').fill('추가 소명자료 <test>')
  pg.locator('#otherDocumentAgency').fill('회사 회계팀');pg.locator('#otherDocumentYear').select_option('2024')
  with pg.expect_file_chooser() as fc:pg.locator('#otherDocumentForm button').click()
  fc.value.set_files({'name':'synthetic-note.txt','mimeType':'text/plain','buffer':b'Synthetic attachment only'})
  pg.wait_for_function('!ReturnCheckApp.busy && ReturnCheckApp.files.length===2')
  pg.locator('#otherDocumentFiles').get_by_text('추가 소명자료 <test>',exact=True).wait_for()
  f=pg.evaluate('ReturnCheckApp.files[1]');assert f['agency']=='회사 회계팀' and f['declaredYear']=='2024' and not f['error']
  assert pg.locator('#otherDocumentFiles test').count()==0
  # A recognized tax return for the wrong year must not mutate the current model.
  pg.evaluate("""async()=>{const oldP=SourceReader.pdfPages,oldT=SourceReader.pdfTax;
   try{SourceReader.pdfPages=async()=>[];SourceReader.pdfTax=()=>({year:2023,companyId:'0000000000',base:3,calculated:3,burden:3,applied:0});
    await ReturnCheckApp.ingest([new File(['synthetic'],'wrong-year.pdf')],{documentId:'tax-return:2021',intent:'tax',declaredYear:'2021',agency:'국세청 홈택스',documentName:'법인세 신고서'});
   }finally{SourceReader.pdfPages=oldP;SourceReader.pdfTax=oldT}}
  """)
  assert pg.evaluate('ReturnCheckApp.files[2].error')
  assert pg.evaluate('ReturnCheckApp.model.taxes[2023].base')==100000000
  out=ROOT/'dev/build/public-qa';out.mkdir(parents=True,exist_ok=True)
  pg.screenshot(path=str(out/'single-file-dialog.png'),full_page=True)
  pg.locator('[data-intake-close]').click();pg.evaluate('location.hash="#results"');pg.wait_for_timeout(100)
  pg.locator('[data-report="4"]').click()
  body=pg.frame_locator('.session-report iframe').locator('body');body.get_by_text('synthetic-note.txt',exact=True).wait_for()
  assert '추가 소명자료 <test>' in body.inner_text() and '회사 회계팀' in body.inner_text()
  pg.locator('.session-report [data-close]').click();pg.evaluate('location.hash="#upload"');pg.locator('#clearSources').click()
  pg.locator('#filesPick').click();assert '미첨부' in pg.locator('#documentSlots').inner_text()
  assert not pg.locator('#otherDocumentFiles').inner_text()
  assert not errors,errors
  b.close()
 print('PASS: 18 document/year slots, individual uploads, required other label, metadata, report export, year mismatch and clear')
if __name__=='__main__':main()
