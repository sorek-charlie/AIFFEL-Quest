"""데모버전 시연: 업무작업실.exe를 실행하고 8개 업무를 하나씩 클릭해 데모자료 결과를 보여 준다.

- 실제 EXE가 띄운 로컬 작업실(http://127.0.0.1:8765)을 Chrome 창에서 직접 조작한다.
- 결과 화면은 프로그램에 연결된 `데모자료` 미리보기(web/previews/pages)를 그대로 쓴다.
- 시연 중에는 텔레그램 발송 기록 요청만 빈 목록으로 돌려, Daily News·정부정책도 데모자료 결과가 보이게 한다.
- 유료 AI 호출, 파일 생성, 텔레그램 발송은 하지 않는다.

사용:
  .\\.venv\\Scripts\\python.exe -m scripts.exe_walkthrough            # 화면에서 시연
  .\\.venv\\Scripts\\python.exe -m scripts.exe_walkthrough --record   # 시연 + MP4 저장
"""
import argparse
import json
import subprocess
import time
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EXE = ROOT / 'dist' / '업무작업실.exe'
BASE = 'http://127.0.0.1:8765'
OUTPUT = ROOT / 'output' / 'exe-walkthrough'
# (화면 이름, 메뉴, 보고서 유형 버튼, 결과 영역 이름, 데모자료 폴더)
SCENES = [
    ('간략보고서', '재무분석', '간략보고서', '간략보고서 데모 결과 전체 페이지', '01-1.간략보고서'),
    ('심층보고서', '재무분석', '심층보고서', '심층보고서 데모 결과 전체 페이지', '01-2.심층보고서'),
    ('종합보고서', '재무분석', '종합보고서', '종합보고서 데모 결과 전체 페이지', '01-3.종합보고서'),
    ('세무조정계산서', '재무분석', '세무조정계산서', '세무조정계산서 데모 결과 전체 페이지', '01_4.세무조정계산서'),
    ('회의록정리', '회의록정리', '', '회의록정리 데모버전_01 전체 페이지', '02.회의록정리'),
    ('요약보고서', '요약보고서', '', '요약보고서 데모버전_01 전체 페이지', '03.요약보고서'),
    ('Daily News', '이슈 브리핑', '', '이슈 브리핑 데모 결과 전체 페이지', '04.Daily News'),
    ('정부정책', '정부정책(중소기업)', '', '정부정책(중소기업) 데모 결과 전체 페이지', '05.정부정책'),
]
OVERLAY_CSS = '''
#walk-caption,#walk-marker,#walk-badge{position:fixed;pointer-events:none;z-index:100000}
#walk-badge{top:10px;right:12px;background:#b42318;color:#fff;padding:5px 11px;border-radius:999px;
  font:700 13px/1.3 "Malgun Gothic",sans-serif}
#walk-caption{bottom:10px;left:12px;background:#18232e;color:#fff;padding:8px 13px;border-radius:10px;
  font:700 15px/1.4 "Malgun Gothic",sans-serif}
#walk-marker{width:32px;height:32px;margin:-16px 0 0 -16px;border:3px solid #235fd9;
  box-shadow:0 0 0 2px #fff;border-radius:50%;display:none}
'''
OVERLAY_JS = '''() => {
  if (document.getElementById('walk-caption')) return;
  for (const [id, text] of [['walk-caption',''],['walk-marker',''],['walk-badge','데모버전 · 데모자료 결과']]) {
    const e = document.createElement('div'); e.id = id; e.textContent = text; document.body.append(e);
  }
  document.addEventListener('pointerdown', ev => {
    const m = document.getElementById('walk-marker');
    m.style.left = ev.clientX + 'px'; m.style.top = ev.clientY + 'px'; m.style.display = 'block';
    clearTimeout(m.turn); m.turn = setTimeout(() => m.style.display = 'none', 950);
  }, true);
}'''


def server_up():
    try:
        with urlopen(BASE + '/api/health', timeout=1) as res:
            return json.load(res).get('service') == '업무작업실'
    except (OSError, ValueError):
        return False


def start_exe():
    """EXE가 이미 떠 있으면 그대로 쓰고, 아니면 실행한 뒤 서버가 열릴 때까지 기다린다."""
    if server_up():
        return
    if not EXE.is_file():
        raise SystemExit(f'{EXE} 가 없습니다. README의 Windows 설치·빌드 절차를 먼저 진행하세요.')
    print('업무작업실.exe 실행', flush=True)
    subprocess.Popen([str(EXE)], cwd=str(ROOT), creationflags=subprocess.CREATE_NEW_CONSOLE)
    for _ in range(60):
        if server_up():
            return
        time.sleep(.5)
    raise SystemExit('업무작업실 서버가 30초 안에 열리지 않았습니다.')


def walkthrough(page, pages_per_result, pause):
    def caption(text):
        page.evaluate(OVERLAY_JS)
        page.locator('#walk-caption').evaluate('(e, t) => e.textContent = t', text)

    def show_output(region):
        region.wait_for()
        first = region.get_by_role('img').first
        first.evaluate('(image) => image.complete || new Promise(r => image.onload = r)')
        region.scroll_into_view_if_needed()
        page.wait_for_timeout(int(1400 * pause))
        first.click()
        dialog = page.get_by_role('dialog', name='데모 결과 크게 보기')
        picture = dialog.get_by_role('img')
        picture.evaluate('(image) => image.decode()')
        page.wait_for_timeout(int(1300 * pause))
        total = region.get_by_role('img').count()
        for _ in range(min(total, pages_per_result) - 1):
            dialog.get_by_role('button', name='다음 쪽').click()
            picture.evaluate('(image) => image.decode()')
            page.wait_for_timeout(int(1200 * pause))
        dialog.get_by_role('button', name='닫기').click()
        page.wait_for_timeout(int(450 * pause))

    # EXE가 여는 첫 화면(홈)에서 시작해 재무분석 카드를 클릭한다.
    page.goto(BASE + '/', wait_until='domcontentloaded')
    page.add_style_tag(content=OVERLAY_CSS)
    caption('업무작업실.exe 실행 · 홈 화면  |  데모버전')
    page.wait_for_timeout(int(2200 * pause))
    page.locator('a.work-card[href*="view=finance"]').click()
    page.wait_for_load_state('domcontentloaded')
    page.add_style_tag(content=OVERLAY_CSS)
    menu = page.get_by_role('navigation', name='업무 메뉴')
    for number, (name, menu_name, report_type, region_name, folder) in enumerate(SCENES, 1):
        caption(f'{number:02d} / 08  {name}  ·  결과: 데모자료/{folder}')
        menu.get_by_role('button', name=menu_name, exact=True).click()
        page.wait_for_timeout(int(900 * pause))
        if report_type:
            page.get_by_role('group', name='보고서 유형').get_by_role('button', name=report_type).click()
            page.wait_for_timeout(int(600 * pause))
        show_output(page.get_by_role('region', name=region_name, exact=True))
        if name == '회의록정리':
            caption(f'{number:02d} / 08  회의록정리 · 데모버전_02 (회의록 정리본)  ·  결과: 데모자료/{folder}')
            page.get_by_role('button', name='데모버전_02', exact=True).click()
            show_output(page.get_by_role('region', name='회의록정리 데모버전_02 전체 페이지', exact=True))
    caption('8개 업무 시연 완료  |  데모버전 · 모든 결과는 데모자료 폴더의 예시 결과')
    page.wait_for_timeout(int(2500 * pause))


def run(record, pages_per_result, pause):
    start_exe()
    with sync_playwright() as pw, TemporaryDirectory() as folder:
        browser = pw.chromium.launch(channel='chrome', headless=False, args=['--window-size=1460,1000'])
        video = {'record_video_dir': folder, 'record_video_size': {'width': 1440, 'height': 900}} if record else {}
        context = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='ko-KR', **video)
        # 데모버전: 실제 발송 기록 대신 데모자료 결과가 보이도록 발송 기록만 빈 목록으로 응답
        context.route('**/api/communication-log', lambda route: route.fulfill(json={'groups': {}}))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        walkthrough(page, pages_per_result, pause)
        clip = page.video.path() if record else None
        context.close()
        browser.close()
        if clip:
            OUTPUT.mkdir(parents=True, exist_ok=True)
            target = OUTPUT / 'exe-walkthrough.mp4'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(clip), '-c:v', 'libx264', '-crf', '23',
                            '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)], check=True)
            print('녹화:', target)
    if errors:
        raise SystemExit('페이지 오류: ' + '; '.join(errors))
    print('PASS: EXE 홈 → 8개 업무 클릭 → 데모자료 결과 확대 보기')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--record', action='store_true', help='output/exe-walkthrough/exe-walkthrough.mp4로 저장')
    parser.add_argument('--pages', type=int, default=5, help='결과마다 넘겨 볼 최대 쪽 수 (기본 5)')
    parser.add_argument('--pause', type=float, default=1.0, help='화면 대기 배율 (느리게 보려면 1.5)')
    args = parser.parse_args()
    run(args.record, max(1, args.pages), max(.2, args.pause))


if __name__ == '__main__':
    main()
