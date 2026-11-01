# 구현 순서와 단계별 통과 조건

| 단계 | 구현 | 다음 단계 진입 조건 |
|---|---|---|
| 0 · 지금 | 폴더·PRD·설계·작업 지침 | 구조·문서 링크·공개 경계 검사 통과 |
| 1 · 길 A | Node API + SQLite + Todo DOM 화면 | CRUD, 앱 종료/재실행 후 보존, SQL 입력 안전성 |
| 2 · 일정 | 2D 주간 일정·공개 규칙·시간대 | 시간 경계·버퍼·휴무·DST 테스트 |
| 3 · 길 B | Supabase Auth·DB 어댑터·RLS | 두 계정 격리, DB 공통 계약, 전환·복구 증거 |
| 4 · 고객 예약 | 공유 URL·모바일 신청·소유자 결정 | 대기/확정 구분, 경쟁 승인 단 1건 성공, 재시도 안전 |
| 5 · 3D | R3F 주간 일정·선택·DOM 상세·2D 대체 | 2D 동등성, reduced motion, 고객 번들 분리 |
| 6 · 제출·배포 준비 | 시연·기록·Render 안내 | 과제 증거 3종·PRD, 선택 배포 smoke test |

첨부 과제의 핵심은 Todo 영속성과 로컬·클라우드 권한입니다. 3D 장식 때문에 1·3단계 제출 요건이 밀리지 않도록 합니다.
기간은 구현 난도와 실제 검증 결과에 따라 정하며, 현재 문서는 완료 일정의 보장이 아닙니다.

## 첫 구현 작업 묶음

- React/Vite/TypeScript, Node API 후보 Fastify의 호환 버전을 확인하고 lockfile 생성.
- domain task 규칙 → SQLite migration → repository → application → HTTP → Todo UI 순서.
- 로컬 인증은 개발용 단일 사용자만 허용하고 loopback에서만 실행.
- 실패 입력·타 사용자·재시작 검증 후 evidence/local 기록.

## 후속 확장

메일/SMS, Google·Outlook 동기화, 반복 일정의 복잡한 편집, 팀 일정, 결제는 별도 ADR과 테스트 이후 도입합니다.
