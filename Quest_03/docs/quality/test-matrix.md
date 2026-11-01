# 기능 검증 계획 · 현재 미실행

| ID | 시나리오 | 성공 기준 | 위치 |
|---|---|---|---|
| T01 | Todo CRUD 후 서버 종료·재시작 | 데이터·완료 상태 동일 | adapter-contract, evidence/local |
| T02 | A 사용자로 B Todo·일정 CRUD | read/update/delete 거부, 변경 없음 | security, evidence/security |
| T03 | 고객 예약 요청 | pending, 점유 없음, 문구 정확 | e2e |
| T04 | 같은 슬롯 2건 동시 승인 | confirmed 1개·event 1개, 나머지 충돌 | integration |
| T05 | 승인과 개인 일정 생성 동시 실행 | 겹치는 active 점유 없음 | integration |
| T06 | 같은 승인 키 3회 재전송 | 같은 결과, event 1개 | adapter-contract |
| T07 | 승인 실패 중간 오류 | 요청·event·감사 기록 모두 rollback | integration |
| T08 | 만료 정리 지연 후 승인 | 서버가 만료 거부 | unit, integration |
| T09 | 10~11시와 11~12시 | 버퍼 0 인접 허용, 버퍼 있으면 거부 | unit |
| T10 | DST 누락·중복·종일 일정 | 정책대로 UTC 변환, 슬롯 중복 설명 | unit |
| T11 | 공개 프로필·슬롯·상태 응답 | 개인 제목·메모·연락처 없음 | security |
| T12 | Supabase RLS 모든 CRUD | 사용자 JWT와 익명으로 실제 거부 확인 | security, evidence/cloud |
| T13 | SQLite→Supabase 변경 | 같은 기능 계약·시각·소유자 매핑 | adapter-contract |
| T14 | 모바일 키보드만 예약 | 초점 이동·라벨·오류 안내·완료 가능 | accessibility |
| T15 | WebGL 실패·reduced motion | 2D로 모든 일정 작업 가능 | accessibility |
| T16 | 고객 경로 첫 로딩 | Three/R3F chunk 요청 없음 | performance |
| T17 | 백업 복원 | 행 수·관계·완료 상태 일치 | integration |
| T18 | 새 요청 동일 키 재전송 | 중복 row 없음, 본인 결과만 반환 | integration, security |
| T19 | 고객 취소와 소유자 승인 경쟁 | 허용된 한 최종 상태·점유 일치 | integration |
| T20 | 공개 규칙 변경과 승인 경쟁 | 같은 잠금, 최종 규칙 위반 확정 없음 | integration |

구조 검증은 위 기능 테스트와 별개입니다. 현재 실행된 검사는 `docs/quality/scaffold-check.md`에만 기록합니다.
