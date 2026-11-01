# 저장소 구조

- sqlite/migrations: 로컬 SQLite DDL 실행 이력.
- supabase/migrations: 클라우드 PostgreSQL DDL·RLS·함수 실행 이력.
- supabase/policies: 소유자 정책의 검증 사양.
- supabase/functions: 원자적 승인 등 함수 계약.
- seeds: 테스트 시나리오·가상 데이터.

현재 실행 SQL은 없습니다. schema.md는 설계안입니다.
기존 운영 DB에 적용할 변경을 만들어 놓은 것이 아니며 구현 단계의 migration 검토·통합 테스트가 필요합니다.
