"""Open local demo with standard Python; no extra packages required."""
from pathlib import Path
import socket,subprocess,sys,time,urllib.request,webbrowser
ROOT=Path(__file__).resolve().parent
def ready():
    try:
        with urllib.request.urlopen('http://127.0.0.1:8765/submission_files.json',timeout=1) as r:return r.status==200
    except Exception:return False
if not ready():
    with socket.socket() as s:
        try:s.bind(('127.0.0.1',8765))
        except OSError:raise SystemExit('Port 8765 is occupied by another application.')
    subprocess.Popen([sys.executable,str(ROOT/'demo_server.py')],cwd=ROOT,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0),stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(30):
        if ready():break
        time.sleep(.2)
webbrowser.open('http://127.0.0.1:8765/demo.html')
