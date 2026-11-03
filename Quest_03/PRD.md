# PRD · Charlie’s Scheduler

과제 D-2 | 개정 2026-11-03 | 마감 2026-11-05 23:59 KST

## 1. 목적과 범위
직접 입력·문서/이미지 첨부·Google Gmail/캘린더로 일정·할 일·프로젝트를 관리한다. 휴대폰·카카오톡·고객 예약·메시지 송수신은 제외한다.

## 2. 기능과 수용 조건
- 일정·할 일·프로젝트 CRUD, 완료·진척률·날짜별 내용. 시간은 10분 단위, 할 일은 월요일~일요일 ISO 주차로 표시한다.
- 문서·이미지 내용은 표에서 수정·선택·확정 후 반영한다. OCR에 없는 시간·장소·참석자를 만들지 않는다.
- 자동 가져오기: 한국시간 매일 08:00·12:00·18:00·24:00(다음 날 00:00), PC 앱 실행 중에만 확인한다.
- Gmail은 기간별 후보 분류·원문 연결·검토 후 저장, Google 일정은 기간별 선택 저장·중복/충돌 검토를 제공한다.
- 과제 Todo: 길 A(SQLite)를 검증한 뒤 길 B(Supabase)로 전환한다. 두 저장소에서 추가·조회·수정·완료·삭제와 앱 종료·재실행 후 보존을 확인한다. 자료 자동 이관은 하지 않는다.
- GitHub 방문자는 공개 열람 비밀번호로 실행 중인 PC의 실제 일정·할 일·프로젝트 전체를 실시간으로 본다. 일정·할 일·프로젝트 탐색만 제공하고 데이터 변경 API는 403으로 거부한다. Gmail 원문·계정·인증 정보는 공개하지 않는다.

## 3. 구조와 보안
개인 앱: 브라우저 → 비밀번호 인증 Node API → SQLite 또는 Todo용 Supabase REST. 충돌·버전 검사를 서버가 처리한다. Supabase CRUD는 사용자 JWT와 RLS를 사용하고 관리자 키를 거부한다. Google 지정 계정은 charlie.sungjin@gmail.com이다. 키·토큰·개인 DB는 Git에서 제외한다. 공개 열람은 별도 서명 쿠키를 사용하며 개인 API에 접근할 수 없다.

## 4. 평가 기준과 실제 제출 파일
- PRD 한 장 · 30점: 이 PRD.md와 PRD.pdf에 목적·기능·조건·보안·완료 기준을 담는다. PDF는 1쪽이다.
- 데이터가 남는 Todo 앱 · 40점: CRUD·완료·삭제·재시작 보존 테스트와 작동 화면을 제출한다. Output/submission/todo-local-before-restart.png 및 todo-local-after-restart.png.
- 로컬·클라우드·보안 · 30점: Supabase 재시작 전후 화면(todo-supabase-before-restart.png, todo-supabase-after-restart.png)과 전환·RLS 기록을 docs/assignment/verification.md에 둔다.

## 5. 검증 기록과 완료 기준
클라우드 전환: 2026-11-01 — 실제 Supabase 사용자 JWT CRUD·완료·삭제·앱 재시작 후 보존 확인.
RLS 확인: 2026-11-01 — 익명 접근, B의 A 자료 조회·수정·삭제 및 소유자 위조 등 7항목 차단 확인.
2026-11-03 공개 열람의 서명 쿠키·변경 차단·개인 API 격리 테스트를 포함해 자동 테스트 35개 통과. 최신 개인 계정의 클라우드 재시작/RLS 재검증은 완료로 기록하지 않는다. 공개 읽기 전용 화면은 실제 클라우드 저장 검증 증거를 대신하지 않는다.

## 6. 제출과 실행
README.md에 공개 실행 URL·열람 비밀번호·PRD PDF 직접 링크를 둔다. docs/assignment/submission.md에 평가 기준별 증거를 연결한다. 제출 주소: github.com/sorek-charlie/AIFFEL-Quest/tree/main/Quest_03. 실행 파일 Charlie;s Scheduler.exe는 로컬 폴더에만 둔다.
