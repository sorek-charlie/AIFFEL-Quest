"""헤드리스 Chrome 으로 뷰어를 열어 알갱이가 그려질 때까지 기다린 뒤 갈무리한다.

사용:
    python capture_viewer.py <url> <out.png> [width height] [--mobile]

- 뷰어의 window.room3d.ready 가 true 가 될 때까지 기다린다 (첫 화면까지 시간 측정)
- 측정값(첫 화면 시간, 파일 받기 시간 등)을 <out>.json 으로 남긴다
"""
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
mobile = "--mobile" in sys.argv
url, out = args[0], args[1]
W = int(args[2]) if len(args) > 2 else 1400
H = int(args[3]) if len(args) > 3 else 860
import socket
_s = socket.socket(); _s.bind(("127.0.0.1", 0)); PORT = _s.getsockname()[1]; _s.close()

prof = tempfile.mkdtemp(prefix="cap-chrome-")
proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}",
                         f"--user-data-dir={prof}", "--enable-unsafe-swiftshader",
                         "--use-angle=swiftshader", "--ignore-gpu-blocklist",
                         f"--window-size={W},{H}", "--hide-scrollbars", "about:blank"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
            page = next(t for t in tabs if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180)
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

    cmd("Page.enable")
    cmd("Network.enable")
    cmd("Network.setCacheDisabled", cacheDisabled=True)
    if mobile:
        cmd("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=2, mobile=True)
    t0 = time.time()
    cmd("Page.navigate", url=url)
    ready = False
    for _ in range(600):           # 최대 120초
        r = cmd("Runtime.evaluate", expression="!!(window.room3d && window.room3d.ready)",
                returnByValue=True)
        if r["result"].get("value"):
            ready = True
            break
        time.sleep(0.2)
    wall = time.time() - t0
    LIT = """(() => { const c = document.getElementById('c'); const g = c.getContext('webgl2');
        const w = c.width, h = c.height, a = new Uint8Array(w * h * 4);
        g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, a);
        let n = 0; for (let i = 0; i < a.length; i += 16) if (a[i] + a[i+1] + a[i+2] > 90) n++;
        return n * 4; })()"""
    # 알갱이가 실제로 화면에 보일 때까지 (정렬 워커가 첫 결과를 낼 때까지)
    visible = None
    for _ in range(300):
        if (cmd("Runtime.evaluate", expression=LIT, returnByValue=True)["result"].get("value") or 0) > 5000:
            visible = round(time.time() - t0, 2)
            break
        time.sleep(1.0)
    js = os.environ.get("CAP_JS")
    if js:                         # 시점 바꾸기 등
        cmd("Runtime.evaluate", expression=js, awaitPromise=True)
    time.sleep(float(os.environ.get("CAP_WAIT", "4")))
    lit = cmd("Runtime.evaluate", expression=LIT, returnByValue=True)["result"].get("value")
    info = cmd("Runtime.evaluate", returnByValue=True, expression="""
      JSON.stringify({firstFrameMs: window.room3d?.firstFrameMs,
        results: window.room3d?.results,
        steps: [...document.querySelectorAll('#steps li')].map(l => l.className + ' ' + l.textContent),
        fix: document.getElementById('fix').textContent})""")["result"].get("value")
    shot = cmd("Page.captureScreenshot", format="png")
    with open(out, "wb") as f:
        f.write(base64.b64decode(shot["data"]))
    meta = json.loads(info) if info else {}
    meta.update(url=url, ready=ready, decoded_sec=round(wall, 2), visible_sec=visible,
                lit_pixels=lit, viewport=[W, H], mobile=mobile, cap_js=js)
    with open(os.path.splitext(out)[0] + ".json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(json.dumps(meta, ensure_ascii=False, indent=2))
finally:
    # Chrome 은 자식 프로세스가 많아 트리째 끈다
    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
