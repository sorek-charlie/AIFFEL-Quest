# 저장소 구조

- sqlite/migrations: 로컬 SQLite DDL 실행 이력.
- supabase/migrations: 클라우드 PostgreSQL DDL·RLS·함수 실행 이력.
- supabase/policies: 소유자 정책의 검증 사양.
- supabase/functions: 원자적 승인 등 함수 계약.
- seeds: 테스트 시나리오·가상 데이터.

SQLite 및 과제 Todo용 Supabase migration을 제공합니다. 전체 일정/예약 Supabase schema.md는 설계안입니다.
기존 운영 DB에 적용할 변경을 만들어 놓은 것이 아니며 구현 단계의 migration 검토·통합 테스트가 필요합니다.

## 과제 D-4 · 2026-11-01

SQLite migration 0001~0003은 실행 중입니다. Supabase 0001_todo_rls.sql은 신규 테스트 프로젝트용 실행 SQL이며 새 테스트 프로젝트에 실제 적용 및 RLS 검증 완료했습니다.
