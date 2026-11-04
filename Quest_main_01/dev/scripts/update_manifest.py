"""Validate canonical runtime and record release integrity hashes."""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[2]
page=ROOT/'app'/'index.html'
for rel in re.findall(r'(?:src|href|data-src)="([^"]+)"',page.read_text(encoding='utf8')):
    if not rel.startswith(('http:','https:','#')):
        assert (page.parent/rel.split('#')[0]).resolve().exists(),rel
paths=[ROOT/'index.html',ROOT/'README.md']
if (ROOT/'경정청구.exe').exists(): paths.append(ROOT/'경정청구.exe')
for directory in ['app','docs']:
    paths.extend(p for p in (ROOT/directory).rglob('*') if p.is_file())
manifest={'version':'2026-11-04-public-source','files':[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in sorted(paths)]}
(ROOT/'dev'/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('PASS: runtime links and',len(paths),'manifest entries')
