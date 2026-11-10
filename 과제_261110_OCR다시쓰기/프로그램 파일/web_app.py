"""Local web interface: input image on the left, extracted output on the right."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs, unquote
import argparse
import contextlib
import csv
import io
import json
import threading
import traceback
import webbrowser
import re
import upload_ocr

import extract_layout
import reconstruct_table

ROOT = Path(__file__).resolve().parent
ASSIGNMENT = ROOT.parent
OUTPUT = ASSIGNMENT / '참고자료/outputs'
LOCK = threading.Lock()
FILES = {
    '/': (ROOT / 'web/index.html', 'text/html; charset=utf-8'),
    '/files/input.png': (ROOT / 'input/census-table.png', 'image/png'),
    '/files/regions.png': (OUTPUT / 'layout/layout_regions.png', 'image/png'),
    '/files/auto.csv': (OUTPUT / 'layout/table_001.csv', 'text/csv; charset=utf-8'),
    '/files/reviewed.csv': (OUTPUT / 'ocr/table.csv', 'text/csv; charset=utf-8'),
    '/files/text.txt': (OUTPUT / 'layout/text.txt', 'text/plain; charset=utf-8'),
    '/files/layout.json': (OUTPUT / 'layout/layout.json', 'application/json; charset=utf-8'),
    '/files/report.pdf': (ASSIGNMENT / 'OCR_Assignment_Report.pdf', 'application/pdf'),
}


def results():
    layout = json.loads((OUTPUT / 'layout/layout.json').read_text(encoding='utf-8'))
    with (OUTPUT / 'ocr/table.csv').open(encoding='utf-8-sig', newline='') as file:
        corrected = list(csv.reader(file))
    return {'table': layout['tables'][0], 'text_blocks': layout['text_blocks'],
            'corrected': {'headers': corrected[0], 'rows': corrected[1:]},
            'raw_text': (OUTPUT / 'ocr/raw_text.txt').read_text(encoding='utf-8'),
            'scope': '포함된 이미지와 기존 OCR 좌표를 사용합니다. 새 OCR 모델 추론은 별도 Python 코드로 실행합니다.'}


class Handler(BaseHTTPRequestHandler):
    def send(self, status, content, content_type):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(content)

    def json(self, status, data):
        self.send(status, json.dumps(data, ensure_ascii=False).encode('utf-8'), 'application/json; charset=utf-8')

    def do_GET(self):
        route = urlsplit(self.path).path
        if route == '/api/results':
            try:
                with LOCK:
                    self.json(200, results())
            except Exception as error:
                self.json(500, {'error': str(error)})
        elif route == '/api/job':
            try:
                identifier = parse_qs(urlsplit(self.path).query).get('id', [''])[0]
                self.json(200, upload_ocr.public(upload_ocr.get(identifier)))
            except ValueError as error:
                self.json(404, {'error': str(error)})
        elif route.startswith('/uploads/'):
            try:
                match = re.fullmatch(r'/uploads/([a-f0-9]{32})/(page|regions|text|tables|result)-(\d+)\.(png|txt|csv|json)', route)
                if not match:
                    raise ValueError('파일 경로가 잘못되었습니다.')
                identifier, kind, number, extension = match.groups()
                job = upload_ocr.get(identifier)
                if kind == 'page' and extension == 'png':
                    path = upload_ocr.render_page(job, int(number))
                else:
                    path = job['folder'] / f'{kind}-{int(number)}.{extension}'
                mime = {'png':'image/png','txt':'text/plain; charset=utf-8','csv':'text/csv; charset=utf-8','json':'application/json; charset=utf-8'}[extension]
                self.send(200, path.read_bytes(), mime)
            except (ValueError, FileNotFoundError) as error:
                self.json(404, {'error': str(error)})
        elif route in FILES:
            path, mime = FILES[route]
            if path.is_file():
                self.send(200, path.read_bytes(), mime)
            else:
                self.json(404, {'error': '파일이 없습니다. 먼저 추출을 실행하세요.'})
        elif route == '/favicon.ico':
            self.send(204, b'', 'image/x-icon')
        else:
            self.json(404, {'error': 'Not found'})

    def do_POST(self):
        route = urlsplit(self.path).path
        origin = self.headers.get('Origin')
        expected = f'http://127.0.0.1:{self.server.server_port}'
        if origin and origin not in (expected, f'http://localhost:{self.server.server_port}'):
            self.json(403, {'error': 'Local origin required'})
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size < 0 or size > 30 * 1024 * 1024:
                self.json(413, {'error': '파일은 30MB 이하로 업로드하세요.'})
                return
            content = self.rfile.read(size)
            if route == '/api/upload':
                if not content:
                    raise ValueError('업로드할 파일을 선택하세요.')
                name = unquote(self.headers.get('X-Filename', 'upload'))
                self.json(200, upload_ocr.register(content, name))
                return
            if route == '/api/start':
                data = json.loads(content)
                self.json(200, upload_ocr.start(data['id'], data.get('language', 'kor+eng')))
                return
            if route != '/api/process':
                self.json(404, {'error': 'Not found'})
                return
            if not LOCK.acquire(blocking=False):
                self.json(409, {'error': '이미 처리 중입니다.'})
                return
            try:
                log = io.StringIO()
                with contextlib.redirect_stdout(log):
                    extract_layout.main(ROOT)
                    reconstruct_table.main(ROOT)
                data = results()
                data['log'] = log.getvalue()
                self.json(200, data)
            finally:
                LOCK.release()
        except Exception as error:
            traceback.print_exc()
            self.json(400, {'error': str(error)})


def main():
    parser = argparse.ArgumentParser(description='OCR 웹 실행 - 왼쪽 INPUT / 오른쪽 OUTPUT')
    parser.add_argument('--port', type=int, default=8501)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://127.0.0.1:{server.server_port}'
    print(f'OCR web app: {url}', flush=True)
    if not args.no_browser:
        threading.Timer(.5, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
