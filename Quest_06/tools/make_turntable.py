"""뷰어를 GPU 헤드리스 Chrome 으로 열어 한 바퀴 돌려 찍고 회전 GIF 를 만든다.

사용:
    python make_turntable.py <viewer_url> <out.gif> [프레임수=36] [폭=560] [높이=420]

GitHub README 는 자바스크립트를 실행하지 않으므로 3D 뷰어를 README 안에 넣을 수 없다.
대신 이 GIF 를 README 에 넣고, 누르면 Pages 의 뷰어(마우스 조작 가능)로 가게 한다.
"""
import base64
import io
import json
import math
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket
from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
url, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 36
W = int(sys.argv[4]) if len(sys.argv) > 4 else 560
H = int(sys.argv[5]) if len(sys.argv) > 5 else 420

_s = socket.socket(); _s.bind(("127.0.0.1", 0)); PORT = _s.getsockname()[1]; _s.close()
prof = tempfile.mkdtemp(prefix="cap-chrome-")
proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}",
                         f"--user-data-dir={prof}", "--ignore-gpu-blocklist", "--use-angle=d3d11",
                         "--enable-gpu", f"--window-size={W},{H}", "--hide-scrollbars", "about:blank"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
                        if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=120)
    mid = [0]

    def cmd(method, **params):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": method, "params": params}))
        while True:
            m = json.loads(ws.recv())
            if m.get("id") == mid[0]:
                if "error" in m:
                    raise RuntimeError(m["error"])
                return m.get("result", {})

    def ev(expr):
        return cmd("Runtime.evaluate", expression=expr, returnByValue=True,
                   awaitPromise=True)["result"].get("value")

    cmd("Page.enable")
    cmd("Page.navigate", url=url)
    for _ in range(300):
        if ev("!!(window.room3d && window.room3d.ready)"):
            break
        time.sleep(0.2)
    # 화면 위 안내판은 숨기고 장면만
    ev("""(() => { const s = document.createElement('style');
          s.textContent = '.panel{display:none!important}'; document.head.appendChild(s); })()""")
    ev("room3d.controls.autoRotate = false; room3d.controls.enableDamping = false; true")
    time.sleep(3)
    # 처음 시점의 거리·높이를 유지한 채 목표점 둘레를 돈다
    base = ev("""(() => { const c = room3d.camera.position, t = room3d.controls.target;
          return [c.x - t.x, c.y - t.y, c.z - t.z, t.x, t.y, t.z]; })()""")
    dx, dy, dz, tx, ty, tz = base
    ZOOM = 1.3                          # 바닥이 잘리지 않게 조금 물러남
    dx, dy, dz = dx * ZOOM, dy * ZOOM, dz * ZOOM
    r = math.hypot(dx, dz); a0 = math.atan2(dz, dx)
    frames = []
    for i in range(N):
        a = a0 + 2 * math.pi * i / N
        ev(f"room3d.camera.position.set({tx + r * math.cos(a)}, {ty + dy}, {tz + r * math.sin(a)});"
           f"room3d.camera.lookAt({tx}, {ty}, {tz}); room3d.controls.update(); true")
        time.sleep(0.6)                 # 정렬 워커가 새 시점으로 다시 정렬할 시간
        png = base64.b64decode(cmd("Page.captureScreenshot", format="png")["data"])
        frames.append(Image.open(io.BytesIO(png)).convert("RGB").resize((W, H)))
        print(f"\r{i + 1}/{N}", end="", flush=True)
    print()
    pal = [f.quantize(colors=128, method=Image.Quantize.MEDIANCUT) for f in frames]
    pal[0].save(out, save_all=True, append_images=pal[1:], duration=110, loop=0, optimize=True)
    print(f"썼습니다: {out}  {os.path.getsize(out) / 1e6:.2f}MB, {N}프레임")
finally:
    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
