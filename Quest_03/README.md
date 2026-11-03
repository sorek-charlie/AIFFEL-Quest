# Quest_03 · 이성진 개인 일정 관리

직접 입력·문서/이미지 첨부·Google Gmail/일정 가져오기를 사용하는 개인 일정·할 일·프로젝트 앱입니다.

## 과제 D-2 제출 안내

제출 링크: https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_03

[평가 기준별 결과·작동 화면](./docs/assignment/submission.md)을 먼저 확인하세요. PRD.md와 PRD.pdf는 한 장이며, 아래 실행 링크와 로컬·클라우드 증거 화면을 함께 제출합니다.

## 실행과 제출

| 항목 | 링크 / 방법 |
|---|---|
| Windows 실행 | [Charlie;s Scheduler.exe](./Charlie%3Bs%20Scheduler.exe) — 이 폴더 전용 실행 파일 |
| Google 일정 | Charlie;s Scheduler.exe 실행 후 **Google 일정 가져오기** 메뉴 선택 |
| 소스 실행 | `npm start` — Node.js 24.22.1 이상, 출력된 주소 열기 |
| 외부 개인 화면 | [charlie_schedule](https://charlie-schedule.cherrysocute9.chatgpt.site) — PC 앱 실행 필요 |
| PRD | [PRD.md](./PRD.md) · [PRD.pdf](./PRD.pdf) |
| 검증 기록 | [과제 검증 결과](./docs/assignment/verification.md) |
| 제출 | [GitHub Quest_03](https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_03) |

실행 파일은 GitHub에 올리지 않습니다. 데이터와 Google 연결 정보는 `%LOCALAPPDATA%\ORBIT Scheduler\data`에 유지됩니다. 외부 개인 화면은 PC 앱에 인증된 요청을 중계합니다.

## 사용하는 순서

1. Charlie;s Scheduler.exe 실행 → 비밀번호 로그인.
2. **입력**에서 일정·할 일·프로젝트 또는 텍스트를 직접 입력합니다.
3. **Google 일정 가져오기**에서 기간·미리보기·선택 저장을 진행합니다. 시간 입력은 10분 단위입니다.
4. **Gmail 기간 분류**에서 기간과 조회 상한을 정하고 메일별 카드를 검토합니다. 일정·스케줄(할 일)·프로젝트·기타·스팸 후보로 규칙 기반 추천합니다.
5. 가까운 미래 일정 → 먼 일정 순서이며 날짜 없는 메일은 최근 수신순, 지난 일정은 뒤에 표시합니다. 제목을 누르면 원본 Gmail이 열립니다. 확인한 카드만 저장합니다.

Gmail은 기본 100통·최대 500통, 화면당 20통입니다. 상한에 도달하면 기간을 줄이세요. 실제 스팸 이동은 **스팸함 이동 권한 추가 연결** 후 개별 확인해야 실행됩니다. 자동 추천만으로 저장·이동하지 않습니다.

## Google 등록

Google Cloud에서 Gmail API·Calendar API를 활성화하고 OAuth 데스크톱 앱 클라이언트를 만듭니다. 테스트 사용자에 **charlie.sungjin@gmail.com**을 추가한 뒤 PC 앱의 로컬 입력칸에 클라이언트 ID·시크릿을 저장하고 계정을 연결합니다. 키·토큰·DB는 Git에서 제외하며 비밀값을 채팅·README에 붙이지 않습니다.

## PRD 요약

- 목적: 직접 입력과 Google 가져오기를 한 곳에서 관리하고 재시작 후에도 데이터를 보존합니다.
- 기능: 일정·할 일·프로젝트 CRUD, 완료·진척률, Gmail 기간 분류·원문 연결, Google 일정 선택 저장.
- 저장: 개인 일정은 SQLite, 과제 Todo는 SQLite와 Supabase를 선택합니다. 자동 이관은 하지 않습니다.
- 보안: 비밀번호·소유자 경계·버전 검사·일정 충돌 검사·Google 지정 계정·암호화 설정·Todo RLS.
- 제외: Android 보조 앱, 카카오톡·휴대폰 일정·ICS·고객 예약 접수·확정, 문자·카카오톡 송수신.

## 과제 D-2 · 길 A → 길 B

**과제 Todo · A/B**에서 SQLite CRUD·완료·삭제 → 프로그램 종료·재실행 → 보존 확인 후 Supabase로 저장 대상을 전환합니다. 두 사용자로 타인 데이터 접근·소유자 위조 차단을 검사합니다. 제출 마감은 2026-11-05 23:59(한국 시간)입니다.

클라우드 전환 기록: 2026-11-01 — 실제 Supabase 사용자 JWT CRUD·완료·삭제 및 앱 프로세스 재시작/재로그인 후 보존 확인.

RLS 확인 기록: 2026-11-01 — 익명 접근, 사용자 B의 A 데이터 조회·수정·삭제, 소유자 위조 INSERT/UPDATE 등 7항목 차단 확인. 이번 범위 축소 이후 실제 클라우드 재검사는 별도로 실행하지 않았습니다.

[로컬 재시작 전](./Output/submission/todo-local-before-restart.png) · [후](./Output/submission/todo-local-after-restart.png) · [Supabase 재시작 전](./Output/submission/todo-supabase-before-restart.png) · [후](./Output/submission/todo-supabase-after-restart.png)

## 소스 동기화와 검증

`node scripts/sync-github.mjs --apply`로 GitHub와 로컬 소스를 동기화하며 `--watch`는 30초마다 확인합니다. 충돌은 덮어쓰지 않습니다. exe·키·토큰·DB·빌드 결과는 제외합니다.

`node scripts/check-structure.mjs`와 `npm test`를 실행합니다. 범위 축소의 최종 실행 결과는 아래와 검증 기록에 기록합니다.

2026-11-03 최종 검증: 자동 테스트 24개·구조 검사 통과, 데스크톱·360px 모바일·키보드 Enter 저장·공간 보기→2D 복귀 확인. 단독 EXE 실행 검사 exit 0, 외부 사이트 버전 12 배포 성공.


## Supabase 비밀번호를 잊은 경우
PC 앱을 켠 상태에서 Supabase Authentication → Users → 본인 사용자 → 재설정 메일을 새로 보냅니다. 가장 최근 메일의 링크가 http://localhost:3000/reset-password 를 열면 새 비밀번호를 두 번 입력하고 저장하세요. 주소를 직접 입력하면 인증 정보가 없어 변경할 수 없습니다. 기존 링크는 만료되거나 이미 사용됐을 수 있습니다. 완료 후 앱의 클라우드 로그인에 본인 이메일과 새 비밀번호를 입력합니다. 토큰은 브라우저 메모리에서만 사용하고 비밀번호는 Supabase에 직접 전송하며 로컬 DB·로그에 저장하지 않습니다.


PC 실행 주소는 http://127.0.0.1:18701 로 고정했습니다. 이전 버전의 임의 포트 탭은 닫고 새 실행 창에서 로그인하세요. 프로젝트 저장 후 실제 목록을 표시합니다.


## 메뉴·첨부·검색

왼쪽: 대시보드·일정·할 일·프로젝트·설정. 오른쪽: 입력(일정·할 일·프로젝트 직접 입력, 문서파일·이미지 첨부), 구글연동(Gmail·캘린더), 검색. 검색은 저장된 일정·할 일·프로젝트의 제목·내용·기간을 대상으로 합니다. Todo 저장소·잠금·검토함 설정은 설정 메뉴에 있습니다.

첨부: TXT/MD/CSV/JSON/DOCX/PDF/PNG/JPG/BMP, 로컬8MB·외부128KB. PDF는 전체 쪽수와 관계없이 한 번에 최대10쪽을 선택해 Windows OCR로 읽습니다. 11~20쪽처럼 범위를 바꿔 나머지를 첨부할 수 있습니다. HWP는PDF로 저장한 뒤 첨부하세요. Windows OCR 언어팩에 따라 인식률이 달라집니다. 원본은 임시파일에서 처리 후 삭제하고 후보만 저장합니다. 확인 전 일정으로 저장하지 않습니다.

입력 메뉴는 일정·할 일·프로젝트 세 종류입니다. 각 종류 안에서 직접 입력·문서파일 첨부·이미지 첨부를 선택합니다. 첨부 결과는 선택한 종류로 검토하며 날짜·기간을 확인하고 저장합니다.
