"""Read-only localhost assignment viewer. No cloud upload or inference."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote,urlsplit
import mimetypes,re,json,shutil,uuid,threading
from concurrent.futures import ThreadPoolExecutor
from email.parser import BytesParser
from email.policy import default
from tools.render_video import render
ROOT=Path(__file__).resolve().parent
FILES={'index.html','demo.html','app.js','provider_ui.js','styles.css','video_tools.json','README.md','pose_tool.ipynb','prompts.md','dance_final_41s.mp4','submission_files.json','pose-image-tool_submission.zip','pose_inputs.zip','start_demo.cmd','launch_demo.py','demo_server.py'}
JOBS={};LOCK=threading.Lock();WORKER=ThreadPoolExecutor(max_workers=1)
def encode_job(job_id,clips,audio):
    with LOCK:JOBS[job_id]={'state':'running','message':'영상 정규화 · 클립 연결 · 음악 합성 중...'}
    try:
        render(clips,audio,ROOT/'renders'/job_id/'final_41s.mp4')
        with LOCK:JOBS[job_id]={'state':'done','message':'음악 포함 41초 MP4 저장 완료','url':f'renders/{job_id}/final_41s.mp4'}
    except Exception as exc:
        with LOCK:JOBS[job_id]={'state':'failed','message':str(exc)}
class Handler(SimpleHTTPRequestHandler):
    def json(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode('utf-8');self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def do_POST(self):
        if urlsplit(self.path).path!='/api/render':self.send_error(404);return
        origin=self.headers.get('Origin')
        if origin and origin not in ('http://127.0.0.1:8765','http://localhost:8765'):
            self.json(403,{'error':'다른 사이트에서 로컬 합성을 요청할 수 없습니다.'});return
        try:
            length=int(self.headers.get('Content-Length',0))
            if not 0<length<=200*1024*1024:raise ValueError('업로드 전체 크기는 200MB 이하여야 합니다.')
            content_type=self.headers.get('Content-Type','')
            if not content_type.startswith('multipart/form-data;'):raise ValueError('영상 파일을 선택하세요.')
            body=self.rfile.read(length)
            form=BytesParser(policy=default).parsebytes(('Content-Type: '+content_type+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+body)
            job_id=uuid.uuid4().hex;folder=ROOT/'renders'/job_id;folder.mkdir(parents=True)
            clips=[];audio=ROOT/'dance_final_41s.mp4'
            for part in form.iter_parts():
                name=part.get_param('name',header='content-disposition');filename=part.get_filename()
                if not filename or name not in ('clips','audio'):continue
                if name=='clips' and len(clips)>=12:raise ValueError('영상 클립은 최대 12개입니다.')
                ext=Path(filename).suffix.lower()
                if ext not in ('.mp4','.mov','.webm','.mkv','.mp3','.wav','.m4a','.aac','.ogg'):raise ValueError('지원하지 않는 파일 형식입니다.')
                dest=folder/(f'clip_{len(clips):02d}'+ext if name=='clips' else 'audio'+ext)
                dest.write_bytes(part.get_payload(decode=True))
                if name=='clips':clips.append(dest)
                else:audio=dest
            if not clips:raise ValueError('영상 클립을 한 개 이상 선택하세요.')
            with LOCK:JOBS[job_id]={'state':'queued','message':'편집 작업 대기 중...'}
            WORKER.submit(encode_job,job_id,clips,audio);self.json(202,{'id':job_id})
        except (ValueError,TypeError) as exc:self.json(400,{'error':str(exc)})
        except Exception as exc:self.json(500,{'error':str(exc)})
    def do_GET(self):
        route=urlsplit(self.path).path
        if route=='/api/capabilities':
            self.json(200,{'version':2,'assembly':bool(shutil.which('ffmpeg') and shutil.which('ffprobe'))});return
        if route.startswith('/api/jobs/'):
            with LOCK:data=JOBS.get(route.rsplit('/',1)[-1])
            self.json(200 if data else 404,data or {'error':'작업을 찾을 수 없습니다.'});return
        path=unquote(urlsplit(self.path).path).lstrip('/') or 'demo.html'
        target=(ROOT/path).resolve()
        if (path not in FILES and not path.startswith(('samples/','docs/','tools/','renders/'))) or not target.is_relative_to(ROOT) or not target.is_file():
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
