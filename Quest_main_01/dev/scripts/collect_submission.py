"""Copy reviewed program/submission assets without Git, credentials or build state."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,datetime
ROOT=Path(__file__).resolve().parents[2]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--destination',type=Path,required=True);p.add_argument('--private-literals',type=Path,required=True);a=p.parse_args()
 dest=a.destination.resolve();assert dest!=ROOT and not dest.is_relative_to(ROOT)
 dest.mkdir(parents=True,exist_ok=True)
 selected=[]
 selected.extend(x for x in ROOT.iterdir() if x.is_file() and (x.suffix in {'.md','.html','.jsonc','.exe'} or x.name in {'.gitignore','.gitattributes','.nojekyll'}))
 for name in ('app','docs','samples','dev','outputs/main-quest'):
  base=ROOT/name
  for path in base.rglob('*'):
   if not path.is_file():continue
   rel=path.relative_to(ROOT)
   if set(rel.parts)&{'__pycache__','node_modules','.git','.wrangler','.claude','.codex'}:continue
   if path.is_relative_to(ROOT/'dev/build') or path.suffix in {'.pyc','.tmp','.log'} or path.name.endswith('.inspect.ndjson'):continue
   selected.append(path)
 pairs={x.relative_to(ROOT).as_posix():x for x in selected if x.name!='AI영상제작.md'}
 patterns=[str(t).encode(enc) for t in json.loads(a.private_literals.read_text('utf8')) for enc in ('utf8','utf-16le') if t]
 records=[];stamp=datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
 for rel,src in sorted(pairs.items()):
  data=src.read_bytes();assert not any(t in data for t in patterns),'Private data detected: '+rel
  dst=dest/rel;assert dst.resolve().is_relative_to(dest)
  dst.parent.mkdir(parents=True,exist_ok=True)
  if dst.exists() and sha(src)!=sha(dst):
   previous=dest/'기존파일_보관'/stamp/rel;previous.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,previous)
  shutil.copy2(src,dst);assert sha(src)==sha(dst),rel
  records.append({'path':rel,'bytes':dst.stat().st_size,'sha256':sha(dst)})
 intro='''# 최종 프로그램·메인퀘스트 제출 자료

이 폴더에 프로그램·문서·가상 샘플·이미지·영상 자료를 모았습니다. 실제 회사자료·개인정보·인증서·로그인 토큰·Git 내부 이력·개발 임시파일은 포함하지 않습니다.

## 먼저 열 파일

| 목적 | 파일·경로 |
|---|---|
| 웹 프로그램 | https://tax-return-review-quest.pages.dev/ |
| GitHub 저장소 | https://github.com/sorek-charlie/tax-return-review-quest |
| 로컬 실행 | `경정청구.exe` 또는 `index.html` |
| 제출 보고서 | [제출보고서.md](제출보고서.md) |
| 요구사항·회고 | [PRD.md](PRD.md), [retrospective.md](retrospective.md) |
| 협업 기록·체크리스트 | [제출 안내](docs/submission/README.md) |
| 완성 소개 영상 | [2분50초 MP4](outputs/main-quest/video/main-quest-capture-introduction-1080p.mp4) |
| 영상 재생 오류 방지 | 루트의 ‘동영상 바로 재생.lnk’로 팟플레이어 실행 |
| 영상·자막·원고·검수 | `outputs/main-quest/video/` |
| 가상 XLSX·기타 첨부 | [샘플 안내](samples/README.md) |
| 씬별16:9 이미지10장 | [장면별 안내](docs/submission/storyboard/scenes-16x9/README.md) |
| 이미지 ZIP | `outputs/main-quest/scene-images-16x9.zip` |
| 개발·배포 소스 | `app/`, `dev/scripts/`, `dev/tests/`, `dev/cloudflare/`, `wrangler.jsonc` |

웹 로그인·회원가입은 Cloudflare 배포에서 제공하며 로컬 HTML·EXE는 오프라인 자료 처리 방식입니다. 동영상은 실제 앱 캡처와 AI 발표자를 합성한 소개 편집본입니다. 실제 클릭·대기 전체 녹화가 필요한 부분은 추가 촬영 목록을 확인하세요. 금액은 확정 환급액이 아닙니다.

## GitHub 업로드 전

이 폴더에는 `.git`을 복사하지 않았습니다. EXE·ZIP·실제 자료·인증서·브라우저 상태를 올리지 않도록 `.gitignore`를 유지하세요. 가상 XLSX는 명시한 한 파일만 예외입니다. GitHub 공개 저장소에는 이 요청으로 새로 업로드하지 않았습니다. 이름·회고의 본인 경험과 강좌의 영상 제출 조건을 확인한 뒤 제출하세요.

파일별 SHA-256은 `최종자료_파일목록.json`에 기록했습니다.
'''
 (dest/'00_제출자료안내.md').write_text(intro,encoding='utf8')
 for rel in ('00_제출자료안내.md',):
  path=dest/rel;records.append({'path':rel,'bytes':path.stat().st_size,'sha256':sha(path)})
 (dest/'최종자료_파일목록.json').write_text(json.dumps({'date':'2026-11-04','files':records},ensure_ascii=False,indent=2),encoding='utf8')
 bad=[]
 for file in dest.rglob('*.md'):
  for link in re.findall(r'\]\(([^)]+)\)',file.read_text('utf8')):
   if link.startswith(('https:','http:','#')):continue
   if not (file.parent/link.split('#')[0]).exists():bad.append(file.relative_to(dest).as_posix()+': '+link)
 print('COPIED',len(records),'files;',sum(x['bytes'] for x in records),'bytes')
 print('LINK_ISSUES',json.dumps(bad,ensure_ascii=True))
 if bad:raise SystemExit(2)
 print('PASS: file hashes, private-literal exclusion and Markdown links')
if __name__=='__main__':main()
