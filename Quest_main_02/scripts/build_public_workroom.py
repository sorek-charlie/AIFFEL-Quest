"""Stage the public demo as the same workroom screens the Windows program opens.

The public site serves web/landing.html (home) and web/index.html (workroom) unchanged, with no
extra overlay, plus a Cloudflare worker that answers the workroom APIs like scripts/exe_walkthrough.py:
the Telegram log is empty so every menu shows its 데모자료 result, exactly as in the recorded walkthrough.
Nothing here reads the operator's Telegram logs, secrets or real reports.
"""
import base64
import json
from pathlib import Path
from shutil import copyfile
from tempfile import TemporaryDirectory, mkdtemp
from unittest.mock import patch
from zipfile import ZIP_DEFLATED, ZipFile

import pymupdf

from app.public_demo import ROOT

STAMP = '2026-11-18'
DEMO_NOTE = 'AI 검토 의견은 공개 데모에서 생성하지 않았습니다.'
SAMPLE = ROOT / 'examples' / 'finance-demo.csv'
WALKTHROUGH = ROOT / 'docs' / 'assets' / 'workroom-walkthrough.mp4'
def _pages(pdf_bytes):
    with pymupdf.open(stream=pdf_bytes, filetype='pdf') as pdf:
        return [page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False).tobytes('jpeg') for page in pdf]


def _finance(folder):
    """Run the real finance pipeline on the public CSV with the paid AI call stubbed out."""
    from app import server
    prepared, _ = server.prepare_general_finance({'company': '예시전자', 'files': [
        {'name': SAMPLE.name, 'data': base64.b64encode(SAMPLE.read_bytes()).decode('ascii')}]})
    prepared['warnings'] = list(prepared.get('warnings') or []) + ['가상 시연 자료입니다.']
    events = []
    with patch.object(server, 'credential', lambda provider: None), \
         patch.object(server, 'generate', lambda *a, **k: DEMO_NOTE), \
         patch.object(server, 'recall', lambda ticket, review: (prepared, 'demo')), \
         patch.object(server, 'publish', lambda *a, **k: None):
        result = server.generate_finance(
            {'review_ticket': 'demo', 'review_id': 'demo', 'provider': 'openai'},
            lambda percent, stage: events.append({'type': 'progress', 'percent': percent, 'stage': stage}))
    result.pop('delivery', None)
    result['notice'] += ' · 공개 데모(텔레그램 미전송)'
    events += [{'type': 'ready', 'percent': 90, 'data': result}, {'type': 'complete', 'percent': 100, 'data': {}}]
    (folder / 'finance-stream.ndjson').write_text(
        ''.join(json.dumps(e, ensure_ascii=False) + '\n' for e in events), encoding='utf-8')
    (folder / 'finance-prepare.json').write_text(
        json.dumps({'data': prepared, 'review_id': 'demo', 'review_ticket': 'demo'}, ensure_ascii=False), encoding='utf-8')


def _records(folder, site):
    items_dir = folder / 'items'
    items_dir.mkdir()
    news_bytes, news_text = _news_from_demo()
    policy_bytes, policy_pages = _policy_from_demo(site)
    texts = {
        'cmdbrief': '예시전자 간략보고서 만들어 줘',
        'cmdissue': '지금 이 시각 기준으로 이슈브리핑 해줘',
        'cmdmeeting': '첨부한 가상 회의 녹음으로 회의록 정리해 줘',
        'repbrief': '예시전자 간략보고서 생성 완료 · 가상 CSV 검산 일치',
        'repmeeting': '회의록정리 완료 · 결정 사항 2건, 후속 작업 1건 (가상 회의)',
        'newstext': news_text,
        'policytext': '[정부정책 주간보고] 2026-11-17 기준 · 데모자료\n서울·경기·전국 중소기업 지원사업 주간 보고 PDF를 함께 보냈습니다.',
    }
    files = {'newspdf': news_bytes, 'policypdf': policy_bytes}
    for key, text in texts.items():
        (items_dir / f'{key}.txt').write_text(text, encoding='utf-8')
    for key, data in files.items():
        (items_dir / f'{key}.pdf').write_bytes(data)
        pages = policy_pages if key == 'policypdf' else _pages(data)
        (items_dir / f'{key}-info.json').write_text(json.dumps({'pages': len(pages)}), encoding='utf-8')
        for n, jpg in enumerate(pages, 1):
            (items_dir / f'{key}-{n}.jpg').write_bytes(jpg)

    def item(key, group, title, time, kind):
        return {'id': key, 'group': group, 'title': title, 'status': '전송 확인' if group in ('Daily News', '정부정책', '분석결과 보고') else '수신 확인',
                'demo': False, 'exact': kind == 'text', 'time': f'{STAMP}T{time}+09:00',
                'link': f'/api/communication-item?id={key}', 'kind': kind}
    rows = [
        item('cmdmeeting', '지시접수', '지시 · ' + texts['cmdmeeting'], '14:20', 'text'),
        item('repmeeting', '분석결과 보고', '비서 응답 · ' + texts['repmeeting'], '14:23', 'text'),
        item('cmdbrief', '지시접수', '지시 · ' + texts['cmdbrief'], '11:05', 'text'),
        item('repbrief', '분석결과 보고', '비서 응답 · ' + texts['repbrief'], '11:06', 'text'),
        item('cmdissue', '지시접수', '지시 · ' + texts['cmdissue'], '09:30', 'text'),
        item('policypdf', '정부정책', '정부정책 PDF', '09:01', 'file'),
        item('policytext', '정부정책', '정부정책 메시지', '09:01', 'text'),
        item('newspdf', 'Daily News', 'Daily News PDF', '09:00', 'file'),
        item('newstext', 'Daily News', 'Daily News 메시지', '09:00', 'text'),
    ]
    groups = {g: [r for r in rows if r['group'] == g] for g in ('지시접수', '분석결과 보고', 'Daily News', '정부정책')}
    hours = {}
    for r in rows:
        hours.setdefault(r['time'][11:13] + ':00', []).append(r)
    log = {'as_of': f'{STAMP}T15:00+09:00', 'source': '공개 데모 · 가상 기록', 'total': len(rows), 'today_total': len(rows),
           'latest': rows[0], 'groups': groups,
           'days': [{'date': STAMP, 'hours': [{'hour': h, 'items': v} for h, v in sorted(hours.items(), reverse=True)]}]}
    (folder / 'communication-log.json').write_text(json.dumps(log, ensure_ascii=False), encoding='utf-8')
    monitor = {
        'issue': [('issue-collection', '뉴스 수집 완료', '08:58'), ('issue', '보고 완료', '09:00')],
        'policy': [('policy-collection', '수집 완료', '08:31'), ('policy-report', '보고 완료', '09:01')],
    }
    events = {'issue': [('Daily News 메시지', '09:00'), ('Daily News PDF', '09:00')],
              'policy': [('정부정책 메시지', '09:01'), ('정부정책 PDF', '09:01')]}
    for kind, jobs in monitor.items():
        body = {'kind': kind, 'model_running': False, 'checked_at': f'{STAMP}T15:00:00+09:00',
                'jobs': [{'task': t, 'stage': s, 'percent': 100, 'status': 'complete', 'updated_at': f'{STAMP}T{h}:00+09:00'} for t, s, h in jobs],
                'telegram': [{'time': f'{STAMP}T{h}:00+09:00', 'event': e, 'status': 'sent'} for e, h in reversed(events[kind])]}
        (folder / f'report-monitor-{kind}.json').write_text(json.dumps(body, ensure_ascii=False), encoding='utf-8')


def _previews(folder):
    """실행파일과 같은 데모 결과(데모자료)를 쓴다. 잠긴 이미지는 데모자료 HTML에서 새로 렌더링한다."""
    source = ROOT / 'web' / 'previews'
    for path in source.rglob('*'):
        rel = path.relative_to(source)
        if not path.is_file() or rel.parts[:2] == ('pages', 'demo-html'):
            continue
        destination = folder / 'previews' / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            destination.write_bytes(path.read_bytes())
        except PermissionError as exc:
            raise ValueError(f'데모 미리보기 파일을 읽을 수 없습니다: {rel}') from exc
    from scripts import render_demo_html
    render_demo_html.OUT = folder / 'previews' / 'pages' / 'demo-html'
    render_demo_html.main()


def _news_from_demo():
    """데모자료 Daily News PDF의 오늘의 한 줄과 기사 요약 제목을 문자 본문으로 만든다."""
    import re
    pdf = ROOT / '데모자료' / '04.Daily News' / 'Daily News_261117.pdf'
    with pymupdf.open(pdf) as doc:
        text = '\n'.join(page.get_text() for page in doc)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    titles, category = [], ''
    for i, line in enumerate(lines[:-1]):
        head = re.match(r'^(AI|경제|정치|사회|기술|주식) · \d+건$', line)
        if head:
            category = head.group(1)
        elif category and re.fullmatch(r'\d{1,2}', line) and ' — ' in lines[i + 1]:
            titles.append((category, lines[i + 1].split(' — ')[0]))
    body = ['[Daily News] 2026-11-17 기준 · 데모자료']
    for category in dict.fromkeys(c for c, _ in titles):
        body += ['', '■ ' + category, *[t for c, t in titles if c == category][:2]]
    return pdf.read_bytes(), '\n'.join(body)


def _policy_from_demo(folder):
    """데모자료 정부정책 주간보고 HTML을 렌더링한 쪽 이미지로 첨부 PDF를 만든다."""
    from PIL import Image as PILImage
    pages = sorted((folder / 'previews' / 'pages' / 'demo-html').glob('policy*/*.jpg'))
    if not pages:
        raise ValueError('데모자료 정부정책 미리보기를 만들지 못했습니다.')
    images = [PILImage.open(p).convert('RGB') for p in pages]
    from io import BytesIO
    buffer = BytesIO()
    images[0].save(buffer, 'PDF', save_all=True, append_images=images[1:], resolution=150)
    return buffer.getvalue(), [p.read_bytes() for p in pages]


def build():
    output = ROOT / 'output'
    folder = Path(mkdtemp(prefix='public-workroom-', dir=output))
    web = ROOT / 'web'
    for name in ('app.js', 'motion.js', 'styles.css', 'playful.css'):
        copyfile(web / name, folder / name)
    for name in ('index.html', 'landing.html'):
        copyfile(web / name, folder / name)
    if WALKTHROUGH.is_file():
        (folder / 'media').mkdir()
        copyfile(WALKTHROUGH, folder / 'media' / 'workroom-walkthrough.mp4')
    (folder / 'examples').mkdir()
    copyfile(SAMPLE, folder / 'examples' / SAMPLE.name)
    _previews(folder)
    with TemporaryDirectory() as scratch:
        api = folder / 'demo-api'
        api.mkdir()
        _finance(api)
        _records(api, folder)
    worker = (ROOT / 'scripts' / 'cloudflare_demo_worker.mjs').read_text(encoding='utf-8')
    worker = worker[:worker.index('export default')]
    worker += (ROOT / 'scripts' / 'public_workroom_worker.mjs').read_text(encoding='utf-8')
    (folder / '_worker.js').write_text(worker, encoding='utf-8')
    (folder / '404.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><title>페이지 없음</title>'
                                     '<p>페이지를 찾을 수 없습니다. <a href="/">업무 작업실로 돌아가기</a></p></html>', encoding='utf-8')
    for path in folder.rglob('*'):
        if path.is_file() and path.stat().st_size > 25 * 1024 * 1024:
            raise ValueError(f'Cloudflare Pages 파일 제한(25 MiB)을 넘었습니다: {path.name}')
    archive = folder.with_suffix('.zip')
    with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as file:
        for path in sorted(folder.rglob('*')):
            if path.is_file():
                file.write(path, path.relative_to(folder).as_posix())
    return folder, archive


if __name__ == '__main__':
    folder, archive = build()
    print(folder)
    print(archive)
