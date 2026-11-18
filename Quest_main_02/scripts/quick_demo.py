"""Show an actual synthetic CSV-to-PDF run in the workroom UI."""
import argparse
import base64
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

import pymupdf
from playwright.sync_api import sync_playwright

from app.finance_input import extract_files
from app.finance_reports import make_brief
from scripts.record_workroom_demo import ORIGIN, ROOT, recording_routes


def show(directory, *, headless, record):
    routes, _ = recording_routes(directory)
    sample = ROOT / 'examples' / 'finance-demo.csv'
    reviewed = None

    def serve(route):
        nonlocal reviewed
        url = urlsplit(route.request.url)
        if url.netloc != urlsplit(ORIGIN).netloc:
            route.abort()
        elif url.path in routes:
            content_type, body = routes[url.path]
            route.fulfill(content_type=content_type, body=body)
        elif url.path == '/api/finance-prepare':
            details = route.request.post_data_json
            files = [(item['name'], base64.b64decode(item['data'])) for item in details['files']]
            if files != [(sample.name, sample.read_bytes())]:
                route.fulfill(status=400, json={'error': '공개 데모용 CSV를 선택하세요.'})
                return
            reviewed = extract_files(files)
            reviewed.update(company=details['company'], input_names=[sample.name])
            route.fulfill(json={'data': reviewed, 'review_id': 'demo', 'review_ticket': 'demo'})
        elif url.path == '/api/finance-stream' and reviewed is not None:
            pdf = directory / 'brief.pdf'
            make_brief(reviewed, pdf, title='예시전자 간략보고서 · 가상 데모')
            event = {'type': 'complete', 'data': {
                'files': {'brief.pdf': base64.b64encode(pdf.read_bytes()).decode('ascii')},
                'notice': '가상 CSV 검산 및 PDF 생성 완료',
            }}
            route.fulfill(content_type='application/x-ndjson', body=json.dumps(event) + '\n')
        else:
            route.fulfill(status=404, body='')

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='chrome', headless=headless)
        video_options = {
            'record_video_dir': directory, 'record_video_size': {'width': 1440, 'height': 900},
        } if record else {}
        context = browser.new_context(
            viewport={'width': 1440, 'height': 900}, reduced_motion='reduce', locale='ko-KR',
            **video_options,
        )
        context.route('**/*', serve)
        page = context.new_page()
        page.goto(ORIGIN + '/index.html?view=finance')
        page.locator('[data-type="deep"]').click()
        page.wait_for_timeout(500)
        page.locator('[data-type="brief"]').click()
        company = page.locator('#finance-company')
        company.press_sequentially('예시전자', delay=120)
        page.locator('#finance-zip').set_input_files(sample)
        page.wait_for_timeout(700)
        page.locator('#finance-generate').click()
        page.locator('#finance-preview-content iframe.finance-result-pdf').wait_for()
        assert page.locator('#finance-progress-value').inner_text() == '100%'
        with page.expect_download() as download:
            page.locator('#finance-save').click()
        pdf_bytes = Path(download.value.path()).read_bytes()
        with pymupdf.open(stream=pdf_bytes, filetype='pdf') as report:
            assert len(report) == 7
            if record:
                # Chromium's built-in PDF viewer is blank in headless video captures.
                png = report[1].get_pixmap().tobytes('png')
                page.locator('#finance-preview-content iframe').evaluate(
                    """(frame, src) => {
                        const image = new Image();
                        image.alt = '생성한 PDF 2쪽';
                        image.style.width = '100%';
                        image.src = src;
                        frame.replaceWith(image);
                        return image.decode();
                    }""",
                    'data:image/png;base64,' + base64.b64encode(png).decode('ascii'),
                )
        page.wait_for_timeout(3500 if record else 5000)
        context.close()
        return Path(page.video.path()) if record else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record', type=Path, help='Save an MP4 recording')
    parser.add_argument('--headless', action='store_true')
    args = parser.parse_args()
    with TemporaryDirectory() as folder:
        video = show(Path(folder), headless=args.headless, record=args.record is not None)
        if video:
            subprocess.run([
                'ffmpeg', '-y', '-loglevel', 'error', '-i', str(video),
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(args.record),
            ], check=True)
    print('PASS: CSV upload, report generation, preview and PDF download')


if __name__ == '__main__':
    main()
