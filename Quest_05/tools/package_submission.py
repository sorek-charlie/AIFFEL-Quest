"""Package canonical sources only; never overwrite README or notebook content."""
from pathlib import Path
import json,zipfile
ROOT=Path(__file__).resolve().parent.parent
top=['index.html','demo.html','styles.css','app.js','provider_ui.js','video_tools.json','README.md','pose_tool.ipynb','prompts.md','dance_final_41s.mp4','start_demo.cmd','launch_demo.py','demo_server.py','.gitignore']
(ROOT/'samples/README.md').write_text('# 실제 예시·실행 증거\n\n'+ '\n'.join(f'- [{p.name}]({p.name})' for p in sorted((ROOT/'samples').iterdir()) if p.is_file() and p.name!='README.md')+'\n\n이미지 실험은 Colab OpenPose/ControlNet의 실제 결과이며, LED 시간표와 기존 영상은 추가 데모 자료입니다.\n',encoding='utf-8')
paths=[ROOT/p for p in top]
for folder in ['samples','docs','tools']:
    paths += [p for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ('.pyc',) and p.name not in ('refactor_ui.py','cleanup_project.ps1','update_project.py')]
with zipfile.ZipFile(ROOT/'pose_inputs.zip','w',zipfile.ZIP_DEFLATED) as z:
    for n in ['pose_01.png','pose_02.png']:z.write(ROOT/'samples'/n,'samples/'+n)
paths.append(ROOT/'pose_inputs.zip')
labels={'README.md':'사용법 · 전체 구조','pose_tool.ipynb':'Colab 이미지 생성 노트','prompts.md':'이미지·영상 프롬프트','dance_final_41s.mp4':'41초 음악 포함 기존 데모','video_tools.json':'영상 제작 도구 설정','docs/video_tools.md':'무료 도구별 사용법','start_demo.cmd':'PC 로컬 실행 · ZIP 압축 해제 후 사용','pose_inputs.zip':'Colab 포즈 입력 ZIP'}
items=[{'path':p.relative_to(ROOT).as_posix(),'label':labels.get(p.relative_to(ROOT).as_posix(),p.relative_to(ROOT).as_posix())} for p in paths if not p.name.startswith(('.','_'))]
items.append({'path':'pose-image-tool_submission.zip','label':'전체 실행·제출 준비 ZIP'})
(ROOT/'submission_files.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf-8')
paths.append(ROOT/'submission_files.json')
with zipfile.ZipFile(ROOT/'pose-image-tool_submission.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in paths:z.write(p,'pose-image-tool/'+p.relative_to(ROOT).as_posix())
print('PACKAGED',len(paths),'files; raw media, renders, work and Git clone excluded')
