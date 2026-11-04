"""Audit public files, Git objects and optionally the compiled application.

--private-literals accepts a PRIVATE external JSON list; never commit that list.
"""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[2]
PRIVATE_DIRS={'input','private','local-data','exports','backups','.claude','.codex','.wrangler','node_modules'}
PRIVATE_SUFFIXES={'.zip','.7z','.rar','.bundle','.pdf','.xlsx','.xls','.csv','.exe','.pfx','.p12','.key','.pem','.der'}
TEXT_SUFFIXES={'.html','.js','.cjs','.json','.md','.txt','.py','.cs','.css','.yml','.yaml'}
# Only this audited, independently invented fixture may be public XLSX.
# A replacement must be reviewed and its exact digest updated; suffix-wide
# exceptions would allow real customer workbooks back into the repository.
SYNTHETIC_WORKBOOKS={'outputs/main-quest/synthetic-tax-summary.xlsx':
 '079d2a7d7979cae31b276501a462e3aa00a78705df542addbbb300f57f3df14a'}
PUBLIC_RELEASE_ARTIFACTS={'경정청구.exe': '31aecba9d75f04e6b4806e12505bedf74f9f86c47c0ad75dad12e5d938b95b58', 'outputs/main-quest/scene-images-16x9.zip': '9101de54872fdeb6d56bc198e952ead38ecf62cb8bc56808752522bcc5e6dfba'}

def main():
 p=argparse.ArgumentParser();p.add_argument('--history',action='store_true');p.add_argument('--working-tree',action='store_true');p.add_argument('--private-literals',type=Path);p.add_argument('--bundle',type=Path);p.add_argument('--exe',type=Path);a=p.parse_args()
 literals=json.loads(a.private_literals.read_text('utf8')) if a.private_literals else []
 patterns=[str(x).encode(enc) for x in literals for enc in ('utf8','utf-16le') if x];violations=[]
 def scan(name,data):
  if name in PUBLIC_RELEASE_ARTIFACTS and hashlib.sha256(data).hexdigest()!=PUBLIC_RELEASE_ARTIFACTS[name]:violations.append(name+": release digest changed; review required")
  if name in SYNTHETIC_WORKBOOKS:
   if hashlib.sha256(data).hexdigest()!=SYNTHETIC_WORKBOOKS[name]:violations.append(name+': synthetic fixture digest changed; review required')
   with zipfile.ZipFile(__import__('io').BytesIO(data)) as z:
    for entry in z.infolist():
     content=z.read(entry)
     if any(t in content for t in patterns):violations.append(name+': private literal in workbook')
  if any(t in data for t in patterns):violations.append(name+': private literal')
  if Path(name).suffix.lower() in TEXT_SUFFIXES:
   s=data.decode('utf8',errors='replace')
   if re.search(r'(?<!\d)\d{6}-[1-8]\d{6}(?!\d)',s):violations.append(name+': resident identity')
 def prohibited(name):
  if name in SYNTHETIC_WORKBOOKS or name in PUBLIC_RELEASE_ARTIFACTS:return False
  path=Path(name)
  return bool(set(path.parts)&PRIVATE_DIRS) or path.suffix.lower() in PRIVATE_SUFFIXES or name.startswith(('dev/build/','app/reports/'))
 if a.working_tree:
  files=[p for p in ROOT.rglob('*') if p.is_file() and not any(part in {'.git','.claude','.wrangler','node_modules','__pycache__'} for part in p.relative_to(ROOT).parts) and not p.is_relative_to(ROOT/'dev/build')]
 else:
  names=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode('utf8').split('\0');files=[ROOT/n for n in names if n and (ROOT/n).is_file()]
 for f in files:
  name=f.relative_to(ROOT).as_posix()
  if not a.working_tree and prohibited(name):violations.append(name+': forbidden public artifact')
  scan(name,f.read_bytes())
 config=json.loads((ROOT/'app/data/acquisition_routes.json').read_text('utf8'))
 assert all(not r['attached'] for r in config['routes']), 'Bundled file attachments'
 assert not (ROOT/'app/data/analyzed_sources.json').exists(), 'Bundled company model'
 assert not (ROOT/'app/reports').exists(), 'Bundled company reports'
 if a.history:
  prefix=subprocess.check_output(['git','rev-parse','--show-prefix'],cwd=ROOT).decode('utf8').strip()
  entries=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=ROOT).decode('utf8').splitlines()
  for line in entries:
   oid,_,name=line.partition(' ')
   if prefix:
    if not name.startswith(prefix):continue
    name=name[len(prefix):]
   if name and prohibited(name):violations.append(name+': private historical path')
   scan(name or oid,subprocess.check_output(['git','cat-file','-p',oid],cwd=ROOT))
 if a.bundle:
  with zipfile.ZipFile(a.bundle) as z:
   for info in z.infolist():
    if info.is_dir():continue
    if info.filename.startswith(('input/','app/reports/')) or 'analyzed_sources' in info.filename:violations.append('bundle:'+info.filename)
    scan(info.filename,z.read(info))
  if a.exe:assert a.bundle.read_bytes() in a.exe.read_bytes(),'EXE does not embed the audited application bundle'
 if violations:raise SystemExit('\n'.join(violations))
 print('PASS: public files'+(', all Git objects' if a.history else '')+(', application bundle and executable' if a.exe else ''))
if __name__=='__main__':main()
