# 로컬 스키마 변경 이력

경로: `database/sqlite/migrations`

**책임**: 번호순 SQL, FK·CHECK·UNIQUE·인덱스.

**연결 규칙**: 적용된 파일 수정 대신 새 migration 추가.

**금지**: Supabase SQL을 SQLite에 그대로 사용.

**구현 시 배치할 파일**: 0001_initial.sql (구현 단계). 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

0001_initial.sql: owners·entities·audit_events·idempotency와 user_version migration.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.

## 0.2 구현 상태

0002_auth_and_inputs.sql: passwords/private_config/input_proposals 추가. 적용된 0001을 덮어쓰지 않으며 v1→v2 데이터 보존 테스트 통과.

0003_projects.sql: 소유자별 프로젝트 테이블. Todo 날짜·프로젝트 연결은 기존 JSON 데이터에 선택 필드로 보존하며 기존 DB 행을 재작성하지 않습니다.
