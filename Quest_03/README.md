# Quest_03 · Charlie’s Scheduler

직접 입력·문서/이미지 첨부·Google Gmail/캘린더로 일정·할 일·프로젝트를 관리합니다.

## 방문자 바로 실행 · 실시간 읽기 전용

**[Charlie’s Scheduler 바로 열기](https://charlie-schedule.cherrysocute9.chatgpt.site/viewer.html)**

![공개 열람 비밀번호: Quest03-View-2026! 실제 일정·할 일·프로젝트 전체를 실시간 읽기 전용으로 공개합니다. 개인 비밀번호·키·토큰은 공개하지 않습니다.](./assets/public-viewer-notice.svg)

비밀번호 복사: `Quest03-View-2026!`

PC 앱의 실제 일정·할 일·프로젝트 전체를 공개합니다. 방문자는 내용을 볼 수 있지만 입력·수정·삭제는 화면과 서버에서 차단됩니다. Gmail 원문·메일 계정·연결 설정·개인 비밀번호·키·토큰·DB는 공개하지 않습니다. GitHub에는 실제 자료를 저장하지 않습니다.

외부 화면도 로컬과 같은 글꼴·레이아웃·달력·할 일·프로젝트 표시 코드를 사용합니다. 입력·수정·삭제 버튼과 비공개 계정 설정은 외부에서 제공하지 않습니다.

**고정 스냅샷이 아닙니다.** PC 변경 사항을 약 5초 간격으로 확인합니다. PC 앱이 켜져 있어야 하며 연결이 끊기면 열람을 중단합니다. 제출 후 수정한 자료도 반영됩니다.

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

Google 최초 연결은 PC에서 지정 계정 charlie.sungjin@gmail.com으로 진행합니다. 개인 편집 화면과 공개 열람 화면의 비밀번호·세션은 서로 다릅니다. 자료와 연결 정보는 `%LOCALAPPDATA%\ORBIT Scheduler\data`에 보존됩니다.

## 기능 요약

- 왼쪽: 대시보드·일정·할 일·프로젝트·설정. 상단 입력: 일정·할 일·프로젝트 각각 직접입력/문서첨부/이미지첨부, 문서함.
- 일정: 월 달력·목록, 10분 단위 시간, 대한민국 공휴일 이름·색상(확인 범위 2026~2027년).
- 할 일: 월요일~일요일 ISO 주차, 날짜순 정렬·완료·프로젝트 연결.
- 문서·이미지: 표 검토 후 선택 확정. PDF는 한 번에 최대 10쪽 범위 선택. OCR 결과를 확인하고 수정합니다.
- 자동 가져오기: Gmail·Google 캘린더를 한국시간 매일 **08:00·12:00·18:00·24:00(다음 날 00:00)**에 확인합니다. PC 앱 실행과 Google 권한이 필요하며, Gmail은 검토 후 저장합니다.
- Gmail: 기간별 분류·원문 연결·검토 후 저장. Google 캘린더: 기간별 선택 저장·중복/충돌 검토.
- 과제 Todo: 설정 → Todo 저장소에서 SQLite/Supabase 선택. 두 저장소는 독립적이며 자동 이관하지 않습니다.
- 제외: 휴대폰·카카오톡·ICS 가져오기, 고객 예약 접수, 문자·카카오톡 송수신.

## 개발·동기화·정리

`npm test` · `node scripts/repeat-tests.mjs 10` · `npm run check:structure`

`node scripts/sync-github.mjs --apply`는 GitHub와 로컬 소스를 동기화하고 충돌을 덮어쓰지 않습니다. `--watch`는 30초 간격입니다. exe·키·토큰·개인 DB·백업·빌드 결과는 제외합니다.

`npm run clean`은 임시 QA·중복 빌드·이전 Android 결과물을 지우고 실행 파일·소스·테스트·실제 데이터·동기화 저장소·제출 증거는 보존합니다. [정리 결과](./docs/quality/cleanup-report.json)

폴더 이름을 바꿔도 GitHub와 외부 URL은 바뀌지 않습니다. 앱·소스 감시를 종료한 뒤 변경하고 새 폴더에서 실행하세요. 기존 바로가기는 새 경로로 수정해야 합니다.
