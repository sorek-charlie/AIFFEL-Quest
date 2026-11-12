"""Integration checks for the notebook, provider config, package and real mux API."""
from pathlib import Path
import argparse,ast,json,time,urllib.request,zipfile,subprocess,uuid
ROOT=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8765/');p.add_argument('--render',action='store_true');a=p.parse_args()
nb=json.loads((ROOT/'pose_tool.ipynb').read_text(encoding='utf-8'))
assert nb['cells'][-1]['cell_type']=='markdown'
for c in nb['cells']:
    if c['cell_type']=='code':ast.parse(''.join(c['source']))
providers=json.loads((ROOT/'video_tools.json').read_text(encoding='utf-8'))
assert {p['id'] for p in providers}=={'meta','krea','dola','tiktok','higgsfield'}
for p in providers:assert p['url'].startswith('https://') and p['steps']
with zipfile.ZipFile(ROOT/'pose-image-tool_submission.zip') as z:
    assert z.testzip() is None
    assert not any('/source_media/' in s or '/work/' in s or '/renders/' in s for s in z.namelist())
for item in json.loads((ROOT/'submission_files.json').read_text(encoding='utf-8')):
    assert (ROOT/item['path']).is_file(),item
    with urllib.request.urlopen(a.url+item['path']) as r:assert r.status==200;r.read(32)
if a.render:
    fixture=ROOT/'renders/verify_source.mp4';fixture.parent.mkdir(exist_ok=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(ROOT/'dance_final_41s.mp4'),'-t','1','-an','-c:v','copy',str(fixture)],check=True)
    boundary='test_'+uuid.uuid4().hex
    body=(f'--{boundary}\r\nContent-Disposition: form-data; name="clips"; filename="test.mp4"\r\nContent-Type: video/mp4\r\n\r\n').encode()+fixture.read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
    req=urllib.request.Request(a.url+'api/render',data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary,'Origin':a.url.rstrip('/')})
    job=json.load(urllib.request.urlopen(req))
    for _ in range(90):
        state=json.load(urllib.request.urlopen(a.url+'api/jobs/'+job['id']))
        if state['state']=='failed':raise RuntimeError(state['message'])
        if state['state']=='done':break
        time.sleep(1)
    assert state['state']=='done',state
    from tools.render_video import probe
    result=probe(ROOT/state['url'])
    assert abs(float(result['format']['duration'])-41)<.1
    assert any(s['codec_type']=='audio' for s in result['streams'])
    print('RENDER_PASS',state['url'])
print('PASS: notebook code, 5 providers, package, all artifact links')
