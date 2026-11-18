from pathlib import Path
import os
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'output' / 'playwright'
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.getenv('DEMO_URL', (root / 'web' / 'index.html').as_uri()))
    page.screenshot(path=str(out / 'desktop.png'), full_page=True)
    assert page.get_by_role('heading', name='보고서 미리보기').is_visible()
    assert page.locator('.type-card').evaluate_all("els => els.map(el => el.dataset.type)") == ['brief', 'deep', 'comprehensive', 'adjustment']
    page.locator('[data-type="deep"]').click()
    assert page.locator('[data-type="deep"]').get_attribute('aria-pressed') == 'true'
    assert page.locator('#finance-preview-content .page-stack img').count() > 0 and page.locator('#finance-samples .page-stack').count() >= 1
    assert page.locator('#finance-save').is_disabled()
    page.screenshot(path=str(out / 'deep-reference-desktop.png'), full_page=True)
    page.locator('[data-type="comprehensive"]').click()
    assert page.locator('[data-type="comprehensive"]').get_attribute('aria-pressed') == 'true'
    assert page.locator('#finance-preview-content .page-stack img').count() > 0 and page.locator('#finance-samples .page-stack').count() >= 1
    page.locator('[data-view="meeting"]').click()
    assert page.locator('#media-file').get_attribute('multiple') is not None
    assert page.locator('#real-writing').inner_text() == '회의록정리' and page.locator('#real-writing').is_visible()
    assert page.locator('#download-writing').inner_text() == '저장' and page.locator('#download-writing').is_disabled()
    page.screenshot(path=str(out / 'meeting-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("document.activeElement.blur(); window.scrollTo(0, 0)")
    page.screenshot(path=str(out / 'meeting-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.set_viewport_size({'width': 1440, 'height': 900})
    page.locator('[data-view="document"]').click()
    assert page.locator('#media-file').get_attribute('multiple') is not None
    assert page.locator('#writing-provider').is_visible()
    if os.getenv('DEMO_URL'):
        page.locator('#media-file').set_input_files([str(root / 'output' / 'demo' / 'scan.png'), str(root / 'output' / 'demo' / 'sample.wav')])
        page.get_by_role('button', name='원본문서화').click()
        page.get_by_text('2개 파일 추출.', exact=False).wait_for(timeout=90000)
        extracted = page.locator('#source-text').input_value().lower()
        assert 'scan.png' in extracted and 'sample.wav' in extracted and 'meeting' in extracted
        import pymupdf
        demo = root / 'output' / 'demo'
        with pymupdf.open() as original:
            p = original.new_page(width=500, height=110)
            p.insert_image(p.rect, filename=str(demo / 'scan.png'))
            pixels = p.get_pixmap(alpha=False).samples
            original.save(str(demo / 'source-scan.pdf'))
        page.locator('#media-file').set_input_files(str(demo / 'source-scan.pdf'))
        with page.expect_download(timeout=90000) as pdf:
            page.get_by_role('button', name='원본문서화').click()
            page.locator('#searchable-results').get_by_role('button', name='PDF 저장').click(timeout=90000)
        pdf.value.save_as(str(demo / 'searchable-check.pdf'))
        with pymupdf.open(demo / 'searchable-check.pdf') as output:
            assert output[0].get_pixmap(alpha=False).samples == pixels
            assert output[0].get_text().strip()
    page.get_by_role('button', name='정부정책').click()
    assert page.locator('#reports-desc').inner_text() == '전국 · 서울 · 경기 중소기업 지원사업'
    assert page.get_by_role('heading', name='텔레그램 발송 기록').is_visible()
    assert not page.get_by_text('가상 자료',exact=True).is_visible()
    assert page.locator('#download-briefing').inner_text() == '발송문자 내려받기'  # file:// 에서는 발송 기록이 없어 비활성
    page.screenshot(path=str(out / 'policy-desktop.png'), full_page=True)
    page.get_by_role('button', name='이슈 브리핑').click()
    assert page.get_by_role('heading', name='텔레그램 발송 기록').is_visible()
    assert not page.get_by_text('가상 자료',exact=True).is_visible()
    assert page.locator('#download-briefing').inner_text() == '발송문자 내려받기'  # file:// 에서는 발송 기록이 없어 비활성
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("document.activeElement.blur(); window.scrollTo(0, 0)")
    page.screenshot(path=str(out / 'issue-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('[data-view="finance"]').click()
    page.get_by_role('button', name='간략보고서').click()
    page.set_viewport_size({'width': 390, 'height': 844})
    page.evaluate("document.activeElement.blur(); window.scrollTo(0, 0)")
    page.screenshot(path=str(out / 'mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    print('PASS: navigation, report order, mobile overflow, page errors; screenshots saved')
    browser.close()
