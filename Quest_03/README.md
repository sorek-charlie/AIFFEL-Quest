# Quest_03 · 과제 D-4 — 내 Todo 앱과 PRD

**제출 링크:** https://github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_03  
**마감:** 2026-11-05 23:59 (한국 시간)

## Gmail 기간 분류

[이성진.exe](./이성진.exe) 실행 → **Gmail 기간 분류** → 기간 지정 → 조회·자동 분류 → 카드 검토. 일정(날짜·시간 약속) / 스케줄(할 일) / 프로젝트 / 기타 / 스팸 후보로 추천합니다. 가까운 미래 일정부터 먼 일정 순으로 위에서 아래로 표시하며, 날짜 없는 메일은 최근 수신순, 지난 일정은 뒤에 표시합니다. 기본 받은편지함 100통(최대500통), 화면당20통입니다. 조회상한에 도달하면 기간을 줄이세요.

기존 메일 추출 후보는 보존하며 새 기간 조회는 메일1통당 카드1개입니다. 분류 근거와 원문을 확인하고 구분을 바꿀 수 있습니다. **스팸함 이동 권한 추가 연결**에서 Gmail 수정 권한을 승인해야 실제 이동할 수 있습니다. 스팸 이동은 개별 카드에서 확인한 메일만 실행하며, 일정·스케줄·프로젝트는 확인 후 로컬에 저장합니다. 자동 추천은 규칙 기반이며 AI 모델의 판단으로 표시하지 않습니다.

## 먼저: Google 일정 가져오기

1. 이 폴더의 [구글일정가져오기.exe](./구글일정가져오기.exe)를 실행합니다. exe는 로컬 전용이며 GitHub에는 올리지 않습니다.
2. PC 앱 로그인 후 **처음 연결하는 방법 · OAuth 등록**을 펼칩니다. Google Calendar API와 데스크톱 OAuth 클라이언트를 준비해 ID·시크릿을 로컬 입력칸에 저장합니다.
3. **Google 계정 연결** → **charlie.sungjin@gmail.com** 선택 → Calendar 읽기 권한 승인.
4. 시작일·종료일을 선택하고 **일정 미리보기** → 원하는 항목 체크 → **선택한 일정 저장**.

기본 캘린더(primary), 서울 시간, 종일/반복 일정 조회를 지원합니다. 최대 366일/1,000개를 조회하며 초과 시 기간을 줄입니다. 중복은 제외하고 충돌은 검토함에 남깁니다. 전용 실행에서는 주기적 자동 가져오기를 시작하지 않습니다. Google 원본은 변경하지 않습니다. 실제 계정의 Google OAuth 연결과 일정 4개 가져오기를 확인했습니다. 자동 테스트는 공급자 fixture로 별도 검증합니다.

[웹에서 전용 화면 열기](https://charlie-schedule.cherrysocute9.chatgpt.site/owner?view=google) — 최초 계정 연결은 PC 로컬 앱에서 진행합니다.

## 프로그램 실행 · 외부 URL · PRD

| 구분 | 링크 / 실행 | 설명 |
|---|---|---|
| 외부 앱 | [charlie_schedule 관리자 열기](https://charlie-schedule.cherrysocute9.chatgpt.site/owner?view=todo) | PC 앱 실행·중계 연결 후 로그인 → **과제 Todo · A/B** |
| 고객 예약 | [외부 고객 신청](https://charlie-schedule.cherrysocute9.chatgpt.site/booking) | 추가 기능이며 Supabase 검증을 대신하지 않음 |
| Windows 로컬 실행 | [이성진.exe](./이성진.exe) | 이 폴더의 exe를 실행. exe는 로컬 전용이므로 GitHub에는 없음 |
| 소스 실행 | `npm start` | Node.js 24.22.1 이상. 콘솔에 출력된 로컬 주소 열기 |
| PRD 한 장 | [PRD.md](./PRD.md) | 과제 제출용 기능·조건·검증 계획 |
| PRD PDF | [PRD.pdf](./PRD.pdf) | 동일 내용의 A4 한 장 PDF |
| 실제 검증 기록 | [과제 검증 결과](./docs/assignment/verification.md) | 실행한 결과와 미실행 항목 구분 |
| 작동 화면 | [로컬 재시작 전](./Output/submission/todo-local-before-restart.png) · [재시작 후](./Output/submission/todo-local-after-restart.png) | 고객 정보 없는 가상 Todo로 촬영 |

브라우저의 링크는 웹 앱을 엽니다. GitHub에서 Windows 프로그램을 직접 실행할 수는 없습니다. 로컬 exe는 별도 설치 없이 실행되며 데이터는 `%LOCALAPPDATA%\ORBIT Scheduler\data`에 저장됩니다. 외부 관리자는 PC가 켜져 있어야 동작합니다.

## 평가 기준과 현재 결과

| 평가 | 배점 | 구현·검증 상태 |
|---|---:|---|
| PRD 한 장 | 30 | PRD.md 및 한 장 PDF 작성·렌더링 확인 |
| 데이터가 남는 Todo 앱 | 40 | 로컬 추가·조회·수정·완료·삭제 및 재시작 보존 테스트 통과. 작동 화면 첨부 |
| 로컬·Supabase·RLS | 30 | Supabase 실제 연결·CRUD·재시작 보존·익명/A/B RLS 7항목 통과. 전후 화면 첨부 |

**클라우드 전환 기록 한 줄:** 2026-11-01 — SQLite 검증 후 새 Supabase 프로젝트에 사용자 JWT로 전환하여 CRUD·완료·삭제 및 앱 프로세스 재시작/재로그인 뒤 상태 보존 확인(20:51 KST).  
**RLS 확인 기록 한 줄:** 2026-11-01 — 실제 사용자 A/B JWT와 익명으로 검사하여 익명 접근, B의 A 데이터 조회·수정·삭제, 소유자 위조 INSERT/UPDATE를 모두 차단하고 원본 유지 확인(20:49 KST).

![Supabase 재시작 후 보존·RLS 통과](./Output/submission/todo-supabase-after-restart.png)

[Supabase 재시작 전](./Output/submission/todo-supabase-before-restart.png) · [재시작 후](./Output/submission/todo-supabase-after-restart.png)

## 길 A → 길 B 실행 순서

1. 앱 로그인 → **과제 Todo · A/B** → 길 A(SQLite)에서 할 일 추가·수정·완료·삭제.
2. **보존 확인 항목 만들기** → PC 앱 종료·재실행 → 같은 화면에서 **재시작 보존 검증**. 새로고침만 하면 통과하지 않음.
3. [Supabase Dashboard](https://supabase.com/dashboard) 로그인 → New project로 테스트 프로젝트 생성.
4. SQL Editor에서 [0001_todo_rls.sql](./database/supabase/migrations/0001_todo_rls.sql)을 한 번 실행. Authentication → Users에서 확인 완료된 서로 다른 사용자 A/B 준비.
5. 앱에 Project URL과 **Publishable 또는 anon 키** 입력 → 길 B로 전환 → A 로그인. 키는 암호화 로컬 DB에만 저장하며 Git에서 제외. service_role/secret 키는 거부.
6. 길 B에서 CRUD·완료·삭제 및 종료·재실행·재로그인 후 보존을 확인. B 계정으로 **RLS 실제 검증** 실행.
7. 성공 화면과 전환·RLS 기록을 제출. 현재 검증용 A/B 계정은 암호화 로컬 저장되어 **검증용 사용자 A로 로그인**, **저장된 검증용 B로 RLS 검사** 버튼으로 재현 가능. 본인 계정 로그인도 지원.

저장소 전환은 저장 대상 선택입니다. 기존 로컬 자료를 자동 이관하지 않으며 두 저장소의 자료는 독립적입니다. 같은 Todo 기능을 두 저장소에서 각각 검증했습니다. 일정·예약·Gmail의 원본 DB는 기존 SQLite이며 이번 Supabase 전환 범위는 **과제 Todo**입니다.

## PRD 요약

- **목표:** 앱을 껐다 켜도 남는 개인 Todo. 길 A 완료 후 길 B로 저장 대상 전환.
- **기능:** 1~160자 제목, 추가·조회·수정·완료·삭제, 저장소 표시·선택, Supabase 로그인, 보존·RLS 확인.
- **데이터:** id, 소유자, 제목, 완료 여부, 버전, 생성 시각. 오래된 수정·삭제는 버전 검사로 거부.
- **구조:** 브라우저 → 인증된 Node API → SQLite 또는 Supabase REST. 저장소 선택은 bootstrap에서 결정.
- **보안:** 일반 CRUD는 사용자 JWT와 RLS 적용. anon 접근·타 사용자 접근·소유자 위조 금지. 관리자 키 사용 금지, 키·토큰·DB는 Git 제외.
- **완료 조건:** 각 저장소의 CRUD·재시작 보존 장면 + 두 계정 RLS 실제 결과 + 한 장 PRD.
- **검증:** 360px 모바일·키보드 조작과 자동 테스트. 실제 Supabase 재시작 보존과 익명/A/B RLS 7항목 검증 완료.
- **추가 기능:** 이성진 일정·프로젝트·예약 승인·Gmail 분류. 추가 기능의 배포 성공은 과제의 Supabase 요구사항과 별개.

## 소스 동기화

`node scripts/sync-github.mjs`로 변경 미리보기, `node scripts/sync-github.mjs --apply`로 반영, `node scripts/sync-github.mjs --watch`로 30초 간격 양방향 확인. 충돌 시 중단합니다. exe/APK/DB/키/토큰/환경파일/런타임·빌드는 제외합니다.

## Google 연결

지정 계정은 **charlie.sungjin@gmail.com**입니다. 입력·연동의 **Google 계정 등록 · 키 발급 절차**를 펼쳐 Desktop OAuth를 연결하세요. Gmail은 메일 확인 → 추출 → 일정·할 일·프로젝트 분류 → 검토 후 반영 순서이며, 반영 항목의 제목으로 원본 Gmail을 엽니다. 실제 OAuth 승인은 사용자가 진행해야 합니다. 카카오톡은 내보낸 TXT·Android 알림 경로이며 전체 수신함 직접 읽기는 지원하지 않습니다.
