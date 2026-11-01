# 과제 D-4 실제 검증 기록 · 2026-11-01

## 로컬 SQLite

- Todo 추가·조회·수정·완료·삭제 및 앱 인스턴스 재생성 후 보존: 자동 테스트 통과.
- 실제 QA Node 프로세스 종료·재실행 후 동일 SQLite DB의 완료 Todo와 보존 체크포인트 재확인. 새로고침만으로는 통과하지 않도록 instanceId 비교.
- 화면: ../../Output/submission/todo-local-before-restart.png 및 todo-local-after-restart.png.

## 클라우드 전환 한 줄

2026-11-01 20:51 KST — SQLite 검증 후 새 Supabase charlie-schedule-quest03(enbkcngsknoilpcutnng)에 migration을 적용하고 길 B로 전환. 실제 사용자 JWT로 Todo 생성·완료·삭제 후 Node 앱 프로세스를 종료·재시작하고 재로그인하여 완료 상태 유지 및 삭제 항목 미복원을 확인함.

## RLS 확인 한 줄

2026-11-01 20:49 KST — 가상 사용자 A/B의 실제 Supabase Auth JWT와 익명으로 검사. 익명 접근, B의 A 데이터 SELECT/UPDATE/DELETE, A 소유자로 위조한 INSERT, owner_id 변경이 모두 차단되며 원본 유지 확인. 7개 검사 passed=true.

## 세부 결과

- anonymous/select/update/delete/insert/ownerChange/unchanged: 모두 true.
- 실제 Supabase 보존 확인 시각: 2026-11-01T11:51:15.572Z.
- 보존 체크포인트: 5c5bf8f5-903f-468d-8e8b-258d349ff074. 실제 고객 데이터가 아닌 제출용 가상 Todo만 사용.
- migration: database/supabase/migrations/0001_todo_rls.sql. Dashboard SQL Editor 실행 결과 Success. No rows returned.
- service_role/관리자 키로 일반 CRUD를 수행하지 않음. Publishable 키 + A/B JWT로 실행.
- 전체 자동 테스트 22/22 통과. 별도로 위 실제 클라우드 검증 수행.
- 360px 화면 가로 넘침 없음(문서폭345px), Todo 입력→Tab→추가 버튼 포커스 확인.
- PRD.pdf A4 1쪽 생성·PNG 렌더 시각 검사 완료.

## 범위

과제 Todo의 저장소만 전환한다. 기존 일정·예약·Gmail 저장은 SQLite이며 외부 사이트는 PC 중계를 사용한다. 기존 로컬 Todo를 자동 이관하지 않고 각 저장소에서 독립적으로 검증했다. 실물 모바일 기기 검증은 실행 안 함(Chromium 360px 검증).

## 제출 화면

- [로컬 재시작 전](../../Output/submission/todo-local-before-restart.png)
- [로컬 재시작 후](../../Output/submission/todo-local-after-restart.png)
- [Supabase 재시작 전](../../Output/submission/todo-supabase-before-restart.png)
- [Supabase 재시작 후·RLS](../../Output/submission/todo-supabase-after-restart.png)

키·토큰·비밀번호·DB·백업은 Git 및 제출 자료에 포함하지 않는다. 합성 사용자 계정 비밀번호와 연결 설정은 PC의 Git 제외 암호화 DB에만 보관한다.

최종 과제 UI 외부 배포 소스: 1e42344808b4cb5746033b0e7d9852843176e24f. 로컬 단독 EXE smoke-test exit 0.
