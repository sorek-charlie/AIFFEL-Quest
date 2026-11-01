# 로컬 SQLite 어댑터

경로: `apps/api/src/infrastructure/persistence/sqlite`

**책임**: Repository 구현·명시적 쓰기 트랜잭션·파일 저장.

**연결 규칙**: 전체 쓰기 시 BEGIN IMMEDIATE; 외래키 활성화; 테스트로 검증.

**금지**: DB 파일을 public 폴더나 Git에 저장.

**구현 시 배치할 파일**: SqliteTaskRepository.ts, SqliteBookingCommands.ts. 이름은 예정안이며 README 외 소스의 존재를 의미하지 않습니다.

**완료 판단**: 이 모듈의 요구사항과 대응하는 `docs/quality/test-matrix.md`의 시나리오를 충족하고, 실제 실행 결과를 기록합니다.

현재 단계: 설계·폴더 구성. 기능 구현과 실행 검증은 아직 진행하지 않았습니다.

## 로컬 구현 상태 · 2026-10-29

index.mjs: migration, BEGIN IMMEDIATE, 저장소, 감사 기록, 암호화된 멱등 응답.
상단의 예정 파일·완료 판단은 설계 사양입니다. 실제 검증은 evidence/local/verification.md에 기록했습니다.
