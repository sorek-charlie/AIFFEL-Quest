# ADR 0002 · SQLite에서 Supabase로

상태: 설계 채택 / 2026-10-29

결정: 하나의 repository 계약을 두 어댑터가 구현한다. SQLite SQL과 Postgres SQL은 각각 관리한다.
로컬은 개발 전용 사용자와 loopback API를 사용한다. 운영에서 local-dev 인증이 켜지면 부팅 실패한다.
클라우드는 백엔드가 Supabase Auth 세션을 관리하고, 일반 DB 작업은 해당 사용자 JWT를 전달해 RLS가 적용되게 한다.
여러 HTTP 요청을 묶어 트랜잭션인 척하지 않는다. 승인 등 다중 변경은 한 DB RPC로 실행한다.
고객 공개 쓰기는 서버의 제한된 함수로만 수행한다. 관리자 권한 경로는 일반 사용자 어댑터와 코드상 분리한다.
