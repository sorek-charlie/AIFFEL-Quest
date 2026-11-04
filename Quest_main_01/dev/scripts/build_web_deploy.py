"""Stage only browser runtime and its public help pages for hosting."""
from pathlib import Path
import hashlib,json,shutil,subprocess,sys

ROOT=Path(__file__).resolve().parents[2]
subprocess.run([sys.executable,str(ROOT/'dev/scripts/build_demo_page.py')],check=True)
paths=[ROOT/'index.html']
paths.extend([ROOT/'demo/index.html',ROOT/'outputs/main-quest/video/main-quest-capture-introduction-1080p.mp4',ROOT/'outputs/main-quest/video/preview-presenter.png'])
paths.extend(p for p in (ROOT/'app').rglob('*') if p.is_file() and p.suffix in {'.html','.css','.js','.json','.txt'})
paths.extend(p for p in (ROOT/'docs').iterdir() if p.is_file() and p.suffix in {'.html','.txt'})
# A content-addressed directory prevents stale/private files from being deployed.
worker=ROOT/'dev/cloudflare/worker.mjs'
fingerprint=hashlib.sha256(b''.join(p.relative_to(ROOT).as_posix().encode()+p.read_bytes() for p in sorted(paths))+worker.read_bytes()).hexdigest()[:12]
OUT=ROOT/'dev/build'/('web-'+fingerprint)
expected={p.relative_to(ROOT).as_posix() for p in paths}|{'login.html','_worker.js'}
if OUT.exists():
 assert {p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file()}==expected,'Unexpected staged file; review before deploying'
for src in paths:
 dst=OUT/src.relative_to(ROOT);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
shutil.copyfile(ROOT/'app/login.html',OUT/'login.html')
shutil.copyfile(worker,OUT/'_worker.js')
manifest=[{'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
manifest.extend({'path':p,'sha256':hashlib.sha256((OUT/p).read_bytes()).hexdigest()} for p in ('login.html','_worker.js'))
(OUT.parent/'web-deployment-manifest.json').write_text(json.dumps({'directory':OUT.name,'files':manifest},ensure_ascii=False,indent=2),encoding='utf8')
config=ROOT/'wrangler.jsonc'
settings=json.loads(config.read_text('utf8'));settings['pages_build_output_dir']='./'+OUT.relative_to(ROOT).as_posix()
config.write_text(json.dumps(settings,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(str(OUT));print('Staged browser files:',len(paths))
