"""Record the real workroom UI with allowlisted synthetic content."""
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter
from urllib.parse import parse_qs, urlsplit

import pymupdf
from playwright.sync_api import sync_playwright

from app.public_demo import ROOT, demo_routes
from briefings.report_pdf import create

OUTPUT = ROOT / 'output' / 'public-walkthrough'
ORIGIN = 'http://workroom-demo.test'
SCENES = [
    ('간략보고서', '재무분석', '간략보고서', '비교 재무제표와 손익 요약'),
    ('심층보고서', '재무분석', '심층보고서', '재무상태와 비용 구조를 항목별로 확인'),
    ('종합보고서', '재무분석', '종합보고서', '기업 개요부터 성장 실적과 자금 활용까지'),
    ('세무조정계산서', '재무분석', '세무조정계산서', '원문의 과세표준과 세액 근거 대조'),
    ('회의록정리', '회의록정리', '', '원본문서화와 회의록 정리 두 버전'),
    ('요약보고서', '요약보고서', '', '절차, 핵심 요약, 확인할 사항'),
    ('이슈 브리핑', '이슈 브리핑', '', '기사 제목·링크와 최종 첨부'),
    ('정부정책', '정부정책(중소기업)', '', '공고 제목·링크와 최종 첨부'),
]
EXAMPLES = {
    'adjustment': ('세무조정계산서 분석보고서',
                   '## 1. 사업연도 및 원문\n예시전자 · 2025년 가상 계산서\n\n'
                   '## 2. 소득금액 조정\n결산서상 손익 9,000,000원\n익금산입 500,000원 · 손금산입 200,000원\n'
                   '소득금액 9,300,000원 · 산출 근거는 예시 계산서 1쪽\n\n'
                   '## 3. 확인 필요\n공제 적용 요건 및 이월 자료 없음'),
    'meeting-document': ('회의록 원본문서화',
                         '## 회의 개요\n가상 회의 · 월간 업무 회의\n\n'
                         '## 원문 전사\n[00:12] 참가자 A: 자료 목록을 먼저 확인하겠습니다.\n'
                         '[00:33] 참가자 B: 금요일까지 샘플을 정리하겠습니다.'),
    'meeting-summary': ('회의록정리 결과',
                        '## 결정 사항\n먼저 자료 목록과 파일 형식을 확인한다.\n\n'
                        '## 후속 작업\n참가자 B가 금요일까지 샘플을 정리한다.\n\n'
                        '## 원문 근거\n음성 전사 00:12 및 00:33'),
    'document-summary': ('요약보고서 결과',
                         '## 핵심 요약\n예시 안내문은 접수 → 검토 → 결과 통지 흐름으로 구성된다.\n\n'
                         '## 확인 항목\n제출 서류와 접수 일정을 원문에서 확인한다.\n\n'
                         '## 원문 근거\n예시 안내문 1쪽 및 2쪽'),
    'issue': ('Daily News 예시 보고서',
              '## AI·경제\n예시 기업, 업무용 AI 도입 사례 공개\nhttps://example.org/news/ai\n\n'
              '## 기술\n가상 제조업 디지털 전환 동향\nhttps://example.org/news/technology'),
    'policy': ('정부정책 예시 보고서',
               '## 경기 · 지원사업 예시\n가상 소상공인 온라인 판로 지원\nhttps://example.org/policy/sales\n\n'
               '## 서울 · 지원사업 예시\n가상 중소기업 교육 지원\nhttps://example.org/policy/training'),
}
BRIEFINGS = {
    'issue': ('Daily News', '예시 기업, 업무용 AI 도입 사례 공개\nhttps://example.org/news/ai\n\n'
              '가상 제조업 디지털 전환 동향\nhttps://example.org/news/technology'),
    'policy': ('정부정책', '가상 소상공인 온라인 판로 지원\nhttps://example.org/policy/sales\n\n'
               '가상 중소기업 교육 지원\nhttps://example.org/policy/training'),
}


def recording_routes(directory):
    web = ROOT / 'web'
    routes = {f'/{file}': (content_type, (web / file).read_bytes()) for file, content_type in
              [('index.html', 'text/html; charset=utf-8'), ('app.js', 'text/javascript'),
               ('motion.js', 'text/javascript'), ('styles.css', 'text/css'), ('playful.css', 'text/css')]}
    pdfs = {kind: data for path, (_, data) in demo_routes().items()
            if path.endswith('.pdf') for kind in [Path(path).stem]}
    for kind, (title, body) in EXAMPLES.items():
        pdf = directory / f'{kind}.pdf'
        create(f'# {title}\n\n공개 데모용 가상 예시\n\n{body}', pdf, title=title)
        pdfs[kind] = pdf.read_bytes()
    manifest = {}
    for kind, data in pdfs.items():
        with pymupdf.open(stream=data, filetype='pdf') as pdf:
            numbers = range(len(pdf))
            if len(pdf) > 4:
                numbers = (0, 1, len(pdf)-2, len(pdf)-1)
            frames = []
            for n in numbers:
                name = f'/sample/{kind}-{n+1}.jpg'
                frame = pdf[n].get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False)
                routes[name] = ('image/jpeg', frame.tobytes('jpeg'))
                frames.append(name)
            if kind in ('brief', 'deep', 'comprehensive', 'adjustment'):
                manifest[f'demo-html/finance-{kind}'] = frames
            else:
                manifest[f'demo/{"daily-news" if kind == "issue" else kind}'] = frames
                if kind == 'policy':
                    manifest['demo-html/policy'] = frames
    for file in ('/previews/pages/manifest.js', '/previews/pages/demo-html/manifest.js'):
        routes[file] = ('text/javascript', 'window.PREVIEW_PAGES='+json.dumps(manifest))
    return routes, manifest


def capture(directory, routes, manifest):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900},
                                      record_video_dir=directory, record_video_size={'width':1440,'height':900},
                                      reduced_motion='reduce', locale='ko-KR')
        page = context.new_page()
        video = page.video
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        stamp = '2026-11-18T09:00:00+09:00'
        groups = {}
        for key, (group, _) in BRIEFINGS.items():
            groups[group] = [
                dict(group=group, time=stamp, kind=kind, title=title, status='전송 확인', demo=False,
                     exact=kind=='text', link='/api/communication-item?id='+key+kind)
                for kind, title in [('text', '예시 문자'), ('file', '가상 PDF 시연')]
            ]

        def serve(route):
            url = urlsplit(route.request.url)
            if url.netloc != 'workroom-demo.test':
                route.abort()
                return
            if url.path in routes:
                content_type, body = routes[url.path]
                route.fulfill(content_type=content_type, body=body)
            elif url.path == '/api/communication-log':
                route.fulfill(json={'groups': groups})
            elif url.path == '/api/report-monitor':
                route.fulfill(json={'model_running':False, 'jobs':[], 'telegram':[]})
            elif url.path == '/api/communication-item':
                values = parse_qs(url.query)
                item = values['id'][0]
                key = 'issue' if item.startswith('issue') else 'policy'
                if item.endswith('text'):
                    route.fulfill(content_type='text/plain; charset=utf-8', body=BRIEFINGS[key][1])
                else:
                    images = manifest['demo/daily-news' if key == 'issue' else 'demo-html/policy']
                    preview = values.get('preview', ['info'])[0]
                    if preview == 'info':
                        route.fulfill(json={'pages': len(images)})
                    else:
                        route.fulfill(content_type='image/jpeg', body=routes[images[int(preview)-1]][1])
            else:
                route.fulfill(status=404, body='')

        context.route('**/*', serve)
        page.goto(ORIGIN + '/index.html?view=finance', wait_until='domcontentloaded')
        page.add_style_tag(content='''
          #film-caption,#film-marker{position:fixed;pointer-events:none;z-index:100000}
          #film-caption{bottom:10px;left:12px;background:#18232e;color:white;padding:8px 13px;
            border-radius:10px;font:700 15px/1.4 "Malgun Gothic",sans-serif}
          #film-marker{width:32px;height:32px;margin:-16px 0 0 -16px;border:3px solid #235fd9;
            box-shadow:0 0 0 2px white;border-radius:50%;display:none}
        ''')
        page.evaluate('''() => {
          const caption=document.createElement('div'); caption.id='film-caption';document.body.append(caption);
          const marker=document.createElement('div');marker.id='film-marker';document.body.append(marker);
          document.addEventListener('pointerdown',e=>{
            marker.style.left=e.clientX+'px';marker.style.top=e.clientY+'px';marker.style.display='block';
            clearTimeout(marker.turn);marker.turn=setTimeout(()=>marker.style.display='none',950);
          },true);
        }''')
        start = perf_counter()
        chapters = []
        dialog = page.get_by_role('dialog', name='데모 결과 크게 보기')
        menu = page.get_by_role('navigation',name='업무 메뉴')

        def caption(text):
            page.locator('#film-caption').evaluate('(element, text) => element.textContent=text', text)

        def show_output(region):
            first = region.get_by_role('img').first
            first.evaluate('(image) => image.decode()')
            page.wait_for_timeout(1600)
            first.click()
            picture = dialog.get_by_role('img')
            picture.evaluate('(image) => image.decode()')
            page.wait_for_timeout(1300)
            for _ in range(region.get_by_role('img').count()-1):
                dialog.get_by_role('button',name='다음 쪽').click()
                picture.evaluate('(image) => image.decode()')
                page.wait_for_timeout(1250)
            dialog.get_by_role('button',name='닫기').click()
            page.wait_for_timeout(450)

        caption('실제 업무 작업실 화면 · 공개용 가상 자료 · 8개 결과')
        page.wait_for_timeout(2000)
        for number, (name, menu_name, report_name, detail) in enumerate(SCENES, 1):
            chapters.append({'time': round(perf_counter()-start,1), 'title': name})
            caption(f'{number:02d} / 08  {name} · {detail}  |  가상 시연')
            menu.get_by_role('button',name=menu_name,exact=True).click()
            if report_name:
                page.get_by_role('group',name='보고서 유형').get_by_role('button',name=report_name).click()
                show_output(page.get_by_role('region',name=report_name+' 데모 결과 전체 페이지',exact=True))
            elif name in ('회의록정리','요약보고서'):
                show_output(page.get_by_role('region',name=name+' 데모버전_01 전체 페이지',exact=True))
                if name=='회의록정리':
                    page.get_by_role('button',name='데모버전_02',exact=True).click()
                    show_output(page.get_by_role('region',name=name+' 데모버전_02 전체 페이지',exact=True))
            else:
                page.locator('#telegram-sent-body a').first.wait_for()
                show_output(page.get_by_role('region',name='최종 발송 첨부 전체 페이지',exact=True))
            if number == 1:
                page.screenshot(path=str(OUTPUT/'poster.jpg'),type='jpeg',quality=90)
        caption('8개 업무 시연 완료 · 실제 화면 조작과 결과 확대')
        page.wait_for_timeout(1800)
        assert not errors, errors
        context.close()
        return Path(video.path()), chapters


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory() as folder:
        directory = Path(folder)
        video, chapters = capture(directory, *recording_routes(directory))
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(video),'-c:v','libx264',
                        '-crf','23','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',
                        str(OUTPUT/'workroom-demo.mp4')], check=True)
    (OUTPUT/'chapters.json').write_text(json.dumps(chapters,ensure_ascii=False),encoding='utf-8')
    print(OUTPUT)


if __name__ == '__main__':
    main()
