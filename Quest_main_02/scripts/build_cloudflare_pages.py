"""Stage the public demo, example PDFs and Cloudflare asset routing."""
import json
from pathlib import Path
from shutil import copyfile
from tempfile import mkdtemp
from zipfile import ZIP_DEFLATED, ZipFile

from app.public_demo import ROOT, demo_routes


def build():
    output = ROOT / 'output'
    output.mkdir(exist_ok=True)
    folder = Path(mkdtemp(prefix='cloudflare-pages-', dir=output))
    recording = output / 'public-walkthrough'
    media_files = {'workroom-demo.mp4':'workroom-demo.mp4', 'poster.jpg':'workroom-poster.jpg',
                   'chapters.json':'workroom-chapters.json'}
    has_recording = all((recording / name).is_file() for name in media_files)
    if has_recording:
        if (recording / 'workroom-demo.mp4').stat().st_size > 25 * 1024 * 1024:
            raise ValueError('Cloudflare Pages의 영상 파일 제한은 25 MiB입니다.')
        media = folder / 'media'
        media.mkdir()
        for source, target in media_files.items():
            copyfile(recording / source, media / target)
    for route, (_, content) in demo_routes().items():
        name = 'index.html' if route == '/' else 'api/demo.json' if route == '/api/demo' else route.lstrip('/')
        if route == '/api/demo' and has_recording:
            content = json.dumps({**json.loads(content), 'walkthrough': True}).encode('utf-8')
        destination = folder / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
    (folder / '_worker.js').write_bytes((ROOT / 'scripts' / 'cloudflare_demo_worker.mjs').read_bytes())
    (folder / '404.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><title>페이지 없음</title><p>페이지를 찾을 수 없습니다. <a href="/">데모로 돌아가기</a></p></html>', encoding='utf-8')
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
