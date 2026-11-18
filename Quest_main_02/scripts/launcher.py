"""Windows executable entry point for this workspace's local application."""
import os
import subprocess
import sys
import threading
import time
import webbrowser
import json
from pathlib import Path
from urllib.request import urlopen

def locate_root():
    start = Path(sys.executable if getattr(sys, 'frozen', False) else __file__).resolve().parent
    for candidate in (start, *start.parents):
        if (candidate / 'app' / 'server.py').is_file() and (candidate / '.venv' / 'Scripts' / 'python.exe').is_file():
            return candidate
    raise RuntimeError('프로젝트 폴더와 .venv를 찾지 못했습니다. 실행 파일을 프로젝트 내부에 두세요.')

def open_when_ready(proc):
    for _ in range(60):
        if proc.poll() is not None:
            return
        try:
            with urlopen('http://127.0.0.1:8765/api/health', timeout=.5) as res:
                if b'api_version' in res.read():
                    webbrowser.open('http://127.0.0.1:8765/')
                    return
        except OSError:
            time.sleep(.5)

def main():
    try:
        root = locate_root()
        try:
            with urlopen('http://127.0.0.1:8765/api/health',timeout=1) as response:
                existing=json.load(response)
                if existing.get('service')=='업무작업실':
                    if existing.get('api_version',0)<6:
                        raise RuntimeError('이전 업무 작업실이 실행 중입니다. 기존 실행 창을 종료하고 다시 시작하세요.')
                    webbrowser.open('http://127.0.0.1:8765/')
                    return 0
        except (OSError,ValueError):
            pass
        print('업무 작업실을 시작합니다. 종료하려면 이 창에서 Ctrl+C를 누르세요.', flush=True)
        proc = subprocess.Popen([str(root / '.venv' / 'Scripts' / 'python.exe'), '-m', 'app.server'], cwd=str(root), env=os.environ.copy())
        threading.Thread(target=open_when_ready, args=(proc,), daemon=True).start()
        try:
            return proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
            proc.wait(timeout=5)
            return 0
    except (OSError, RuntimeError) as exc:
        print(str(exc), flush=True)
        if sys.stdin and sys.stdin.isatty():
            input('Enter를 눌러 종료하세요.')
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
