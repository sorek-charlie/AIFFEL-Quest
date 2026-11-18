"""Public demo origin. Serve only the demo page and generated example PDFs."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

from .finance_input import extract_files
from .finance_reports import make_brief, make_comprehensive, make_deep

ROOT = Path(__file__).resolve().parents[1]
BUILDERS = {'brief': make_brief, 'deep': make_deep, 'comprehensive': make_comprehensive}
LABELS = {'brief': '간략보고서', 'deep': '심층보고서', 'comprehensive': '종합보고서'}


def demo_routes():
    source = ROOT / 'examples' / 'finance-demo.csv'
    data = extract_files([(source.name, source.read_bytes())])
    if any(False in row['checks'].values() for row in data['rows']):
        raise ValueError('가상 예시 재무자료의 합계를 확인하세요.')
    data.update(company='예시전자', input_names=[source.name],
                warnings=['가상 시연 자료입니다.'])
    html = ('text/html; charset=utf-8', (ROOT / 'web' / 'demo.html').read_bytes())
    metadata = json.dumps({'mode': 'synthetic', 'reports': list(BUILDERS)}).encode('utf-8')
    routes = {'/': html, '/demo.html': html,
              '/api/demo': ('application/json; charset=utf-8', metadata)}
    with TemporaryDirectory() as folder:
        for kind, build in BUILDERS.items():
            pdf = Path(folder) / f'{kind}.pdf'
            build(data, pdf, title=f'예시전자 {LABELS[kind]} · 가상 데모')
            routes[f'/api/demo/{kind}.pdf'] = ('application/pdf', pdf.read_bytes())
    return routes


def make_handler(routes):
    class DemoHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.respond(include_body=True)

        def do_HEAD(self):
            self.respond(include_body=False)

        def respond(self, include_body):
            path = urlsplit(self.path).path
            item = routes.get(path)
            if item is None:
                self.send_error(404)
                return
            content_type, body = item
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Cache-Control', 'no-store')
            if content_type == 'application/pdf':
                self.send_header('Content-Disposition', f'attachment; filename="demo-{path.rsplit("/", 1)[-1]}"')
            self.end_headers()
            if include_body:
                self.wfile.write(body)

    return DemoHandler


if __name__ == '__main__':
    with ThreadingHTTPServer(('127.0.0.1', 8788), make_handler(demo_routes())) as server:
        print('공개 데모 백엔드 http://127.0.0.1:8788', flush=True)
        server.serve_forever()
