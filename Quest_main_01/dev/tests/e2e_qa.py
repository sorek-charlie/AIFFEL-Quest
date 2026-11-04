"""Browser QA using an in-memory invented workbook, never customer documents."""
from pathlib import Path
from io import BytesIO
import re
import openpyxl
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def workbook(company_id):
    wb=openpyxl.Workbook();ws=wb.active
    ws.append(['구분','항목','2021년','2022년','2023년','2024년','2025년'])
    for key,value in [('사업자번호',company_id),('과세표준',100000000),('산출세액',9000000),('총부담세액',9000000),('최저한세적용대상공제감면세액',0)]:
        ws.append(['',key,*[value]*5])
    out=BytesIO();wb.save(out);return out.getvalue()

def main():
    html=(ROOT/'app/index.html').read_text('utf8')
    for ref in re.findall(r'(?:src|href|data-src)="([^"#:]+)"',html):
        if ref.startswith(('http:','https:')):continue
        assert (ROOT/'app'/ref.split('#')[0]).resolve().exists(),ref
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page(viewport={'width':1500,'height':1000})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto((ROOT/'app/index.html').as_uri());page.wait_for_function('!!window.ReturnCheckApp')
        assert page.evaluate('document.body.classList.contains("no-data")')
        assert not page.evaluate('!!window.RETURN_CHECK_SOURCE')
        assert page.locator('#upload').is_visible()
        page.set_input_files('#filesInput',{'name':'synthetic-summary.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':workbook('0000000000')})
        page.wait_for_function('!ReturnCheckApp.busy && Object.keys(ReturnCheckApp.model.taxes).length===5')
        assert page.evaluate('ReturnCheckApp.model.companyId')=='0000000000'
        page.evaluate('location.hash="#results"');page.wait_for_timeout(200)
        assert page.locator('#annualCombinedRows tr').count()==6
        for n in (1,2,3,4):
            page.locator(f'[data-report="{n}"]').click()
            frame=page.frame_locator('.session-report iframe')
            frame.locator('h1').wait_for()
            assert frame.locator('table').count()>0
            if n==4:assert 'synthetic-summary.xlsx' in frame.locator('body').inner_text()
            page.locator('.session-report [data-close]').click()
        page.evaluate('location.hash="#consult"');page.wait_for_timeout(100)
        assert '0000000000'==page.evaluate('Analysis2.state.companyId')
        page.on('dialog',lambda d:d.accept())
        page.evaluate('document.getElementById("resetAll").click()')
        page.wait_for_function('!!window.ReturnCheckApp && document.body.classList.contains("no-data")')
        assert page.evaluate('Object.keys(ReturnCheckApp.model.taxes).length')==0
        assert not errors,errors
        out=ROOT/'dev/build/public-qa';out.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(out/'empty-startup.png'),full_page=True)
        browser.close()
    print('PASS: empty startup, synthetic upload, reports 1-4, company isolation and Reset; no browser errors')

if __name__=='__main__':main()
