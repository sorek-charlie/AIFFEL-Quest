"""Read-only localhost assignment viewer. No cloud upload or inference."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote,urlsplit
import mimetypes,re
ROOT=Path(__file__).resolve().parent
FILES={'demo.html','README.md','pose_tool.ipynb','prompts.md','dance_final_41s.mp4','submission_files.json','pose-image-tool_submission.zip','pose_inputs.zip','start_demo.cmd','launch_demo.py','demo_server.py'}
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path=unquote(urlsplit(self.path).path).lstrip('/') or 'demo.html'
        target=(ROOT/path).resolve()
        if (path not in FILES and not path.startswith('samples/')) or not target.is_relative_to(ROOT) or not target.is_file():
            self.send_error(404);return
        size=target.stat().st_size;start=0;end=size-1
        m=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
        if m:start=int(m[1]);end=min(int(m[2]) if m[2] else end,end)
        if start>end:self.send_error(416);return
        self.send_response(206 if m else 200)
        self.send_header('Content-Type',mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
        self.send_header('Content-Length',str(end-start+1));self.send_header('Accept-Ranges','bytes');self.send_header('Cache-Control','no-cache')
        if m:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        try:
            with target.open('rb') as f:
                f.seek(start);remaining=end-start+1
                while remaining:
                    data=f.read(min(262144,remaining))
                    if not data:break
                    self.wfile.write(data);remaining-=len(data)
        except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,*args):pass
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
