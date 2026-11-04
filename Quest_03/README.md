# Quest_03 · Charlie’s Scheduler

직접 입력·문서/이미지 첨부·Google Gmail/캘린더로 일정·할 일·프로젝트를 관리합니다.

## 방문자 바로 실행 · 실시간 읽기 전용

**[Charlie’s Scheduler 바로 열기](https://charlie-schedule.cherrysocute9.chatgpt.site/viewer.html)**

![평가자 바로 열람 · 열람 비밀번호 입력 비활성화](./assets/public-viewer-notice.svg)

**Local PC에서 마지막으로 업데이트 된 자료들이 반영되어 있습니다.**

평가자가 링크를 열면 바로 내용을 볼 수 있도록 **열람 비밀번호 입력 기능을 비활성화했습니다.** 마지막으로 반영된 일정·할 일·프로젝트 전체를 외부 사이트에 보관하므로 PC 앱이 꺼져 있어도 조회할 수 있습니다. PC 앱이 실행되어 연결되면 변경 자료를 자동 반영합니다.

외부 화면은 공통 표시 코드를 사용하며(2026-11-05 로컬 UI 개정은 이번에 GitHub 소스에 반영하고 외부 사이트에는 별도로 재배포하지 않음) 입력·수정·삭제는 화면과 서버에서 차단합니다. Gmail 원문·계정 설정·개인 비밀번호·키·토큰·DB 파일은 공개하지 않습니다. GitHub에는 소스와 실행 링크를 두고, 공개 자료 전체는 연결된 사이트에서 제공합니다.

## 과제 D-2 · 제출 파일

제출: **[GitHub Quest_03](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_03)**  
마감: 2026-11-05 23:59 KST

| 평가 기준 | 실제 제출 파일과 증거 |
|---|---|
| PRD 한 장 · 30점 | [PRD.md](./PRD.md) · [PRD.pdf 직접 열기](https://raw.githubusercontent.com/sorek-charlie/AIFFEL-Quest/main/Quest_03/PRD.pdf) — PDF 1쪽 |
| 데이터가 남는 Todo 앱 · 40점 | 추가·조회·수정·완료·삭제·재시작 보존. [로컬 종료 전](./Output/submission/todo-local-before-restart.png) · [재실행 후](./Output/submission/todo-local-after-restart.png) |
| 로컬·클라우드·보안 · 30점 | [Supabase 종료 전](./Output/submission/todo-supabase-before-restart.png) · [재실행 후·RLS](./Output/submission/todo-supabase-after-restart.png) · [전환·RLS 검증 기록](./docs/assignment/verification.md) |

클라우드 전환: **2026-11-01** — SQLite 확인 후 Supabase 사용자 JWT CRUD·완료·삭제·앱 재시작 후 보존 확인.

RLS 확인: **2026-11-01** — 익명 접근, B의 A 자료 조회·수정·삭제, 소유자 위조 등 7항목 차단.

위 클라우드 성공 증거는 11월 1일 기록입니다. 최신 개인 계정의 클라우드 재시작·RLS 재검증을 완료했다고 표시하지 않습니다. 공개 읽기 전용 화면은 실제 저장 검증 증거를 대신하지 않습니다.

[제출 안내·작동 화면](./docs/assignment/submission.md) · [QA 10회 결과](./docs/quality/qa-10-runs.json) · [실제 외부 사이트 QA](./docs/quality/public-viewer-qa.json)

## PC 실행

| 용도 | 실행 방법 |
|---|---|
| 로컬 Windows 실행 | [Charlie's Scheduler.exe](./Charlie%27s%20Scheduler.exe) — 이 폴더 전용. GitHub에는 exe를 올리지 않습니다. |
| 실행 중인 PC 화면 | [http://127.0.0.1:18701](http://127.0.0.1:18701/) |
| 소스 실행 | Node.js 24.22.1 이상에서 `npm start` |
| 실행 파일 다시 만들기 | `npm run build:exe` — 단독 실행 파일 하나 생성 |

Google 최초 연결은 PC에서 지정 계정 charlie.sungjin@gmail.com으로 진행합니다. 개인 편집 화면은 인증을 유지하며 공개 열람 화면은 비밀번호 없이 조회만 제공합니다. 자료와 연결 정보는 `%LOCALAPPDATA%\ORBIT Scheduler\data`에 보존됩니다.

## 기능 요약

- 왼쪽: 대시보드·일정·할 일·프로젝트·설정. 상단 입력: 일정·할 일·프로젝트 각각 직접입력/문서첨부/이미지첨부, 문서함.
- 일정: 월 달력·목록, 10분 단위 시간, 대한민국 공휴일 이름·색상(확인 범위 2026~2027년).
- 할 일: 월요일~일요일 ISO 주차, 날짜순 정렬·완료·프로젝트 연결.
- 문서·이미지: 표 검토 후 선택 확정. PDF는 한 번에 최대 10쪽 범위 선택. OCR 결과를 확인하고 수정합니다.
- 자동 가져오기: Gmail·Google 캘린더를 한국시간 매일 **08:00·12:00·18:00·24:00(다음 날 00:00)**에 확인합니다. 앱 시작 즉시 놓친 조회를 한 번 보충합니다. 실행 중 15초마다 누락을 확인해 절전 복귀·인터넷 복구에도 대응합니다. PC 앱 실행과 Google 권한이 필요하며, Gmail은 검토 후 저장합니다.
- Gmail: 기간별 분류·원문 연결·검토 후 저장. Google 캘린더: 기간별 선택 저장·중복/충돌 검토.
- 과제 Todo: 설정 → Todo 저장소에서 SQLite/Supabase 선택. 두 저장소는 독립적이며 자동 이관하지 않습니다.
- 제외: 휴대폰·카카오톡·ICS 가져오기, 고객 예약 접수, 문자·카카오톡 송수신.

## 개발·동기화·정리

`npm test` · `node scripts/repeat-tests.mjs 10` · `npm run check:structure`

`node scripts/sync-github.mjs --apply`는 GitHub와 로컬 소스를 동기화하고 충돌을 덮어쓰지 않습니다. `--watch`는 30초 간격입니다. exe·키·토큰·개인 DB·백업·빌드 결과는 제외합니다.

`npm run clean`은 임시 QA·중복 빌드·이전 Android 결과물을 지우고 실행 파일·소스·테스트·실제 데이터·동기화 저장소·제출 증거는 보존합니다. [정리 결과](./docs/quality/cleanup-report.json)

폴더 이름을 바꿔도 GitHub와 외부 URL은 바뀌지 않습니다. 앱·소스 감시를 종료한 뒤 변경하고 새 폴더에서 실행하세요. 기존 바로가기는 새 경로로 수정해야 합니다.

공개 열람에서도 입력·구글연동·검색 버튼과 메뉴를 열 수 있습니다. 일정·할 일·프로젝트 직접입력, 문서/이미지 첨부, Gmail·캘린더 화면은 미리보기만 제공하고 데이터 입력·첨부·저장·연결 변경은 비활성화합니다. 검색과 날짜 이동은 사용 가능합니다.

Google 조회 상태: `node scripts/google-sync.mjs --status`. 놓친 조회 보충·앱 시작: `node scripts/google-sync.mjs --recover --wait-seconds 120`. 서비스별 성공 시각·대상 시간 구간·재시도 결과만 표시하며 비밀값은 출력하지 않습니다. 초기1회+30초/120초 후 재시도2회, 구간당 최대3회입니다. 노트북 자동 시작은 옆 Quest_04의 scripts/google-sync-startup.ps1 -Mode Install로 등록합니다. 사용자 Windows 로그인과 매일00·08·12·18시에 앱을 시작하고 이미 실행 중이면 추가 실행하지 않습니다. 이 PC에는 등록을 완료했습니다. 자세한 설치·해제 방법과 실제 검증은 ../Quest_04/README.md 및 VALIDATION.md에 있습니다.

## 로컬 UI 개정 · 2026-11-05
사용자 요청으로 GitHub 업데이트를 중단했다. `.github-updates-blocked`와 동기화 스크립트 검사, 제출 mirror의 push 차단으로 로컬 변경만 허용한다. 외부 사이트는 이번 UI 변경을 배포하지 않았다.
`korean schedule`의 13개 원본 달력(2026-12~2027-12)에서 기념일·절기 175건, 세무 참고 일정 123건을 읽어 달력과 월별 참고 목록에 표시한다. 개인 DB에 중복 일정을 생성하지 않는다. 세무 일정은 대시보드 일정 아래 가로 영역에 표시한다. 원본이 없는 2026년 11월 등에 2027년 자료를 옮겨 표시하지 않는다.
달력:전체 일정 폭은 데스크톱에서 약 2.15:1이며 대시보드 전체 폭을 확장했다. 어제·내일 각 항목은 작은 글씨 2줄로 제한하고 전체 내용은 툴팁으로 제공한다. 주간 할 일은 간격을 줄였다.
검증: 격리된 예시 자료로 1280×720 주간 할 일 5개가 화면 내에 들어옴, 모바일390px 가로 넘침 없음, Enter 키로 일정/한국 스케줄 전환 확인. 전체 테스트44/44 통과. 최초 검사에서 소켓 권한 오류4건과 완료 표시 회귀1건이 있었으며 권한 적용 및 표시 수정 후 통과했다.


## 최종 일회 반영 · 2026-11-05
사용자의 명시적 요청으로 현재 로컬 소스와 검증 기록을 GitHub에 이번 한 번 반영한다. 이후 자동·수동 업데이트는 다시 차단한다. `.github-updates-blocked`, 동기화 스크립트 시작 검사, 제출 mirror의 push 주소 비활성화 및 pre-push 거부를 유지한다.
전체 자동 검사44개 ×3회 =132개 모두 통과([결과](./docs/quality/qa-3-runs-20261105.json)). 단일 실행 잠금 추가 후 실행파일을 두 번 열어도 서버1개 유지 및 두 번째 프로세스 종료를 실제 확인했다. [최신 로컬 화면 검증](./docs/quality/korean-calendar-local.md).
이번 소스에는 한국 달력 참고298건, 내부 스크롤 없는 세무 전체 표시, 날짜 이동 버튼, 작은 일정 목록·프로젝트 한 줄 요약을 포함한다. 실행파일은 로컬 폴더에만 보관하며 개인 DB·인증 정보·원본 사진은 GitHub에 올리지 않는다.
