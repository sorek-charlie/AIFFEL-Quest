"""Refresh browser wrappers from public institution/reference configuration only."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
for stem,var in [('analysis_support','ANALYSIS_SUPPORT'),('acquisition_routes','ACQUISITION_ROUTES')]:
 p=root/'app/data'/f'{stem}.json';data=json.loads(p.read_text('utf8'))
 if stem=='acquisition_routes':assert all(not r['attached'] for r in data['routes'])
 (p.with_suffix('.js')).write_text('window.'+var+'='+json.dumps(data,ensure_ascii=False)+';','utf8')
print('Public browser configuration updated')
