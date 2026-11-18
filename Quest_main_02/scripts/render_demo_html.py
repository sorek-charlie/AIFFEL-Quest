"""데모자료 폴더의 HTML 보고서를 페이지 이미지로 렌더링해 웹 미리보기에 연결한다.

출력: web/previews/pages/demo-html/<key>/NN.jpg 와 같은 폴더의 manifest.js
(데모자료와 마찬가지로 git에 포함하지 않는다 — .gitignore의 web/previews/pages/demo-*/)
"""
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / '데모자료'
OUT = ROOT / 'web' / 'previews' / 'pages' / 'demo-html'
VERSION = __import__('time').strftime('%Y%m%d%H%M%S')  # 다시 렌더링하면 브라우저가 새 이미지를 받도록
SOURCES = {  # 미리보기 키: (데모자료 하위 폴더, 페이지 단위로 자를지)
    'finance-brief': ('01-1.간략보고서', True),
    'finance-deep': ('01-2.심층보고서', True),
    'finance-comprehensive': ('01-3.종합보고서', True),
    'finance-adjustment': ('01_4.세무조정계산서', True),
    'meeting': ('02.회의록정리', True),
    'document': ('03.요약보고서', True),
    'issue': ('04.Daily News', True),
    'policy': ('05.정부정책', False),
}
HIDE_FIXED = """()=>{for(const e of document.querySelectorAll('body *')){const p=getComputedStyle(e).position;
 if(p==='fixed'||p==='sticky')e.style.setProperty('display','none','important')}}"""
TOP_PAGES = "e=>!e.parentElement.closest('section, .slide, .page')"


def save_jpg(png: Path, dest: Path, width=1400):
    im = Image.open(png).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(dest, 'JPEG', quality=86, optimize=True)
    png.unlink()


H2_CUTS = """(minH) => { const hs = [...document.querySelectorAll('h2')];
 const box = (hs[0] && hs[0].parentElement || document.body).getBoundingClientRect();
 const top = y => y + scrollY, end = document.documentElement.scrollHeight;
 let cuts = [0, ...hs.map(h => Math.max(0, top(h.getBoundingClientRect().top) - 16)), end];
 const out = []; let start = cuts[0];
 for (let i = 1; i < cuts.length; i++) { if (cuts[i] - start >= minH || i === cuts.length - 1) { if (cuts[i] > start) out.push([start, cuts[i]]); start = cuts[i]; } }
 return { x: Math.max(0, box.left - 16), w: Math.min(innerWidth, box.width + 32), parts: out }; }"""


def split_by_headings(page, dest, min_height=700):
    """section/.page 구분이 없는 긴 HTML은 h2 제목 단위로 나눠 쪽 이미지로 만든다."""
    info = page.evaluate(H2_CUTS, min_height)
    if len(info['parts']) < 2:
        return []
    shots = []
    for i, (y0, y1) in enumerate(info['parts'], 1):
        png = dest / f'{i:02d}.png'
        page.screenshot(path=str(png), full_page=True, clip={'x': info['x'], 'y': y0, 'width': info['w'], 'height': y1 - y0})
        shots.append(png)
    return shots


def fresh_dir(key: str) -> Path:
    """Empty output folder for key. If old images are locked (e.g. written by another
    sandbox account and unreadable), use a new versioned folder instead of failing."""
    dest = OUT / key
    dest.mkdir(exist_ok=True)
    try:
        for old in dest.glob('*'):
            old.unlink()
        return dest
    except PermissionError:
        alt = OUT / f'{key}~{VERSION}'
        alt.mkdir(exist_ok=True)
        print('  기존 이미지가 잠겨 있어 새 폴더 사용:', alt.name)
        return alt


def render_pdf(pdf: Path, dest: Path, key: str, width=1400):
    import fitz
    dest = fresh_dir(key)
    names = []
    with fitz.open(pdf) as doc:
        for i, pg in enumerate(doc, 1):
            png = dest / f'{i:02d}.png'
            pg.get_pixmap(matrix=fitz.Matrix(width / pg.rect.width, width / pg.rect.width)).save(str(png))
            jpg = png.with_suffix('.jpg')
            save_jpg(png, jpg)
            names.append(f'previews/pages/demo-html/{dest.name}/{jpg.name}?v={VERSION}')
    return names


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 900}, device_scale_factor=1.5)
        for key, (folder, split) in SOURCES.items():
            files = sorted((DEMO / folder).glob('*.html'))
            if not files:
                pdfs = sorted((DEMO / folder).glob('*.pdf'))
                if pdfs and key == 'finance-adjustment':  # 세무조정계산서는 PDF 데모만 있어 각 쪽을 이미지로 사용
                    manifest['demo-html/' + key] = render_pdf(pdfs[0], OUT / key, key)
                    print(key, len(manifest['demo-html/' + key]), '장 ←', pdfs[0].name)
                else:
                    print('건너뜀(HTML 없음):', folder)
                continue
            dest = fresh_dir(key)
            page.goto(files[0].as_uri())
            page.wait_for_load_state('networkidle')
            page.evaluate(HIDE_FIXED)
            shots = []
            if split:
                tops = [e for e in page.locator('section, .slide, .page').all() if e.evaluate(TOP_PAGES)]
                for i, el in enumerate(tops, 1):
                    el.scroll_into_view_if_needed()
                    png = dest / f'{i:02d}.png'
                    el.screenshot(path=str(png))
                    shots.append(png)
            if split and not shots:
                shots = split_by_headings(page, dest)
            if not shots:
                png = dest / '01.png'
                page.screenshot(path=str(png), full_page=True)
                shots.append(png)
            names = []
            for png in shots:
                jpg = png.with_suffix('.jpg')
                save_jpg(png, jpg)
                names.append(f'previews/pages/demo-html/{dest.name}/{jpg.name}?v={VERSION}')
            manifest['demo-html/' + key] = names
            print(key, len(names), '장 ←', files[0].name)
        browser.close()
    (OUT / 'manifest.js').write_text(
        'window.PREVIEW_PAGES=Object.assign(window.PREVIEW_PAGES||{},'
        + json.dumps(manifest, ensure_ascii=False) + ');\n', encoding='utf-8')


if __name__ == '__main__':
    main()
