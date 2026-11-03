# Google 자료 동기화·누락 보충 스킬

실제로 반복하던 Gmail·Google 캘린더 조회를 PC 앱의 자동 보충 기능과 연결한 Codex 스킬입니다.

## 불편 → 해결

Gmail·Google 캘린더의 새 자료를 가져오라고 반복해서 요청했습니다. 매일08·12·18·24시 조회만으로는 노트북·앱이 꺼지거나 절전·인터넷 단절이 있었을 때 자료를 놓쳤습니다.

이제 Windows 로그인 직후 앱이 자동 시작하며, 앱이 서비스별 마지막 성공을 확인하고 놓친 조회를 현재까지 한 번 보충합니다. 실행 중에는15초마다 누락을 재확인합니다. 스킬은 이 앱 기능을 한 문장으로 실행·점검해 줍니다. 정시 실행은 프로그램, 실행 방법·결과 판단은 SKILL.md가 담당합니다.

## 파일·제출 링크

- [SKILL.md](./SKILL.md): 사용 조건·점검 절차
- [VALIDATION.md](./VALIDATION.md): 실제 앱·자동 테스트·새 대화 검증 결과
- [Quest_03 프로그램](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_03)
- **[Quest_04 제출 링크](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_04)**

[스킬 HTML](./SKILL.html) · [README HTML](./README.html) · [검증 HTML](./VALIDATION.html)은 같은 내용의 브라우저용 문서입니다. GitHub에서 HTML이 코드로 보이면 Markdown을 읽거나 HTML을 내려받아 브라우저로 여세요.

## 설치

적용 대상은 Charlie’s Scheduler 소스 프로젝트입니다. Node.js24.22.1 이상, 로컬 실행파일과 PC 앱에서 이미 연결한 Google 계정이 필요합니다. GitHub 업로드만으로 설치되지는 않습니다.

Quest_04 폴더에서 아래 PowerShell 명령을 실행합니다. 대상 경로는 본인의 프로젝트 위치로 바꿉니다.

```powershell
$targetProject = 'D:\AI_Agent\숙제\Quest_03'
$skillDirectory = Join-Path $targetProject '.agents\skills\google-sync-recovery'
New-Item -ItemType Directory -Force -Path $skillDirectory | Out-Null
Copy-Item -LiteralPath '.\SKILL.md' -Destination (Join-Path $skillDirectory 'SKILL.md')
```

현재 설치 위치는 `Quest_03/.agents/skills/google-sync-recovery/SKILL.md`입니다. 다른 AI 도구에서의 설치·호출은 이번 검증 범위에 포함하지 않습니다.

### 노트북 로그인 후 자동 시작

Quest_03와 Quest_04를 나란히 둔 상태에서 Quest_04 폴더에서 실행합니다. 다른 위치라면 `-ProjectPath`로 Quest_03 경로를 지정합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\google-sync-startup.ps1 -Mode Install
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\google-sync-startup.ps1 -Mode Status
```

이 PC에는 `CharlieScheduler-GoogleSync` 작업을 등록했습니다. 사용자 로그인과 매일 00·08·12·18시에 앱을 시작하고, 실행 중인 앱이 있으면 추가로 시작하지 않습니다. 놓친 예약 실행 허용, 배터리 실행 허용, 중복 작업 무시를 설정했습니다. Windows 시간대는 한국시간이어야 합니다. 등록 해제는 같은 명령의 `-Mode Uninstall`로 하며 데이터와 연결 정보는 보존합니다.

전원이 켜진 뒤 **사용자가 Windows에 로그인해야** 자동 시작합니다. 전원 꺼짐 상태에서 수집하거나 전원을 켜는 기능은 아닙니다. 로그인 즉시 실행을 요청하며 네트워크와 인증 상태에 따라 완료 시간은 달라집니다.

## 새 대화 호출

Codex에서 적용 대상 프로젝트를 열고 새 대화에 입력합니다.

> 놓친 구글 자료 가져와 줘.

명시 호출: `$google-sync-recovery 놓친 구글 자료 가져와 줘.`

실제 사용하는 명령은 다음 두 개입니다.

```text
node scripts/google-sync.mjs --status
node scripts/google-sync.mjs --recover --wait-seconds 120
```

CLI는 기존 DB를 읽기 전용으로 열어 상태만 확인합니다. 누락이 있고 앱이 꺼져 있으면 실행파일을 시작하고 앱이 보충 조회합니다. Google을 별도로 중복 호출하거나 사용자 인증을 우회하지 않습니다. 코드0+completed:true는 해당 시각까지 보충 완료, 코드2는 미완료/대기, 코드1은 실행 오류입니다.

## 동작·한계

| 상황 | 처리 |
|---|---|
| 08·12·18·24시 앱 실행 중 | 해당 시간 구간 조회 |
| 정시 놓침 → 앱 시작 | 즉시 누락 확인·보충 한 번 |
| 여러 시각 놓침 | 현재까지 한 번으로 합침 |
| 절전 복귀·인터넷 복구 | 실행 중15초 간격으로 재확인 |
| Gmail 실패·캘린더 성공 | 성공 기록 분리, Gmail만 제한 재시도 |
| 시간 구간을 이미 조회함 | 중복 보충하지 않음 |
| 노트북 종료 후 다시 켬 | Windows 로그인 트리거로 앱 시작 → 놓친 최신 구간 보충 |
| 로그인 후 앱을 닫음 | 다음 00·08·12·18시 예약에서 재시작. 즉시 보충은 CLI로 실행 가능 |

시간대는 Asia/Seoul,24시는 다음 날00시입니다. 서비스별 초기1회+30초/120초 후 재시도2회로 제한합니다. Gmail 최초 최근7일, 장기 누락은 최대366일이며 페이지·기간 한도 초과는 부분 완료로 표시합니다. 캘린더는 변경 커서를 사용합니다. Gmail 후보는 사람이 검토 후 저장합니다. 인증 만료 시 사용자 재연결이 필요합니다.

같은 시간 구간에서 네트워크 오류로 3회를 모두 실패하면 다음 정시 구간 또는 계정 재연결까지 자동 재시도하지 않습니다. 성공 여부는 서비스별 상태로 확인하며, 수집 중 오류를 완료로 표시하지 않습니다.

## 실제 결과

2026-11-03 18:20경 새 실행파일을 시작했습니다. 18시 구간을 보충하면서 Gmail 새 메일21개를 읽어 검토 후보200개를 만들었고, 캘린더 조회도 성공했습니다(새 변경0개). 후보는 확정 저장하지 않았습니다. 자동 테스트는42개씩2회, 총84개 통과했습니다. 새 대화에서 한 문장 호출로 자동 선택·실제 상태 조회·중복 보충 방지를 확인했습니다. 환경별 저장소 경로·권한 문제를 수정한 과정과 실제 결과는 VALIDATION.md에 구분해 기록했습니다.

## 평가 기준 대응

| 기준 | 배점 | 근거 |
|---|---:|---|
| 실제 반복 작업 | 30 | 정기 Gmail·캘린더 조회와 누락 보충 |
| 호출 시점 명확 | 30 | description에 누락 조회·상태 점검 조건 명시 |
| 만든 이유 | 20 | 불편 → 해결과 앱/스킬의 역할 구분 |
| 새 대화 재사용 | 20 | 설치 후 한 문장 호출 결과를 VALIDATION.md에 기록 |

과제 D-7 · 마감2026-11-09 23:59(한국시간). 안내 출처: 제공된 노드06 PDF18~19쪽. 비밀번호·키·토큰·쿠키·개인 DB·메일 원문·강의 PDF 원본은 제출 자료에 포함하지 않습니다.

사용자가 지정한 이번 제출 준비 시한은 **2026-11-03 21:25 KST**, 최종 로컬·GitHub 대조 예약은 **같은 날 21:20 KST**입니다. 강의의 공식 마감과 구분합니다. 제출창에는 위 Quest_04 GitHub 링크를 넣습니다.
